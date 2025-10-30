import { test, describe } from 'node:test'
import assert from 'node:assert'
import { BID_VALUES, SUITS, RANKS } from '../lib/constants.js'

describe('Constants', () => {
  test('should have correct BID_VALUES', () => {
    assert.strictEqual(BID_VALUES.pass, 0)
    assert.strictEqual(BID_VALUES['1'], 1)
    assert.strictEqual(BID_VALUES['2'], 2)
    assert.strictEqual(BID_VALUES['3'], 3)
    assert.strictEqual(BID_VALUES['4'], 4)
    assert.strictEqual(BID_VALUES.cinch, 11)
  })

  test('should have correct SUITS', () => {
    assert.strictEqual(SUITS.length, 4)
    assert(SUITS.includes('♥'))
    assert(SUITS.includes('♠'))
  })

  test('should have correct RANKS', () => {
    assert.strictEqual(RANKS.length, 13)
    assert.strictEqual(RANKS[0], '2')
    assert.strictEqual(RANKS[12], 'A')
  })
})
