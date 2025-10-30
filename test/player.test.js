import { test, describe } from 'node:test'
import assert from 'node:assert'
import { Card } from '../lib/card.js'
import { Player } from '../lib/player.js'

describe('Player Class', () => {
  test('should create player with correct properties', () => {
    const player = new Player('socket123', 0, 'Alice')

    assert.strictEqual(player.id, 'socket123')
    assert.strictEqual(player.seat, 0)
    assert.strictEqual(player.name, 'Alice')
    assert.strictEqual(player.team, 1) // seat 0 = team 1
  })

  test('should assign teams correctly based on seat', () => {
    const player0 = new Player('id0', 0, 'Player0')
    const player1 = new Player('id1', 1, 'Player1')
    const player2 = new Player('id2', 2, 'Player2')
    const player3 = new Player('id3', 3, 'Player3')

    assert.strictEqual(player0.team, 1) // even seats = team 1
    assert.strictEqual(player1.team, 2) // odd seats = team 2
    assert.strictEqual(player2.team, 1) // even seats = team 1
    assert.strictEqual(player3.team, 2) // odd seats = team 2
  })

  test('should handle card operations', () => {
    const player = new Player('id1', 0, 'Alice')
    const card1 = new Card('♥', 'A')
    const card2 = new Card('♠', 'K')
    const card3 = new Card('♦', 'Q')

    // Test adding single card
    player.addCardToHand(card1)
    assert.strictEqual(player.hand.size(), 1)

    // Test adding multiple cards
    player.addCardsToHand([card2, card3])
    assert.strictEqual(player.hand.size(), 3)

    // Test playing a card
    const playedCard = player.playCard(0)
    assert.strictEqual(playedCard, card1)
    assert.strictEqual(player.hand.size(), 2)
  })

  test('should handle discarding cards', () => {
    const player = new Player('id1', 0, 'Alice')
    const cards = [new Card('♥', 'A'), new Card('♠', 'K'), new Card('♦', 'Q')]

    player.addCardsToHand(cards)
    const discarded = player.discardCards([0, 2]) // Discard first and third

    assert.strictEqual(discarded.length, 2)
    assert.strictEqual(player.hand.size(), 1)
  })

  test('should handle won cards', () => {
    const player = new Player('id1', 0, 'Alice')
    const wonCards = [new Card('♥', 'A'), new Card('♠', 'K')]

    player.addWonCards(wonCards)
    assert.strictEqual(player.wonCards.size(), 2)
  })

  test('should reset for new hand', () => {
    const player = new Player('id1', 0, 'Alice')
    const cards = [new Card('♥', 'A'), new Card('♠', 'K')]
    const wonCards = [new Card('♦', 'Q')]

    player.addCardsToHand(cards)
    player.addWonCards(wonCards)

    assert.strictEqual(player.hand.size(), 2)
    assert.strictEqual(player.wonCards.size(), 1)

    player.resetForNewHand()

    assert.strictEqual(player.hand.size(), 0)
    assert.strictEqual(player.wonCards.size(), 0)
  })

  test('should use default name when none provided', () => {
    const player = new Player('id1', 2) // No name provided
    assert.strictEqual(player.name, 'Player 3') // seat + 1
  })
})
