# @neat-evolution/logger

The `@neat-evolution/logger` package provides a lightweight, channel-based
logging system for the `neat-js` monorepo. It supports per-channel muting,
wildcard patterns, pluggable log engines, and automatic muting in test
environments.

## Purpose

The primary purpose of the `@neat-evolution/logger` package is to:

- **Provide Structured Logging:** Route log output through named channels
  (e.g. `neat:evolution`, `neat:worker:pool`) so consumers can control
  verbosity at any granularity.
- **Support Muting and Filtering:** Allow channels to be muted individually,
  by wildcard prefix (`neat:worker:*`), or globally — without monkey-patching
  `console`.
- **Auto-Mute in Tests:** Automatically silence all output when running under
  Vitest, Jest, or `NODE_ENV=test`, so tests stay clean by default.
- **Enable Pluggable Engines:** Let consumers swap the underlying output target
  (e.g. replace `console` with a custom writer or test spy) per channel or
  globally.

## How it Fits into the Ecosystem

The `logger` package is a foundational dependency used across the monorepo:

- **`@neat-evolution/evolution`**: Uses a `neat:evolution` channel for lifecycle
  messages (iteration progress, new best, abort, early stop) and generation
  reporting (fitness, genome stats, species breakdown).
- **`@neat-evolution/worker-actions`**: Uses a `neat:worker:verbose` channel
  (muted by default) for detailed dispatcher/handler/call-manager debug output.
- **`@neat-evolution/worker-pool`**: Uses the same `neat:worker:verbose` channel
  for worker readiness debug output.

Packages own their verbosity contracts — verbose channels are muted at module
init by the packages that create them.

## Installation

This package is hosted on [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry). You'll need to configure your package manager to use the GitHub Packages registry for the `@neat-evolution` scope.

### Yarn (v2+)

Add to your `.yarnrc.yml`:

```yaml
npmScopes:
  neat-evolution:
    npmAlwaysAuth: true
    npmRegistryServer: "https://npm.pkg.github.com"
```

Then install:

```sh
yarn add @neat-evolution/logger
```

### npm

Create a `.npmrc` file in your project root:

```
@neat-evolution:registry=https://npm.pkg.github.com
```

Then install:

```sh
npm install @neat-evolution/logger
```

## Key Components

### Logger Creation

- **`createLogger(channel: string): Logger`**: Creates a logger bound to a named
  channel. All methods (`log`, `info`, `warn`, `debug`) respect the channel's
  mute state. `error` always passes through — it is never muted.

### Muting

- **`muteChannel(channel: string)`**: Mute a specific channel. Supports wildcard
  patterns: `muteChannel('neat:worker:*')` mutes `neat:worker:pool`,
  `neat:worker:verbose`, etc.
- **`unmuteChannel(channel: string)`**: Unmute a previously muted channel.
- **`muteAll()` / `unmuteAll()`**: Global mute/unmute. `muteAll()` is called
  automatically in test environments.

### Engines

- **`setEngine(engine: LogEngine)`**: Replace the global output target. Defaults
  to `console`.
- **`setChannelEngine(channel: string, engine: LogEngine)`**: Override the
  output target for a specific channel. Supports prefix matching — setting an
  engine for `neat:worker` also covers `neat:worker:pool`.

### Types

- **`Logger`**: Interface with `log`, `info`, `warn`, `error`, `debug` methods.
- **`LogEngine`**: Same shape as `Logger` — any logger instance can serve as an
  engine for another.

## Usage

```typescript
import {
  createLogger,
  muteChannel,
  unmuteChannel,
} from "@neat-evolution/logger";

// Create a logger on a named channel
const logger = createLogger("neat:evolution");
logger.log("Iteration 0"); // prints to console

// Mute a channel
muteChannel("neat:evolution");
logger.log("This is silent"); // suppressed
logger.error("This still prints"); // error always passes through

// Unmute
unmuteChannel("neat:evolution");
logger.log("Back to normal"); // prints again

// Mute by wildcard
muteChannel("neat:worker:*");
// All neat:worker:pool, neat:worker:verbose, etc. are now silent
```

### Verbose Logging Pattern

Packages that produce high-volume debug output should mute their channel by
default and let consumers opt in:

```typescript
import { createLogger, muteChannel } from "@neat-evolution/logger";

// Muted by default — this is part of the package's contract
muteChannel("neat:worker:verbose");
export const verboseLogger = createLogger("neat:worker:verbose");
```

Consumers can unmute when debugging:

```typescript
import { unmuteChannel } from "@neat-evolution/logger";
unmuteChannel("neat:worker:verbose");
```

## License

This package is licensed under the MIT License. See the [LICENSE](../../LICENSE)
file for details.
