import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { Card } from '../lib/card.js'
import { Deck } from '../lib/deck.js'

describe('Deck Class', () => {
  let deck

  beforeEach(() => {
    deck = new Deck()
  })

  test('should create a full deck of 52 cards', () => {
    assert.strictEqual(deck.size(), 52)
    assert.strictEqual(deck.isEmpty(), false)
  })

  test('should deal single card', () => {
    const originalSize = deck.size()
    const dealtCards = deck.deal(1)

    assert.strictEqual(dealtCards.length, 1)
    assert.strictEqual(deck.size(), originalSize - 1)
    assert(dealtCards[0] instanceof Card)
  })

  test('should become empty after dealing all cards', () => {
    const allCards = deck.deal(52)

    assert.strictEqual(allCards.length, 52)
    assert.strictEqual(deck.size(), 0)
    assert.strictEqual(deck.isEmpty(), true)
  })

  test('should shuffle deck and change card order', () => {
    const originalOrder = [...deck.cards]
    deck.shuffle()

    // With 52 cards, the probability of the order staying exactly the same is astronomically low
    // We'll check that at least some cards changed position
    let changedPositions = 0
    for (let i = 0; i < Math.min(10, deck.cards.length); i++) {
      if (originalOrder[i] !== deck.cards[i]) {
        changedPositions++
      }
    }

    // With proper shuffling, at least some of the first 10 cards should have moved
    assert(changedPositions > 0, 'Shuffle should change at least some card positions')
    assert.strictEqual(deck.size(), 52, 'Deck size should remain the same after shuffle')
  })
})
