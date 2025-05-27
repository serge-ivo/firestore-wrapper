# @serge-ivo/firestore-wrapper

[![npm version](https://img.shields.io/npm/v/@serge-ivo/firestore-wrapper.svg?style=flat-square)](https://www.npmjs.com/package/@serge-ivo/firestore-wrapper)
[![license](https://img.shields.io/npm/l/@serge-ivo/firestore-wrapper.svg?style=flat-square)](LICENSE)

> **Drop-in replacement for `firebase/firestore` that puts a rate-limiter in front of every read/write.**  
> _Unofficial project – not affiliated with Google or Firebase._

---

## ✨ Why?

| Pain                                                  | Wrapper fix                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Blowing through Firestore’s free-tier reads or writes | Hard-caps or queues traffic by global or per-collection limits.          |
| Developers forget to throttle expensive listeners     | The wrapper intercepts the SDK itself – no discipline required.          |
| You want “same API, extra safety”                     | `export *` from the real SDK; only `getDoc`, `setDoc`, etc. are guarded. |

---

## 🛠️ Install

```bash
# add the wrapper alongside firebase
npm install firebase @serge-ivo/firestore-wrapper
# or
yarn add firebase @serge-ivo/firestore-wrapper
```

---

## 🚀 Two integration styles

### 1. **Explicit** (import the wrapper directly)

```ts
import { initializeApp } from "firebase/app";
import {
  doc,
  getDoc,
  configureRateLimits, // only extra symbol
} from "@serge-ivo/firestore-wrapper";

configureRateLimits({
  global: { read: 1_000, write: 500, windowMs: 60_000 },
  perCollection: { users: { read: 200 } },
  behavior: "throw",
});

const app = initializeApp(firebaseConfig);
const snap = await getDoc(doc("users/alice")); // ← throttled
```

Developers must remember to use the wrapper path in new files.

---

### 2. **Seamless alias** (devs keep `firebase/firestore`)

> Ideal for large codebases where you don’t want to touch hundreds of imports.

1. **Side-effect import once** to hard-code limits:

   ```ts
   // src/firestore-limits.ts
   import { configureRateLimits } from "@serge-ivo/firestore-wrapper";

   configureRateLimits({
     global: { read: 1_000, write: 500, windowMs: 60_000 },
     behavior: "throw",
   });
   ```

   ```ts
   // main.ts
   import "./firestore-limits"; //  ← must run before first Firestore call
   import ReactDOM from "react-dom/client";
   import App from "./App";
   ```

2. **Vite alias that rewrites only your source imports**:

   ```ts
   // vite.config.ts
   import { defineConfig } from "vite";

   export default defineConfig({
     plugins: [
       {
         name: "alias-firestore-wrapper",
         enforce: "pre",
         resolveId(source, importer) {
           if (
             source === "firebase/firestore" &&
             importer && // may be undefined in virtual modules
             !importer.includes("node_modules")
           ) {
             return this.resolve("@serge-ivo/firestore-wrapper", importer, {
               skipSelf: true,
             });
           }
         },
       },
     ],
   });
   ```

   - Every import originating in **your** code (`src/**`) is rewritten.
   - Imports inside `node_modules` (including the wrapper itself) see the **real** SDK, avoiding circular alias problems.

That’s it—developers still write:

```ts
import { collection, query, onSnapshot } from "firebase/firestore";
```

…but at runtime those calls go through the wrapper and respect your limits.

---

## ⚙️ API (what you can tweak)

```ts
configureRateLimits({
  global: { read, write, windowMs },
  perCollection: { "<collection>": { read, write } },
  behavior: "throw" | "queue" | "log",
  onLimitExceeded(details) {
    /* optional hook */
  },
});
```

- **`throw`** – default, rejects extra calls.
- **`queue`** – waits until the sliding window has room, then continues.
- **`log`** – allows the call but `console.warn`s when a limit is hit.

---

## 🧪 Testing tip

```ts
import { rateLimiter } from "@serge-ivo/firestore-wrapper";

beforeEach(() => {
  rateLimiter.reset(); // clear counters
  rateLimiter.configure({ global: { read: 2, windowMs: 100 } });
});
```

`rateLimiter.reset()` is handy for unit tests that simulate bursts.

---

## 🔒 Security & disclaimers

- Compatible with Firebase SDK ≥ 10 – peer range is `>=10 <12`.
- Works against the Firebase Emulator Suite identically.
- **Not** an official Google product; use at your own risk.

---

## 🪪 License

[MIT](LICENSE)

```

Copy/paste over your existing **README.md** (or merge sections you like).
It now includes:

* The quick explicit approach **and** the seamless alias pattern.
* Hard-coded limiter example.
* API table and testing snippet.
```
