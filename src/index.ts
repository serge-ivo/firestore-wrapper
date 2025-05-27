/**
 * Public entry: expose Firestore helpers through a limiter layer.
 *
 * 1. Re-export runtime helpers we know apps may import.
 * 2. Re-export *types only* so TypeScript sees the full surface without
 *    causing Rollup duplication errors.
 * 3. Wrap core read/write helpers with the rate-limiter.
 */

export type * from "firebase/firestore"; // ⬅️ type-only: zero runtime exports

// ---------------------------------------------------------------------------
// Explicit runtime re-exports (extend if your codebase uses more helpers)
// ---------------------------------------------------------------------------
export {
  // Advanced initialisation & cache helpers
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  memoryLocalCache,
  // Runtime helpers
  getFirestore,
  Timestamp,
  FieldValue, // e.g. increment, arrayUnion live under this namespace
  FieldPath,
  Query,
  QueryConstraint,
  QueryDocumentSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
  deleteField,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  GeoPoint,
  type DocumentData,
  type SnapshotListenOptions,
  type Unsubscribe,
  type WriteBatch,

  // Core constructor helpers that we DON'T override
  collection,
  collectionGroup,
  doc,
  query,
  where,
  orderBy,
  limit,
  limitToLast,
  startAt,
  startAfter,
  endAt,
  endBefore,
  // onSnapshot, // re-exported again below (guarded), harmless in TS
  runTransaction, // not guarded but useful to expose
  // writeBatch, // we override commit logic below
} from "firebase/firestore";

// ---------------------------------------------------------------------------

import * as fs from "firebase/firestore";
import { makeGuarded } from "./wrappers";
import { rateLimiter, LimitConfig } from "./limiter";

// -------------------- configuration --------------------

/** Call once during app bootstrap */
export function configureRateLimits(cfg: LimitConfig) {
  rateLimiter.configure(cfg);
}

// -------------------- guarded helpers --------------------

// Reads
export const getDoc = makeGuarded(fs.getDoc, "read");
export const getDocs = makeGuarded(fs.getDocs, "read");

// Guarded listener (note: only the initial stream start counts as a read)
export const onSnapshot = makeGuarded(fs.onSnapshot as any, "read");

// Writes
export const setDoc = makeGuarded(fs.setDoc, "write");
export const updateDoc = makeGuarded(fs.updateDoc, "write");
export const addDoc = makeGuarded(fs.addDoc, "write");
export const deleteDoc = makeGuarded(fs.deleteDoc, "write");

export const writeBatch = (...args: Parameters<typeof fs.writeBatch>) => {
  const batch = fs.writeBatch(...args);
  const originalCommit = batch.commit.bind(batch);
  batch.commit = async () => {
    await rateLimiter.register("write", "_batch_");
    return originalCommit();
  };
  return batch;
};
