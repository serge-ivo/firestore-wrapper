# NPM Publishing with GitHub Actions

This document explains how to publish npm packages from GitHub Actions using OIDC Trusted Publishers (the recommended, tokenless approach).

## Overview

There are two ways to authenticate with npm from GitHub Actions:

| Method | Security | Maintenance | Recommended |
|--------|----------|-------------|-------------|
| **OIDC Trusted Publisher** | High (no secrets) | Low (no token expiry) | ✅ Yes |
| **NPM Access Token** | Medium (secret storage) | High (tokens expire) | For legacy setups |

## OIDC Trusted Publisher Setup (Recommended)

OIDC (OpenID Connect) allows GitHub Actions to authenticate directly with npm without storing any secrets. npm trusts GitHub's identity verification.

### Prerequisites

- npm account with 2FA enabled
- GitHub repository with Actions enabled
- Package already published to npm (at least once, can be empty/placeholder)

### Step 1: Configure Trusted Publisher on npm

1. Go to your package settings: `https://www.npmjs.com/package/@YOUR-SCOPE/PACKAGE-NAME/access`

2. Find the **"Trusted Publisher"** section

3. Fill in the form:
   - **Publisher**: `GitHub Actions`
   - **Organization or user**: Your GitHub username (e.g., `serge-ivo`)
   - **Repository**: Repository name without owner (e.g., `firestore-wrapper`)
   - **Workflow filename**: Just the filename (e.g., `publish.yml`)
   - **Environment name**: Leave blank unless using GitHub Environments

4. **⚠️ IMPORTANT: Click "Save changes"** - The form shows Save/Cancel buttons; you must click Save!

### Step 2: Configure GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Package

on:
  push:
    branches: [main]
    tags: ["v*"]

permissions:
  contents: write      # For creating git tags
  id-token: write      # Required for OIDC authentication with npm

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://registry.npmjs.org"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish --provenance --access public
```

### Key Configuration Points

1. **`id-token: write` permission** - Required for GitHub to generate OIDC tokens

2. **`registry-url` in setup-node** - Must be set to `https://registry.npmjs.org`

3. **`--provenance` flag** - Enables OIDC authentication and adds supply chain security attestation

4. **`--access public`** - Required for scoped packages (`@scope/package`)

5. **NO `NODE_AUTH_TOKEN` needed** - Unlike the traditional method, OIDC doesn't use tokens

## Traditional NPM Token Method (Legacy)

If OIDC doesn't work for your use case, you can use an npm access token.

### Step 1: Generate NPM Token

1. Go to: `https://www.npmjs.com/settings/YOUR-USERNAME/tokens`
2. Click **"Generate New Token"** → **"Granular Access Token"**
3. Configure:
   - **Name**: Descriptive name (e.g., `GitHub Actions - my-package`)
   - **Expiration**: Choose duration (tokens expire!)
   - **Packages**: Select your package with **Read and write** permission
4. Copy the token (shown only once)

### Step 2: Add Token to GitHub Secrets

```bash
gh secret set NPM_TOKEN
# Paste your token when prompted
```

Or via GitHub UI:
1. Go to: `https://github.com/OWNER/REPO/settings/secrets/actions`
2. Click **"New repository secret"**
3. Name: `NPM_TOKEN`
4. Value: Your npm token

### Step 3: Update Workflow

```yaml
      - name: Publish to npm
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npm publish --provenance --access public
```

## Troubleshooting

### Error: "Access token expired or revoked" + 404 Not Found

**Cause**: npm token has expired or OIDC isn't properly configured.

**Solutions**:
1. If using OIDC: Verify the Trusted Publisher is saved on npm (click "Save changes")
2. If using token: Generate a new token and update the `NPM_TOKEN` secret
3. Check token age: `gh secret list` shows when secrets were last updated

### Error: 404 Not Found on publish

**Causes**:
- Package doesn't exist yet (first publish must be manual or token-based)
- Authentication failed (npm returns 404 instead of 401 for auth failures on scoped packages)
- Trusted Publisher not saved

**Solutions**:
1. Verify you can access the package: `npm view @scope/package-name`
2. Check Trusted Publisher configuration on npm
3. Ensure `--access public` is set for scoped packages

### Error: "missing id-token permission"

**Cause**: Workflow doesn't have OIDC permission.

**Solution**: Add to workflow:
```yaml
permissions:
  id-token: write
```

### Provenance attestation fails

**Cause**: `--provenance` requires OIDC setup.

**Solution**: Either:
- Configure Trusted Publisher properly, or
- Remove `--provenance` flag (not recommended, reduces security)

## Version Management

The workflow in this repo auto-publishes when `package.json` version differs from the latest git tag:

```yaml
- name: Check if publish needed
  id: check
  run: |
    PREV=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    CURR="v$(node -p "require('./package.json').version")"
    if [ "$PREV" != "$CURR" ]; then
      echo "needs_publish=true" >> "$GITHUB_OUTPUT"
    fi
```

To release:
1. Bump version in `package.json`
2. Commit and push to `main`
3. Workflow auto-publishes and creates git tag

## Security Best Practices

1. **Prefer OIDC over tokens** - No secrets to leak or expire
2. **Use granular tokens** if tokens are needed - Limit scope to specific packages
3. **Enable 2FA on npm** - Required for publishing
4. **Use `--provenance`** - Adds verifiable build attestation
5. **Pin action versions** - Use `@v4` not `@main`

## References

- [npm Trusted Publishers Docs](https://docs.npmjs.com/generating-provenance-statements#publishing-packages-with-provenance-via-github-actions)
- [GitHub OIDC with npm](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-cloud-providers)
- [npm Provenance](https://github.blog/2023-04-19-introducing-npm-package-provenance/)
