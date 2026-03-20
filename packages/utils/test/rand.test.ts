import { describe, expect, it } from 'vitest'
import { createRNG } from '../src/rand.js'

describe('createRNG', () => {
  it('produces deterministic sequences from the same seed', () => {
    const a = createRNG('test-seed')
    const b = createRNG('test-seed')
    for (let i = 0; i < 100; i++) {
      expect(a.gen()).toBe(b.gen())
    }
  })

  it('produces different sequences from different seeds', () => {
    const a = createRNG('seed-a')
    const b = createRNG('seed-b')
    const aValues = Array.from({ length: 10 }, () => a.gen())
    const bValues = Array.from({ length: 10 }, () => b.gen())
    expect(aValues).not.toEqual(bValues)
  })
})

describe('derive', () => {
  it('produces a deterministic child RNG from the same parent and label', () => {
    const parentA = createRNG('root')
    const parentB = createRNG('root')
    const childA = parentA.derive('child')
    const childB = parentB.derive('child')
    for (let i = 0; i < 100; i++) {
      expect(childA.gen()).toBe(childB.gen())
    }
  })

  it('produces different sequences for different labels', () => {
    const parent = createRNG('root')
    const childA = parent.derive('label-a')
    const childB = parent.derive('label-b')
    const aValues = Array.from({ length: 10 }, () => childA.gen())
    const bValues = Array.from({ length: 10 }, () => childB.gen())
    expect(aValues).not.toEqual(bValues)
  })

  it('does not advance the parent sequence', () => {
    const parentA = createRNG('root')
    const parentB = createRNG('root')

    // Derive from parentA (should not advance it)
    parentA.derive('child')
    parentA.derive('another-child')

    // Both parents should still produce the same sequence
    for (let i = 0; i < 100; i++) {
      expect(parentA.gen()).toBe(parentB.gen())
    }
  })

  it('chained derivation is deterministic', () => {
    const rootA = createRNG('root')
    const rootB = createRNG('root')

    const leafA = rootA.derive('level-1').derive('level-2').derive('level-3')
    const leafB = rootB.derive('level-1').derive('level-2').derive('level-3')

    for (let i = 0; i < 100; i++) {
      expect(leafA.gen()).toBe(leafB.gen())
    }
  })

  it('chained derivation differs from single derivation with concatenated label', () => {
    const root = createRNG('root')
    const chained = root.derive('a').derive('b')
    const concatenated = root.derive('a:b')

    // These should produce different sequences — derivation is not concatenation
    const chainedValues = Array.from({ length: 10 }, () => chained.gen())
    const concatenatedValues = Array.from({ length: 10 }, () =>
      concatenated.gen()
    )
    expect(chainedValues).not.toEqual(concatenatedValues)
  })

  it('works with empty string label', () => {
    const parent = createRNG('root')
    const child = parent.derive('')
    // Should not throw and should produce values
    const value = child.gen()
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  })

  it('unseeded RNG derive still works', () => {
    const parent = createRNG()
    const child = parent.derive('label')
    const value = child.gen()
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  })

  it('two separately-created RNGs with same seed produce same derive results', () => {
    const rng1 = createRNG('shared-seed')
    const rng2 = createRNG('shared-seed')

    // Advance both by the same amount
    for (let i = 0; i < 50; i++) {
      rng1.gen()
      rng2.gen()
    }

    // Derive should still match — it's based on the original seed, not current state
    const child1 = rng1.derive('test')
    const child2 = rng2.derive('test')
    for (let i = 0; i < 100; i++) {
      expect(child1.gen()).toBe(child2.gen())
    }
  })

  it('derived child supports genRange and genBool', () => {
    const parent = createRNG('root')
    const child = parent.derive('child')

    const rangeValue = child.genRange(10, 20)
    expect(rangeValue).toBeGreaterThanOrEqual(10)
    expect(rangeValue).toBeLessThan(20)

    const boolValue = child.genBool()
    expect(typeof boolValue).toBe('boolean')
  })

  it('derived child can derive further children', () => {
    const root = createRNG('root')
    const child = root.derive('child')
    const grandchild = child.derive('grandchild')

    // All three should produce independent sequences
    const rootVal = root.gen()
    const childVal = child.gen()
    const grandchildVal = grandchild.gen()

    // Extremely unlikely all three are equal
    expect(new Set([rootVal, childVal, grandchildVal]).size).toBeGreaterThan(1)
  })
})

describe('toSeed', () => {
  it('recreates the same RNG from toSeed()', () => {
    const original = createRNG('test-seed').derive('child')
    const seed = original.toSeed()
    const recreated = createRNG(seed)

    for (let i = 0; i < 100; i++) {
      expect(recreated.gen()).toBe(original.gen())
    }
  })

  it('toSeed() is deterministic for same derivation path', () => {
    const a = createRNG('root').derive('x')
    const b = createRNG('root').derive('x')
    expect(a.toSeed()).toBe(b.toSeed())
  })

  it('toSeed() differs for different derivation paths', () => {
    const a = createRNG('root').derive('x')
    const b = createRNG('root').derive('y')
    expect(a.toSeed()).not.toBe(b.toSeed())
  })
})
