/* src/limiter.ts */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DocumentReference, CollectionReference } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Operation = "read" | "write";

export interface GlobalLimits {
  read?: number;
  write?: number;
  windowMs?: number; // default 60 000 ms
}

export interface CollectionLimits {
  [collectionPath: string]: Partial<Record<Operation, number>>;
}

export interface LimitConfig {
  global?: GlobalLimits;
  perCollection?: CollectionLimits;
  behavior?: "throw" | "queue" | "log";
  onLimitExceeded?: (d: {
    op: Operation;
    path: string;
    ts: number;
    count: number;
    limit: number;
  }) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = () => Date.now();
const pathFromRef = (ref: any): string => ref?.path ?? "_unknown_";
const DEFAULT_WINDOW = 60_000;

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------

export class RateLimiter {
  private cfg: Required<LimitConfig> = {
    global: { read: Infinity, write: Infinity, windowMs: DEFAULT_WINDOW },
    perCollection: {},
    behavior: "throw",
    onLimitExceeded: () => undefined,
  };

  private globalBuckets: Record<Operation, number[]> = { read: [], write: [] };
  private collectionBuckets = new Map<string, Record<Operation, number[]>>();

  // ---------------- public API ----------------

  configure(partial: LimitConfig) {
    this.cfg = {
      ...this.cfg,
      ...partial,
      global: { ...this.cfg.global, ...partial.global },
      perCollection: { ...this.cfg.perCollection, ...partial.perCollection },
    };
  }

  /** Clear all counters – useful in tests. */
  reset() {
    this.globalBuckets = { read: [], write: [] };
    this.collectionBuckets.clear();
  }

  /** Register an op; throws/queues/logs if limits are exceeded. */
  async register(
    op: Operation,
    refOrPath: DocumentReference | CollectionReference | string
  ) {
    const path =
      typeof refOrPath === "string" ? refOrPath : pathFromRef(refOrPath);
    const ts = now();

    const okGlobal = this.check(
      this.globalBuckets,
      op,
      this.cfg.global[op],
      ts
    );

    const colBucket = this.bucketFor(path);
    const perColLimit = this.cfg.perCollection[path]?.[op];
    const okCollection = perColLimit
      ? this.check(colBucket, op, perColLimit, ts)
      : true;

    if (okGlobal && okCollection) return;

    // ---- limit exceeded ----
    const limit = okGlobal ? perColLimit! : this.cfg.global[op]!;
    const count = okGlobal
      ? colBucket[op].length
      : this.globalBuckets[op].length;

    this.cfg.onLimitExceeded({ op, path, ts, count, limit });

    switch (this.cfg.behavior) {
      case "log":
        console.warn(
          `[firestore-wrapper] ${op} limit hit for ${path} (${count}/${limit})`
        );
        return;
      case "queue": {
        const wait = this.delay(colBucket[op]);
        await new Promise((r) => setTimeout(r, wait));
        return;
      }
      case "throw":
      default:
        throw new Error(
          `[firestore-wrapper] ${op} limit exceeded for ${path} (${count}/${limit})`
        );
    }
  }

  // ---------------- internals ----------------

  private bucketFor(path: string) {
    if (!this.collectionBuckets.has(path)) {
      this.collectionBuckets.set(path, { read: [], write: [] });
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.collectionBuckets.get(path)!;
  }

  private delay(bucket: number[]) {
    const windowMs = this.cfg.global.windowMs ?? DEFAULT_WINDOW;
    return bucket.length ? Math.max(0, windowMs - (now() - bucket[0])) : 0;
  }

  private check(
    store: Record<Operation, number[]>,
    op: Operation,
    limit: number | undefined,
    ts: number
  ) {
    const b = store[op];
    const windowMs = this.cfg.global.windowMs ?? DEFAULT_WINDOW;
    while (b.length && ts - b[0] >= windowMs) b.shift();
    b.push(ts);
    return limit === undefined || b.length <= limit;
  }
}

// Shared singleton
export const rateLimiter = new RateLimiter();
