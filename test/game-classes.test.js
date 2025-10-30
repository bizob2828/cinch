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
    assert.strictEqual(game.scores.team1, 3) // Gets their earned points
    assert.strictEqual(game.scores.team2, 1) // Non-bidding team gets their points
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
    assert.strictEqual(game.scores.team2, 2) // Non-bidding team gets their points
  })

  test('should handle cinch bid with all 4 points (gets 11 points)', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 11 // Cinch bid

    // Test cinch bid where team gets all 4 points
    const scoreResults = { teamPoints: { 1: 4, 2: 0 } } // Team 1 got all 4 points
    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, true)
    assert.strictEqual(game.scores.team1, 11) // Gets 11 points for cinch with all 4
    assert.strictEqual(game.scores.team2, 0) // Non-bidding team gets their points
    assert.strictEqual(result.pointsAwarded, 11) // Verify return value
  })

  test('should handle failed cinch bid (less than 4 points)', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 11 // Cinch bid

    // Test cinch bid where team gets only 3 points (fails cinch requirement)
    const scoreResults = { teamPoints: { 1: 3, 2: 1 } } // Team 1 got 3 points
    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, false) // Failed because cinch requires all 4 points
    assert.strictEqual(game.scores.team1, -11) // Loses bid amount
    assert.strictEqual(game.scores.team2, 1) // Non-bidding team gets their points
  })

  test('should handle game reset', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.phase = 'playing'
    game.currentBid = 3
    game.scores.team1 = 10

    game.reset()

    assert.strictEqual(game.players.length, 0)
    assert.strictEqual(game.phase, 'waiting')
    assert.strictEqual(game.currentBid, 0)
    assert.strictEqual(game.scores.team1, 0)
    assert.strictEqual(game.dealer, -1)
    assert.strictEqual(game.isFirstHand, true)
  })

  test('should remove all players', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.removeAllPlayers()
    assert.strictEqual(game.players.length, 0)
  })

  test('should start new hand and rotate dealer', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Start first hand
    game.startNewHand()
    assert.strictEqual(game.dealer, 0)
    assert.strictEqual(game.phase, 'bidding')
    assert.strictEqual(game.currentPlayer, 1) // Left of dealer starts bidding
    assert.strictEqual(game.isFirstHand, false)

    // Start second hand - dealer should rotate
    game.startNewHand()
    assert.strictEqual(game.dealer, 1)
    assert.strictEqual(game.currentPlayer, 2) // Left of new dealer
  })

  test('should deal cards to players', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.dealCards(6)

    // Each player should have 6 cards
    game.players.forEach(player => {
      assert.strictEqual(player.hand.size(), 6)
    })

    // Deck should have remaining cards
    assert.strictEqual(game.deck.size(), 52 - (4 * 6))
  })

  test('should deal new cards to fill hands', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Deal initial cards
    game.dealCards(3)

    // Deal new cards to fill to 6
    game.dealNewCards()

    game.players.forEach(player => {
      assert.strictEqual(player.hand.size(), 6)
    })
  })

  test('should get player by id', () => {
    game.addPlayer('test-id', 'TestPlayer')

    const player = game.getPlayer('test-id')
    assert.strictEqual(player.id, 'test-id')
    assert.strictEqual(player.name, 'TestPlayer')

    const notFound = game.getPlayer('nonexistent')
    assert.strictEqual(notFound, undefined)
  })

  test('should get current player and advance', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    const firstPlayer = game.getCurrentPlayer()
    assert.strictEqual(firstPlayer.seat, 0)

    game.nextPlayer()
    const secondPlayer = game.getCurrentPlayer()
    assert.strictEqual(secondPlayer.seat, 1)

    // Test wrapping around
    game.currentPlayer = 3
    game.nextPlayer()
    assert.strictEqual(game.currentPlayer, 0)
  })

  test('should handle bidding process', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    const player0 = game.players[0]

    // First bid
    let result = game.processBid(player0, '2')
    assert.strictEqual(result.finished, false)
    assert.strictEqual(game.currentBid, 2)
    assert.strictEqual(game.highestBidder, player0)
    assert.strictEqual(game.currentPlayer, 1)

    // Pass bids
    game.processBid(game.players[1], 'pass')
    game.processBid(game.players[2], 'pass')
    result = game.processBid(game.players[3], 'pass')

    // Should finish bidding after 4 bids
    assert.strictEqual(result.finished, true)
    assert.strictEqual(game.phase, 'chooseTrump')
  })

  test('should handle cinch bidding with override', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    const player0 = game.players[0] // Team 1

    // Player 0 bids cinch early
    let result = game.processBid(player0, 'cinch')

    assert.strictEqual(result.finished, false)
    assert.strictEqual(result.cinchOverride, true)
    assert.strictEqual(result.cinchOffered, true)
    assert.strictEqual(game.cinchBidder, player0)
    assert.strictEqual(game.cinchOverridePhase, true)

    // Opposing team member (player 1, team 2) passes
    result = game.processBid(game.players[1], 'pass')
    assert.strictEqual(result.finished, false)
    assert.strictEqual(result.cinchOverride, true)

    // Second opposing team member (player 3, team 2) passes
    result = game.processBid(game.players[3], 'pass')
    assert.strictEqual(result.finished, true)
    assert.strictEqual(result.overrideSuccessful, false)
  })

  test('should handle cinch override successful', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    const player0 = game.players[0] // Team 1
    const player1 = game.players[1] // Team 2

    // Player 0 bids cinch
    game.processBid(player0, 'cinch')

    // Player 1 overrides with cinch
    const result = game.processBid(player1, 'cinch')

    assert.strictEqual(result.finished, true)
    assert.strictEqual(result.overrideSuccessful, true)
    assert.strictEqual(game.highestBidder, player1)
    assert.strictEqual(game.cinchBidder, player1)
  })

  test('should validate card play', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.phase = 'playing'
    game.currentPlayer = 0

    const player = game.players[0]
    player.addCardToHand(new Card('♥', 'A'))
    player.addCardToHand(new Card('♠', 'K'))

    // Valid play
    let validation = game.canPlayCard(player, 0)
    assert.strictEqual(validation.valid, true)

    // Invalid - not player's turn
    validation = game.canPlayCard(game.players[1], 0)
    assert.strictEqual(validation.valid, false)
    assert.strictEqual(validation.reason, 'Not your turn')

    // Invalid card index
    validation = game.canPlayCard(player, 5)
    assert.strictEqual(validation.valid, false)
    assert.strictEqual(validation.reason, 'Invalid card index')
  })

  test('should enforce suit following rules', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.phase = 'playing'
    game.currentPlayer = 1

    const player1 = game.players[1]
    player1.addCardToHand(new Card('♥', 'A')) // Has hearts
    player1.addCardToHand(new Card('♠', 'K')) // Also has spades

    // First player plays hearts
    game.trickPlays.push({ seat: 0, card: new Card('♥', 'Q'), name: 'Player0' })

    // Must follow suit if possible
    let validation = game.canPlayCard(player1, 1) // Try to play spades
    assert.strictEqual(validation.valid, false)
    assert.strictEqual(validation.reason, 'You must follow suit (♥) if you have one.')

    // Can play hearts
    validation = game.canPlayCard(player1, 0) // Play hearts
    assert.strictEqual(validation.valid, true)
  })

  test('should handle playing cards and tricks', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.phase = 'playing'
    game.trumpSuit = '♠'

    // Add cards to players
    game.players.forEach((player, i) => {
      player.addCardToHand(new Card('♥', ['A', 'K', 'Q', 'J'][i]))
    })

    // Players play cards
    let result = game.playCard(game.players[0], 0) // Ace of hearts
    assert.strictEqual(result.trickComplete, false)
    assert.strictEqual(game.trickPlays.length, 1)
    assert.strictEqual(game.currentPlayer, 1)

    game.playCard(game.players[1], 0) // King of hearts
    game.playCard(game.players[2], 0) // Queen of hearts
    result = game.playCard(game.players[3], 0) // Jack of hearts

    // Trick should be complete
    assert.strictEqual(result.trickComplete, true)
    assert.strictEqual(game.trickPlays.length, 0) // Cleared after trick

    // Player 0 should have won (highest card in suit)
    assert.strictEqual(result.winner.seat, 0)
    assert.strictEqual(game.currentPlayer, 0) // Winner leads next trick
  })

  test('should resolve tricks correctly with trump', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.trumpSuit = '♠'

    // Set up trick plays: hearts led, but spades (trump) played
    game.trickPlays = [
      { seat: 0, card: new Card('♥', 'A'), name: 'Player0' }, // High heart
      { seat: 1, card: new Card('♥', 'K'), name: 'Player1' }, // Lower heart
      { seat: 2, card: new Card('♠', '2'), name: 'Player2' }, // Low trump
      { seat: 3, card: new Card('♥', 'Q'), name: 'Player3' } // Lower heart
    ]

    const winner = game.resolveTrick()
    assert.strictEqual(winner.seat, 2) // Trump wins even if low
  })

  test('should detect hand completion', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Players have cards
    game.players[0].addCardToHand(new Card('♥', 'A'))
    assert.strictEqual(game.isHandComplete(), false)

    // All players have empty hands
    game.players.forEach(player => {
      while (!player.hand.isEmpty()) {
        player.hand.removeCard(0)
      }
    })
    assert.strictEqual(game.isHandComplete(), true)
  })

  test('should calculate scoring correctly', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.trumpSuit = '♠'

    // Set up won cards for scoring
    // Team 1 (players 0,2) gets high and jack
    game.players[0].addWonCards([new Card('♠', 'A')]) // High trump
    game.players[2].addWonCards([new Card('♠', 'J')]) // Jack of trump

    // Team 2 (players 1,3) gets low and game points
    game.players[1].addWonCards([new Card('♠', '2')]) // Low trump
    game.players[3].addWonCards([new Card('♥', '10'), new Card('♦', 'A')]) // Game points

    const results = game.calculateScore()

    assert.strictEqual(results.teamPoints[1], 2) // High + Jack
    assert.strictEqual(results.teamPoints[2], 2) // Low + Game
    assert.strictEqual(results.high.team, 1)
    assert.strictEqual(results.low.team, 2)
    assert.strictEqual(results.jack.team, 1)
    assert.strictEqual(results.game.team, 2)
  })

  test('should find card team helper', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    const testCard = new Card('♠', 'A')
    game.players[1].addWonCards([testCard])

    const team = game.findCardTeam(testCard)
    assert.strictEqual(team, 2) // Player 1 is on team 2

    const notFoundTeam = game.findCardTeam(new Card('♥', 'K'))
    assert.strictEqual(notFoundTeam, null)
  })

  test('should handle cinch bid at end of normal bidding', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // First 3 bids
    game.processBid(game.players[0], 'pass')
    game.processBid(game.players[1], 'pass')
    game.processBid(game.players[2], '2')

    // 4th bid is cinch - should go straight to trump selection
    const result = game.processBid(game.players[3], 'cinch')

    assert.strictEqual(result.finished, true)
    assert.strictEqual(game.phase, 'chooseTrump')
    assert.strictEqual(game.cinchBidder, game.players[3])
  })

  test('should handle trump card winning over off-suit', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.trumpSuit = '♠'

    // Hearts led, but trump beats it
    game.trickPlays = [
      { seat: 0, card: new Card('♥', 'A'), name: 'Player0' }, // High off-suit
      { seat: 1, card: new Card('♠', '2'), name: 'Player1' } // Low trump
    ]

    const winner = game.resolveTrick()
    assert.strictEqual(winner.seat, 1) // Trump wins
  })

  test('should handle same suit comparison in tricks', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.trumpSuit = '♠'

    // All hearts played
    game.trickPlays = [
      { seat: 0, card: new Card('♥', 'K'), name: 'Player0' },
      { seat: 1, card: new Card('♥', 'A'), name: 'Player1' } // Higher rank
    ]

    const winner = game.resolveTrick()
    assert.strictEqual(winner.seat, 1) // Ace beats King
  })

  test('should handle tied game points', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.trumpSuit = '♠'

    // Set up truly tied game points
    game.players[0].addWonCards([new Card('♥', '10')]) // Team 1: 10 points
    game.players[1].addWonCards([new Card('♣', '10')]) // Team 2: 10 points
    // Players 2 and 3 get nothing, so final totals are 10-10

    const results = game.calculateScore()

    assert.strictEqual(results.game.team, null) // Tied game
    assert.strictEqual(results.game.points[1], 10)
    assert.strictEqual(results.game.points[2], 10)
  })

  test('should handle game with no trump cards played', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.trumpSuit = '♠'

    // No trump cards played, only off-suit cards
    game.players[0].addWonCards([new Card('♥', '10')]) // Team 1: 10 points
    game.players[1].addWonCards([new Card('♣', 'A')]) // Team 2: 4 points

    const results = game.calculateScore()

    // Should have no high, low, or jack points since no trump played
    assert.strictEqual(results.high, null)
    assert.strictEqual(results.low, null)
    assert.strictEqual(results.jack, null)

    // Team 1 should win game point
    assert.strictEqual(results.game.team, 1)
    assert.strictEqual(results.teamPoints[1], 1) // Only game point
    assert.strictEqual(results.teamPoints[2], 0)
  })

  test('should handle findNextOpposingTeamMember edge case', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Set up a scenario where we need to wrap around to find opposing member
    game.cinchBidder = game.players[0] // Team 1 (seats 0, 2)
    game.currentPlayer = 2 // Start from team 1 member (seat 2)

    game.findNextOpposingTeamMember()

    // Should find player 3 (next opposing team member - team 2)
    assert.strictEqual(game.currentPlayer, 3)
  })

  test('should handle findNextOpposingTeamMember with wrapping', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Test scenario where the while loop must iterate multiple times
    // Team 1 cinch bidder (seats 0, 2), start from seat 1 (team 2)
    game.cinchBidder = game.players[0] // Team 1 (seats 0, 2)
    game.currentPlayer = 1 // Start from seat 1 (team 2)

    game.findNextOpposingTeamMember()

    // Next player after 1 is 2 (team 1, same as cinch), then 3 (team 2, different)
    // So the while loop should iterate once: nextPlayer starts as 2, then becomes 3
    assert.strictEqual(game.currentPlayer, 3)
  })

  test('should handle findCardTeam when card not found', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Add some cards to players but not the one we're looking for
    game.players[0].addWonCards([new Card('♥', 'A')])
    game.players[1].addWonCards([new Card('♠', 'K')])

    // Look for a card that no player has
    const result = game.findCardTeam(new Card('♦', 'Q'))
    assert.strictEqual(result, null)
  })

  test('should handle high trump card selection correctly', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    game.trumpSuit = '♠'

    // Set up trump cards where the first card is already the highest
    // This should trigger the else branch in the reduce ternary operator
    game.players[0].addWonCards([new Card('♠', 'A')]) // Highest trump first
    game.players[1].addWonCards([new Card('♠', 'K')]) // Lower trump second

    const results = game.calculateScore()

    assert.strictEqual(results.high.team, 1) // Team 1 has high trump
    assert.strictEqual(results.high.card.rank, 'A')
    assert.strictEqual(results.teamPoints[1], 2) // High + Low
  })
})

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
