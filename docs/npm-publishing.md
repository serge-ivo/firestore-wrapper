# Package Publishing with GitHub Actions

This document explains how to publish packages from GitHub Actions.

## Overview

There are three ways to publish npm packages from GitHub Actions:

| Method | Security | Maintenance | Recommended |
|--------|----------|-------------|-------------|
| **GitHub Packages** | High (built-in token) | None | ✅ Yes (this repo) |
| **npm OIDC Trusted Publisher** | High (no secrets) | Low | For public npm |
| **npm Access Token** | Medium (secret storage) | High (tokens expire) | Legacy |

---

## Dual Publishing Setup (Current)

This repository publishes to **both GitHub Packages and npmjs.org**:
- **GitHub Packages**: Uses built-in `GITHUB_TOKEN` (no token management)
- **npmjs.org**: Uses OIDC Trusted Publisher (no token needed)

This gives users flexibility to install from either registry!

### How to Install the Package

**From npmjs.org** (default, no config needed):
```bash
npm install @serge-ivo/firestore-wrapper
```

**From GitHub Packages** (requires registry config):
```bash
# Option 1: Add to project .npmrc
echo "@serge-ivo:registry=https://npm.pkg.github.com" >> .npmrc

# Option 2: Add globally
npm config set @serge-ivo:registry https://npm.pkg.github.com

# Then install
npm install @serge-ivo/firestore-wrapper
```

**Note**: For private GitHub Packages, users also need to authenticate:
```bash
npm login --registry=https://npm.pkg.github.com
```

### Workflow Configuration

```yaml
name: Publish Package

on:
  push:
    branches: [main]

permissions:
  contents: write   # For git tags
  packages: write   # For GitHub Packages
  id-token: write   # For npm OIDC authentication

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://npm.pkg.github.com"
          cache: "npm"

      - run: npm ci
      - run: npm run build

      # Publish to GitHub Packages (uses publishConfig in package.json)
      - name: Publish to GitHub Packages
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm publish

      # Publish to npmjs.org (overrides registry)
      - name: Publish to npmjs.org
        run: npm publish --registry https://registry.npmjs.org --provenance --access public
```

### package.json Configuration

```json
{
  "name": "@OWNER/package-name",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

**Important**: The package scope (`@OWNER`) must match your GitHub username or organization.

---

## npm OIDC Trusted Publisher

For publishing to the public npm registry without tokens, using OIDC (OpenID Connect).

### Prerequisites

- npm account with 2FA enabled
- Package already exists on npm (first publish must be manual)

### Step 1: Configure Trusted Publisher on npm

1. Go to: `https://www.npmjs.com/package/@SCOPE/PACKAGE/access`
2. In "Trusted Publisher" section, fill in:
   - **Publisher**: `GitHub Actions`
   - **Organization or user**: Your GitHub username
   - **Repository**: Repository name (without owner)
   - **Workflow filename**: `publish.yml`
3. **Click "Save changes"** (easy to miss!)

### Step 2: Workflow Configuration

```yaml
permissions:
  contents: write
  id-token: write  # Required for OIDC

# In setup-node:
registry-url: "https://registry.npmjs.org"

# In publish step (NO token needed):
run: npm publish --provenance --access public
```

### Troubleshooting OIDC

| Error | Cause | Solution |
|-------|-------|----------|
| "Access token expired" | Token overriding OIDC | Remove `NODE_AUTH_TOKEN` env var |
| 404 Not Found | Trusted Publisher not saved | Click "Save changes" on npm |
| "missing id-token permission" | Missing permission | Add `id-token: write` to permissions |

---

## npm Access Token (Legacy)

Traditional method using a stored npm token.

### Setup

1. Generate token at: `https://www.npmjs.com/settings/USERNAME/tokens`
2. Add to GitHub secrets: `gh secret set NPM_TOKEN`
3. Use in workflow:

```yaml
- name: Publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: npm publish --access public
```

### Downsides

- Tokens expire (check with `gh secret list`)
- Secrets can leak
- Manual rotation needed

---

## Version Management

This repo auto-publishes when `package.json` version differs from the latest git tag:

```yaml
- name: Check if publish needed
  run: |
    PREV=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    CURR="v$(node -p "require('./package.json').version")"
    if [ "$PREV" != "$CURR" ]; then
      echo "needs_publish=true" >> "$GITHUB_OUTPUT"
    fi
```

**To release**: Bump version in `package.json`, commit, and push.

---

## Security Best Practices

1. **Use GitHub Packages or OIDC** - Avoid long-lived tokens
2. **Pin action versions** - Use `@v4` not `@main`
3. **Minimal permissions** - Only request what's needed
4. **Enable 2FA** - Required for npm publishing
