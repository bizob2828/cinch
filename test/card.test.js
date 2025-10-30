import { test, describe } from 'node:test'
import assert from 'node:assert'
import { Card } from '../lib/card.js'

describe('Card Class', () => {
  test('should create a card with suit and rank', () => {
    const card = new Card('♥', 'A')
    assert.strictEqual(card.suit, '♥')
    assert.strictEqual(card.rank, 'A')
  })

  test('should return correct point values', () => {
    assert.strictEqual(new Card('♥', 'A').getPointValue(), 4)
    assert.strictEqual(new Card('♠', 'K').getPointValue(), 3)
    assert.strictEqual(new Card('♦', 'Q').getPointValue(), 2)
    assert.strictEqual(new Card('♣', 'J').getPointValue(), 1)
    assert.strictEqual(new Card('♥', '10').getPointValue(), 10)
    assert.strictEqual(new Card('♠', '9').getPointValue(), 0)
  })

  test('should return correct rank index', () => {
    assert.strictEqual(new Card('♥', '2').getRankIndex(), 0)
    assert.strictEqual(new Card('♠', 'A').getRankIndex(), 12)
    assert.strictEqual(new Card('♦', 'K').getRankIndex(), 11)
  })

  test('should return correct string representation', () => {
    const card = new Card('♥', 'A')
    assert.strictEqual(card.toString(), 'A of ♥')
  })
})
