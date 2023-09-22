# @neat-js/utils

Utility functions used in @neat-js.

```sh
yarn add @neat-js/utils
```

## Rand

A crude port of the random number generator in Rust. Uses [seedrandom](https://www.npmjs.com/package/seedrandom). This is mostly so that the code "looks" like the original Rust code. This was helpful during debugging and it still works so it's still here :)

```ts
import { createRNG, threadRNG } from '@neat-js/utils'

// get the global random number generator
const rng = threadRNG()

rng.gen() // a random number, similar to Math.random()
rng.genRange(0, 10) // a random number between 0 and 9 inclusive

// create your own random number generator; optionally supply a seed
const myRng = createRNG('my seed')
```

## Shuffle

A port of [array-shuffle](https://github.com/sindresorhus/array-shuffle/blob/main/index.js) but adapted to do in-place shuffling and also to work with the random number generator.

```ts
import { createRNG, shuffle } from '@neat-js/utils'

const array = [1, 2, 3]

// shuffle the array in place
shuffle(array)
console.log(array) // example: [2, 3, 1]

// optionally supply your own random number generator
shuffle(array, createRNG('my seed')) 
console.log(array) // example: [3, 1, 2]
```
