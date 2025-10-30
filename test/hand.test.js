import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { Card } from '../lib/card.js'
import { Hand } from '../lib/hand.js'

describe('Hand Class', () => {
  let hand
  let card1, card2, card3

  beforeEach(() => {
    hand = new Hand()
    card1 = new Card('♥', 'A')
    card2 = new Card('♠', 'K')
    card3 = new Card('♦', 'Q')
  })

  test('should initialize empty hand', () => {
    assert.strictEqual(hand.size(), 0)
    assert.strictEqual(hand.isEmpty(), true)
  })

  test('should add and remove cards', () => {
    hand.addCard(card1)
    assert.strictEqual(hand.size(), 1)

    const removed = hand.removeCard(0)
    assert.strictEqual(removed, card1)
    assert.strictEqual(hand.size(), 0)
  })

  test('should calculate total point value', () => {
    hand.addCards([card1, card2, card3]) // A=4, K=3, Q=2 = 9 total
    assert.strictEqual(hand.getTotalPointValue(), 9)
  })

  test('should check suit membership', () => {
    hand.addCards([card1, card2]) // Hearts and Spades
    assert.strictEqual(hand.hasSuit('♥'), true)
    assert.strictEqual(hand.hasSuit('♦'), false)
  })

  test('should remove multiple cards by indices', () => {
    hand.addCards([card1, card2, card3])
    const removed = hand.removeCards([0, 2]) // Remove first and third cards

    assert.strictEqual(removed.length, 2)
    assert.strictEqual(hand.size(), 1)
    assert.strictEqual(hand.cards[0], card2) // Only middle card should remain
  })

  test('should check for specific card', () => {
    hand.addCard(card1) // Ace of Hearts

    assert.strictEqual(hand.hasCard('♥', 'A'), true)
    assert.strictEqual(hand.hasCard('♠', 'A'), false)
    assert.strictEqual(hand.hasCard('♥', 'K'), false)
  })

  test('should get cards of specific suit', () => {
    const heartCard = new Card('♥', 'K')
    hand.addCards([card1, card2, heartCard]) // Hearts A, Spades K, Hearts K

    const hearts = hand.getCardsOfSuit('♥')
    assert.strictEqual(hearts.length, 2)
    assert.strictEqual(hearts[0].suit, '♥')
    assert.strictEqual(hearts[1].suit, '♥')
  })

  test('should get non-trump cards', () => {
    const heartCard = new Card('♥', 'K')
    hand.addCards([card1, card2, heartCard]) // Hearts A, Spades K, Hearts K

    const nonTrump = hand.getNonTrumpCards('♥')
    assert.strictEqual(nonTrump.length, 1)
    assert.strictEqual(nonTrump[0].suit, '♠')
  })

  test('should get non-trump indices', () => {
    const heartCard = new Card('♥', 'K')
    hand.addCards([card1, card2, heartCard]) // Hearts A, Spades K, Hearts K

    const indices = hand.getNonTrumpIndices('♥')
    assert.strictEqual(indices.length, 1)
    assert.strictEqual(indices[0], 1) // Index of Spades K
  })

  test('should convert to array representation', () => {
    hand.addCards([card1, card2])
    const array = hand.toArray()

    assert.strictEqual(array.length, 2)
    assert.deepStrictEqual(array[0], { suit: '♥', rank: 'A' })
    assert.deepStrictEqual(array[1], { suit: '♠', rank: 'K' })
  })
})
