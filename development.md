# Development Guide

This guide outlines the development workflow for this repository.

## Setup

1.  **Install Dependencies:** This project uses Yarn for package management. To install all dependencies, run:

    ```bash
    yarn install
    ```

## Development Workflow

### 1. Create a Feature Branch

All development should happen on a feature branch, not on `main`.

```bash
git checkout -b my-feature-branch
```

### 2. Make Changes

Make your code changes in the appropriate packages. You can run the following commands to build, test, and lint your changes:

*   `yarn build`: Build all packages.
*   `yarn test`: Run all tests.
*   `yarn lint`: Lint all packages.

### 3. Generate Change Files

This project uses `beachball` to manage versioning. Before you commit your changes, you need to generate change files that describe what you've changed.

Run the following command:

```bash
yarn change
```

This will prompt you to select the packages that have changed and to provide a description of the changes. This will generate files in the `change/` directory. The command will then automatically commit these files with the message "chore: add change files".

### 4. Commit Your Code Changes

Commit your code changes using the conventional commit format. The commit message format is enforced by `commitlint`.

The commit message should follow this pattern:

```
<type>(<scope>): <subject>
```

*   **type:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, etc.
*   **scope:** The name of the package that was changed (e.g., `core`, `neat`, `hyperneat`).
*   **subject:** A concise description of the change.

**Example:**

```bash
git commit -m "feat(core): add new feature"
```

### 5. Push and Create a Pull Request

Push your branch to GitHub and create a pull request against the `main` branch.

```bash
git push -u origin my-feature-branch
```

The pull request will trigger a GitHub Actions workflow that will build, test, and lint your changes. It will also check that you have included change files.

## Release Process

When a pull request is merged into `main`, the `release.yml` workflow is triggered. This workflow uses `beachball` to:

1.  Bump the versions of the packages based on the change files.
2.  Publish the updated packages to the package registry.
3.  Create a new git tag for the release.
