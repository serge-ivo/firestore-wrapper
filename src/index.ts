/**
 * Public entry: re-export everything from firebase/firestore,
 * then override read/write helpers with guarded versions
 * and expose the limiter config.
 */

export * from "firebase/firestore"; // types & utilities

import * as fs from "firebase/firestore";
import { makeGuarded } from "./wrappers";
import { rateLimiter, LimitConfig } from "./limiter";

// -------------------- configuration --------------------

/** Call once during app bootstrap */
export function configureRateLimits(cfg: LimitConfig) {
  rateLimiter.configure(cfg);
}

// -------------------- overridden helpers --------------------

// Reads
export const getDoc = makeGuarded(fs.getDoc, "read");
export const getDocs = makeGuarded(fs.getDocs, "read");
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
