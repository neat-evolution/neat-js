# Beachball Reference

Beachball manages versioning and publishing for the neat-js monorepo. Change files declare intent to release packages at specific semver bumps.

## Change File Format

Beachball creates JSON change files in `change/` subdirectories named after the package:

```
change/@neat-evolution-package-name/change-file-hash.json
```

Each file contains:

```json
{
  "type": "patch",
  "comment": "Description of what changed",
  "packageName": "@neat-evolution/package-name",
  "email": "not-known",
  "dependentChangeType": "patch"
}
```

## Creating Change Files

```bash
# Interactive (prompts for package, type, message)
yarn beachball change --no-commit

# Non-interactive (for automation)
yarn beachball change --no-commit --package @neat-evolution/foo --type patch --message "fix something"
```

### Bump Types

| Type    | When to Use                        |
| ------- | ---------------------------------- |
| `patch` | Bug fixes, small improvements      |
| `minor` | New features (backwards compatible)|
| `major` | Breaking changes                   |

## When to Add Change Files

**Add change file:**
- New features
- Bug fixes
- Breaking changes
- Public API changes

**Skip change file:**
- Refactoring (no behavior change)
- Documentation updates
- Test additions
- DevDependency updates
- Internal tooling changes

## Checking Change Files

```bash
# Check that change files exist for modified packages
yarn check:beachball
```

## How the Release Workflow Uses Change Files

Unlike changesets, beachball publishes directly (no "Version Packages" PR):

1. **PR merged to main** -> Release workflow triggers
2. **`beachball publish` runs** -> bumps versions, updates CHANGELOGs, publishes to registry, commits version bump
3. **Done** - the `chore: publish [skip ci]` commit appears on main

## Release Workflow

The Release workflow (`.github/workflows/release.yml`) runs on push to main:
- Builds all packages
- Runs `beachball publish` with `--message "chore: publish [skip ci]"`
- Publishes to GitHub Package Registry (`npm.pkg.github.com`)
- Updates `yarn.lock` if needed

## Beachball Config

`beachball.config.js`:
```js
module.exports = {
  branch: 'origin/main',
  registry: 'https://npm.pkg.github.com',
}
```
