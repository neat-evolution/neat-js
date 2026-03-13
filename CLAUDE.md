# Claude Code Guidelines

All packages are under `packages/` and named `@neat-evolution/<dirname>`.

## Running Commands

All commands run from the repo root. Both `yarn workspace` and `yarn turbo` handle routing to the correct package, so there's no need to navigate into package directories.

> **Why not `cd`?** Yarn and Turbo are designed to work from the root. Beyond that, `cd` in a tool call changes the working directory for subsequent calls, and later calls won't remember the change — leading to confusing "file not found" errors for the rest of the conversation.

There are two ways to run commands — pick the right one for the job:

### `yarn workspace <pkg> <script>` — run one script in one package

This is the direct way to run a single package script. Use the full package name (e.g. `@neat-evolution/neat`). Every package has these standard scripts:

| Script   | What it does                                     | Notes                                                      |
| -------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `test`   | `vitest --passWithNoTests --run`                 | `--run` disables watch mode. Pass extra vitest flags after |
| `check`  | `tsgo --noEmit`                                  | Type-check only, no output                                 |
| `format` | `biome check --write`                            | Formats AND fixes lint-autofixable issues                  |
| `lint`   | `biome lint`                                     | Lint without fixing                                        |
| `build`  | SWC (CJS + ESM) + tsgo (types), runs in parallel | Outputs to `dist/`                                         |

Examples:

```sh
yarn workspace @neat-evolution/neat test              # run all tests
yarn workspace @neat-evolution/neat test myFile       # run tests matching "myFile"
yarn workspace @neat-evolution/neat test --reporter=verbose  # verbose output
yarn workspace @neat-evolution/core check             # type-check core
yarn workspace @neat-evolution/cppn format            # format + autofix cppn
yarn workspace @neat-evolution/neat add some-lib      # add a dependency
```

### `yarn <script>` — turbo with quiet output

The root scripts (`yarn build`, `yarn test`, `yarn check`, `yarn format`, `yarn lint`) are turbo wrappers with `--output-logs=errors-only` — quiet unless something fails. Since they delegate to turbo, all turbo flags work, including `--filter`.

| Command       | What it does                                               |
| ------------- | ---------------------------------------------------------- |
| `yarn build`  | Build all packages in dependency order                     |
| `yarn test`   | Run all tests across all packages                          |
| `yarn check`  | Type-check all packages (turbo runs each package's `tsgo`) |
| `yarn format` | Format + autofix all packages                              |
| `yarn lint`   | Lint all packages                                          |

Use `--filter` to scope to specific packages:

```sh
# Build neat and everything it depends on — quiet output
yarn build --filter=@neat-evolution/neat...

# Build only neat's dependencies (useful before running tests)
yarn build --filter=@neat-evolution/neat^...

# Type-check neat (turbo builds upstream deps first)
yarn check --filter=@neat-evolution/neat

# Test just one package, quietly
yarn test --filter=@neat-evolution/core
```

Key filter patterns:

- `--filter=@neat-evolution/neat` — just that package
- `--filter=@neat-evolution/neat...` — that package **and all its dependencies** (downstream-inclusive)
- `--filter=@neat-evolution/neat^...` — **only its dependencies**, not the package itself

The turbo pipeline has these dependency rules:

- `build`, `check`, `test` all depend on `^build` (upstream packages must be built first)
- `format`, `lint` have no task dependencies (safe to run standalone)

The pre-commit hook blocks direct commits to `main`, formats staged files (lint-staged + biome), and type-checks changed packages (turbo runs `check` with `--filter='[HEAD]'`, building upstream deps as needed). The commit-msg hook enforces conventional commit messages via commitlint.

### Output verbosity

There are three tiers, each with a different verbosity level:

| Command                          | Output level | Use case                                      |
| -------------------------------- | ------------ | --------------------------------------------- |
| `yarn workspace <pkg> <script>`  | Full         | Focused work on one package — see everything   |
| `yarn <script> [--filter=...]`   | Errors only  | Default for agents and developers — quiet      |
| `yarn turbo <script>`            | Full         | CI and debugging — full turbo output           |

Prefer `yarn <script>` with `--filter` over `yarn turbo <script>` for everyday use. Use `yarn turbo` directly when you need full output (CI, debugging).

## TypeScript Rules

Biome enforces these rules and will reject code that violates them. Write code correctly the first time — do not write violations and fix them after.

**No `!` (non-null assertion)** — biome rule: `noNonNullAssertion`. Never use the `!` postfix operator. Always use a type guard instead, even when the value is "obviously" defined. This is the most common source of rework.

```ts
// WRONG — will be flagged by biome
const value = map.get(key)!

// CORRECT — use a type guard
const value = map.get(key)
if (value === undefined) {
  throw new Error(`Expected value for key: ${key}`)
}
```

Use early returns, `continue`, or throws — whichever fits the context.

**No `any`** — biome rule: `noExplicitAny`. Use `unknown` and narrow with type guards.

**Fix warnings, don't add them** — biome warns on unused variables, unused imports, missing `const`, missing `import type`, and other issues. Run `yarn workspace <pkg> format` to autofix what it can. New code must not introduce new warnings.

## Hexagonoids Worktree

The hexagonoids project (the primary real-world consumer of this library) is checked out as a git worktree at `.worktrees/hexagonoids-lamarkian/`. It is a separate repo (`heygrady/hexagonoids`) on its `feat/lamarkian` branch, included here so we can keep it in sync with neat-js changes.

To run commands in the hexagonoids worktree, `cd` into it first. It is its own monorepo with its own `yarn`, `turbo`, and workspace setup:

```sh
cd .worktrees/hexagonoids-lamarkian
yarn build                            # build all hexagonoids packages
yarn workspace @heygrady/hexagonoids-demo test   # test one package
yarn check                            # type-check everything
```

Files under `.worktrees/hexagonoids-lamarkian/` belong to the hexagonoids repo, not neat-js. Commits there go to the hexagonoids branch. See `.worktrees/CLAUDE.md` for more on working with worktrees.

Key hexagonoids packages:
- `hexagonoids-demo` — CLI training runner (the main integration point)
- `hexagonoids-environment` — game simulation + evaluation environment
- `tictactoe-demo` / `tictactoe-environment` — tournament-style evaluation
- `tournament-strategy` — GlickoStrategy (the clean reference for evaluation strategies)

## Project Architecture

This is a neuroevolution library implementing NEAT and its variants (HyperNEAT, ES-HyperNEAT, DES-HyperNEAT).

**Monorepo**: Yarn 4.12.0 + Turbo. **Toolchain**: SWC (transpilation), tsgo (type checking), Vitest (testing), Biome (formatting + linting), Volta (Node 24.11.1). **Releases**: Beachball + conventional commits.
