import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { Card } from '../lib/card.js'
import { Deck } from '../lib/deck.js'
import { Hand } from '../lib/hand.js'
import { Player } from '../lib/player.js'
import { CinchGame } from '../lib/game.js'
import { BID_VALUES, SUITS, RANKS } from '../lib/constants.js'

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
})

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
})

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
})

describe('CinchGame Class', () => {
  let game

  beforeEach(() => {
    game = new CinchGame()
  })

  test('should initialize empty game', () => {
    assert.strictEqual(game.players.length, 0)
    assert.strictEqual(game.phase, 'waiting')
    assert.strictEqual(game.currentBid, 0)
    assert.deepStrictEqual(game.scores, { team1: 0, team2: 0 })
  })

  test('should add players up to maximum of 4', () => {
    const player1 = game.addPlayer('id1', 'Alice')
    game.addPlayer('id2', 'Bob')
    game.addPlayer('id3', 'Charlie')
    const player4 = game.addPlayer('id4', 'Diana')

    assert.strictEqual(game.players.length, 4)
    assert.strictEqual(player1.seat, 0)
    assert.strictEqual(player4.seat, 3)
  })

  test('should not add more than 4 players', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    const extraPlayer = game.addPlayer('id5', 'Extra')
    assert.strictEqual(extraPlayer, null)
    assert.strictEqual(game.players.length, 4)
  })

  test('should validate bids correctly', () => {
    assert.strictEqual(game.isValidBid('pass', 0), true)
    assert.strictEqual(game.isValidBid('1', 0), true)
    assert.strictEqual(game.isValidBid('2', 1), true)
    assert.strictEqual(game.isValidBid('1', 2), false) // Must outbid
    assert.strictEqual(game.isValidBid('cinch', 0), true)
    assert.strictEqual(game.isValidBid('invalid', 0), false)
  })

  test('should set trump suit correctly', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.highestBidder = game.players[0]

    const result = game.setTrump('♥')

    assert.strictEqual(result, true)
    assert.strictEqual(game.trumpSuit, '♥')
    assert.strictEqual(game.phase, 'discarding')
  })

  test('should reject invalid trump suit', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.highestBidder = game.players[0]

    const result = game.setTrump('invalid')

    assert.strictEqual(result, false)
    assert.strictEqual(game.trumpSuit, null)
  })

  test('should track game scores correctly', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 2

    // Test successful bid
    const scoreResults = { teamPoints: { 1: 3, 2: 1 } }
    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, true)
    assert.strictEqual(game.scores.team1, 3)
    assert.strictEqual(game.scores.team2, 1)
  })

  test('should handle failed bid scoring', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 3

    // Test failed bid
    const scoreResults = { teamPoints: { 1: 1, 2: 2 } }
    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, false)
    assert.strictEqual(game.scores.team1, -3) // Lose bid amount
    assert.strictEqual(game.scores.team2, 2) // Get their points
  })
})

describe('Constants', () => {
  test('should have correct BID_VALUES', () => {
    assert.strictEqual(BID_VALUES.pass, 0)
    assert.strictEqual(BID_VALUES['1'], 1)
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
