# @serge-ivo/firestore-wrapper

[![npm version](https://img.shields.io/npm/v/@serge-ivo/firestore-wrapper.svg?style=flat-square)](https://www.npmjs.com/package/@serge-ivo/firestore-wrapper)
[![license](https://img.shields.io/npm/l/@serge-ivo/firestore-wrapper.svg?style=flat-square)](LICENSE)

> **Drop-in replacement for `firebase/firestore` that enforces configurable read/write limits.**  
> _This package is **not** affiliated with Google or Firebase._

---

## ✨ Why?

- Accidentally hammering Firestore can blow past your free-tier quota or spike costs.
- `@serge-ivo/firestore-wrapper` wraps the official SDK and blocks, queues, or logs when you exceed limits you define.
- No API changes: switch the import path, call **one** config function at app startup, and you’re done.

---

## 🛠️ Installation

```bash
npm install firebase @serge-ivo/firestore-wrapper
# or
yarn add firebase @serge-ivo/firestore-wrapper
```
