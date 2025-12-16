import { and as wrapperAnd, or as wrapperOr } from "../src";
import { and as firestoreAnd, or as firestoreOr } from "firebase/firestore";

describe("runtime re-exports", () => {
  test("re-exports `and`", () => {
    expect(wrapperAnd).toBe(firestoreAnd);
  });

  test("re-exports `or`", () => {
    expect(wrapperOr).toBe(firestoreOr);
  });
});

