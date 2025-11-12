import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { Card } from '../lib/card.js'
import { Deck } from '../lib/deck.js'
import { CinchGame } from '../lib/game.js'

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

    game.dealCards()

    // Each player should have 9 cards
    game.players.forEach(player => {
      assert.strictEqual(player.hand.size(), 9)
    })

    // Deck should have remaining cards
    assert.strictEqual(game.deck.size(), 52 - (4 * 9))
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
    game.startNewHand() // Sets dealer to 0, bidding starts with player 1

    const player1 = game.players[1] // Team 2, current bidder
    const player0 = game.players[0] // Team 1, dealer

    // Player 1 bids cinch - dealer (player 0, team 1) can override
    let result = game.processBid(player1, 'cinch')

    assert.strictEqual(result.finished, false)
    assert.strictEqual(result.cinchOverride, true)
    assert.strictEqual(result.cinchOffered, true)
    assert.strictEqual(game.cinchBidder, player1)
    assert.strictEqual(game.cinchOverridePhase, true)

    // Dealer (player 0, team 1) passes
    result = game.processBid(player0, 'pass')
    assert.strictEqual(result.finished, true)
    assert.strictEqual(result.overrideSuccessful, false)
  })

  test('should handle cinch override successful', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand() // Sets dealer to 0, bidding starts with player 1

    const player0 = game.players[0] // Team 1, dealer
    const player1 = game.players[1] // Team 2

    // Player 1 bids cinch - dealer (player 0) can override
    game.processBid(player1, 'cinch')

    // Dealer (player 0) overrides with cinch
    const result = game.processBid(player0, 'cinch')

    assert.strictEqual(result.finished, true)
    assert.strictEqual(result.overrideSuccessful, true)
    assert.strictEqual(game.highestBidder, player0)
    assert.strictEqual(game.cinchBidder, player0)
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

  test('should cap normal bids at 4 points maximum', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Team 1 bids 2, earns all 4 points (but not cinch)
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 2
    const scoreResults = { teamPoints: { 1: 4, 2: 0 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.biddingTeam, 1)
    assert.strictEqual(result.pointsAwarded, 4) // Normal bid gets 4 points, not 11
    assert.strictEqual(game.scores.team1, 4)
    assert.strictEqual(game.scores.team2, 0)
  })

  test('should handle team 2 winning bid', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Team 2 bids 3, earns 3 points
    game.highestBidder = game.players[1] // Team 2
    game.bidContract = 3
    const scoreResults = { teamPoints: { 1: 1, 2: 3 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.biddingTeam, 2)
    assert.strictEqual(result.pointsAwarded, 3)
    assert.strictEqual(game.scores.team1, 1) // Non-bidding team gets their points
    assert.strictEqual(game.scores.team2, 3)
  })

  test('should handle team 2 successful cinch', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Team 2 bids cinch, gets all 4 points
    game.highestBidder = game.players[1] // Team 2
    game.bidContract = 11 // Cinch
    const scoreResults = { teamPoints: { 1: 0, 2: 4 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.biddingTeam, 2)
    assert.strictEqual(result.pointsAwarded, 11)
    assert.strictEqual(game.scores.team1, 0)
    assert.strictEqual(game.scores.team2, 11)
  })

  test('should prevent cinch counter-bid from players who already bid', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand() // Dealer is 0 (team 1), bidding starts with player 1

    // Player 1 (team 2) bids 2
    game.processBid(game.players[1], '2')

    // Player 2 (team 1) bids 3
    game.processBid(game.players[2], '3')

    // Player 3 (team 2) bids cinch - dealer (player 0, team 1) can counter
    let result = game.processBid(game.players[3], 'cinch')
    assert.strictEqual(result.finished, false)
    assert.strictEqual(result.cinchOverride, true)
    assert.strictEqual(result.cinchOffered, true)

    // Dealer (player 0, team 1) hasn't bid yet, so should be able to counter cinch
    result = game.processBid(game.players[0], 'cinch')
    assert.strictEqual(result.finished, true)
    assert.strictEqual(result.overrideSuccessful, true)

    // Reset and test the restriction
    game.reset()
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand() // Dealer is 0 (team 1)

    // Player 0 (dealer, team 1) bids 2 first
    game.processBid(game.players[0], '2')

    // Player 1 (team 2) bids cinch - should not trigger override since dealer already bid
    result = game.processBid(game.players[1], 'cinch')
    assert.strictEqual(result.finished, true)
    assert.strictEqual(result.cinchOverride, undefined)

    // Manually test what happens if player 0 (who already bid) tries to counter
    // This simulates the restriction - we need to manually check the playersBid set
    assert.strictEqual(game.playersBid.has(game.players[0].seat), true)

    // Only the dealer can counter, and since dealer already bid, no eligible players
    const eligiblePlayers = game.getEligibleOpposingPlayers()
    assert.strictEqual(eligiblePlayers.length, 0) // Dealer already bid
  })

  test('should clear cinch override state between hands', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand() // Dealer is 0 (team 1), bidding starts with player 1

    // Player 1 bids cinch, dealer (player 0) can override
    let result = game.processBid(game.players[1], 'cinch')
    assert.strictEqual(result.finished, false)
    assert.strictEqual(result.cinchOverride, true)
    assert.strictEqual(game.cinchOverridePhase, true)
    assert.strictEqual(game.overrideAttempts, 0)

    // Dealer (player 0) passes (no counter)
    result = game.processBid(game.players[0], 'pass')

    // Verify override state is cleared when finished
    assert.strictEqual(result.finished, true)
    assert.strictEqual(game.cinchOverridePhase, false)
    assert.strictEqual(game.overrideAttempts, 0)

    // Start a new hand - override state should definitely be cleared
    game.startNewHand()
    assert.strictEqual(game.cinchOverridePhase, false)
    assert.strictEqual(game.overrideAttempts, 0)
    assert.strictEqual(game.playersBid.size, 0)
  })

  test('should detect game completion when team reaches 21 points', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Initially game should not be complete
    assert.strictEqual(game.isGameComplete(), false)
    assert.strictEqual(game.getWinningTeam(), null)

    // Set team 1 to 20 points - still not complete
    game.scores.team1 = 20
    game.scores.team2 = 15
    assert.strictEqual(game.isGameComplete(), false)
    assert.strictEqual(game.getWinningTeam(), null)

    // Set team 1 to 21 points - game should be complete
    game.scores.team1 = 21
    assert.strictEqual(game.isGameComplete(), true)
    assert.strictEqual(game.getWinningTeam(), 1)

    // Test team 2 winning
    game.scores.team1 = 18
    game.scores.team2 = 22
    assert.strictEqual(game.isGameComplete(), true)
    assert.strictEqual(game.getWinningTeam(), 2)

    // Test tie at 21
    game.scores.team1 = 21
    game.scores.team2 = 21
    assert.strictEqual(game.isGameComplete(), true)
    assert.strictEqual(game.getWinningTeam(), null)

    // Test higher score wins when both over 21
    game.scores.team1 = 23
    game.scores.team2 = 21
    assert.strictEqual(game.isGameComplete(), true)
    assert.strictEqual(game.getWinningTeam(), 1)
  })

  test('should handle game reset properly', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Set up some game state
    game.scores.team1 = 15
    game.scores.team2 = 12
    game.currentBid = 3
    game.phase = 'playing'
    game.trumpSuit = '♠'

    // Verify initial state is set
    assert.strictEqual(game.players.length, 4)
    assert.strictEqual(game.scores.team1, 15)
    assert.strictEqual(game.scores.team2, 12)
    assert.strictEqual(game.currentBid, 3)
    assert.strictEqual(game.phase, 'playing')
    assert.strictEqual(game.trumpSuit, '♠')

    // Reset the game
    game.reset()

    // Verify everything is reset to initial state
    assert.strictEqual(game.players.length, 0)
    assert.strictEqual(game.scores.team1, 0)
    assert.strictEqual(game.scores.team2, 0)
    assert.strictEqual(game.currentBid, 0)
    assert.strictEqual(game.phase, 'waiting')
    assert.strictEqual(game.trumpSuit, null)
    assert.strictEqual(game.isGameComplete(), false)
    assert.strictEqual(game.getWinningTeam(), null)
  })

  test('should preserve players when using resetGameKeepPlayers pattern', () => {
    // Add players to game
    const originalPlayers = []
    for (let i = 0; i < 4; i++) {
      const player = game.addPlayer(`id${i}`, `Player${i}`)
      originalPlayers.push({ id: player.id, name: player.name, seat: player.seat, team: player.team })
    }

    // Set up some game state
    game.scores.team1 = 15
    game.scores.team2 = 12
    game.currentBid = 3
    game.phase = 'playing'
    game.trumpSuit = '♠'

    // Verify initial state
    assert.strictEqual(game.players.length, 4)
    assert.strictEqual(game.scores.team1, 15)

    // Simulate the resetGameKeepPlayers logic
    const currentPlayers = [...game.players]
    game.reset()

    // Re-add the same players
    currentPlayers.forEach(player => {
      if (player) {
        game.addPlayer(player.id, player.name)
      }
    })

    // Verify players are preserved with same teams and seats
    assert.strictEqual(game.players.length, 4)
    for (let i = 0; i < 4; i++) {
      assert.strictEqual(game.players[i].id, originalPlayers[i].id)
      assert.strictEqual(game.players[i].name, originalPlayers[i].name)
      assert.strictEqual(game.players[i].seat, originalPlayers[i].seat)
      assert.strictEqual(game.players[i].team, originalPlayers[i].team)
    }

    // Verify game state is reset
    assert.strictEqual(game.scores.team1, 0)
    assert.strictEqual(game.scores.team2, 0)
    assert.strictEqual(game.currentBid, 0)
    assert.strictEqual(game.phase, 'waiting')
    assert.strictEqual(game.trumpSuit, null)
  })

  test('should prevent cinch counter-bid from player who already bid', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand() // Dealer is 0 (team 1), bidding starts with player 1

    const player0 = game.players[0] // Team 1, dealer
    const player1 = game.players[1] // Team 2

    // Player 0 (dealer) makes a normal bid first
    game.processBid(player0, '2')
    assert.ok(game.playersBid.has(player0.seat))

    // Player 1 bids cinch - dealer already bid, so no override offered
    const result = game.processBid(player1, 'cinch')
    assert.strictEqual(result.cinchOverride, undefined)
    assert.strictEqual(result.finished, true)

    // The cinch bidder should be player 1
    assert.strictEqual(game.cinchBidder, player1)
    assert.strictEqual(game.highestBidder, player1)
  })

  test('should handle cinch with no eligible opposing players', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand() // Dealer is 0 (team 1), bidding starts with player 1

    const player0 = game.players[0] // Team 1, dealer
    const player1 = game.players[1] // Team 2

    // Dealer (player 0) bids first
    game.processBid(player0, '2')

    // Verify dealer has bid
    assert.ok(game.playersBid.has(player0.seat))

    // Player 1 bids cinch - dealer already bid, so no override offered
    const result = game.processBid(player1, 'cinch')

    assert.strictEqual(result.finished, true)
    assert.strictEqual(result.cinchOverride, undefined) // No override offered
    assert.strictEqual(game.phase, 'chooseTrump')
    assert.strictEqual(game.cinchOverridePhase, false)
    assert.strictEqual(game.cinchBidder, player1)
    assert.strictEqual(game.highestBidder, player1)
  })

  test('should handle findNextEligibleOpposingTeamMember with no eligible players', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand() // Dealer is 0 (team 1)

    const player0 = game.players[0] // Team 1, dealer
    const player1 = game.players[1] // Team 2

    // Mark dealer as having bid
    game.playersBid.add(player0.seat)

    // Set up cinch override phase with player 1 as cinch bidder
    game.cinchOverridePhase = true
    game.cinchBidder = player1
    game.currentPlayer = 1

    // Call findNextEligibleOpposingTeamMember when no players are eligible
    // Since dealer already bid, this should return early without changing currentPlayer
    const originalCurrentPlayer = game.currentPlayer
    game.findNextEligibleOpposingTeamMember()

    // Should return early and not change current player
    assert.strictEqual(game.currentPlayer, originalCurrentPlayer)
  })

  test('should handle tie game completion when both teams reach 21', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Set both teams to exactly 21 points
    game.scores.team1 = 21
    game.scores.team2 = 21

    // Both teams at 21 with equal scores should return null (tie)
    const winner = game.getWinningTeam()
    assert.strictEqual(winner, null)

    // Set team1 higher
    game.scores.team1 = 22
    game.scores.team2 = 21
    const winner1 = game.getWinningTeam()
    assert.strictEqual(winner1, 1)

    // Set team2 higher
    game.scores.team1 = 21
    game.scores.team2 = 22
    const winner2 = game.getWinningTeam()
    assert.strictEqual(winner2, 2)
  })

  test('should handle hand scoring with no trump cards played', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Set trump suit to spades
    game.trumpSuit = '♠'

    // Add only non-trump cards to players' won cards
    // This tests the conditional at line 359 where trumpCards.length === 0
    game.players[0].addWonCards([new Card('♥', 'A')]) // High non-trump
    game.players[1].addWonCards([new Card('♦', 'K')]) // Another non-trump
    game.players[2].addWonCards([new Card('♣', '10')]) // Game value card
    game.players[3].addWonCards([new Card('♥', '5')]) // Low value card

    const results = game.calculateScore()

    // Should have no high trump since no trump cards were played
    assert.strictEqual(results.high, null)
    assert.strictEqual(results.low, null) // Also no low trump
    assert.strictEqual(results.jack, null) // Also no jack of trump

    // But should still calculate game points from non-trump cards
    assert.ok(results.game) // Game point should still be awarded
    assert.ok(results.teamPoints[1] > 0 || results.teamPoints[2] > 0) // Someone gets points
  })

  test('should correctly compare trump card ranks in high trump calculation', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Set trump suit
    game.trumpSuit = '♠'

    // Add multiple trump cards to test the comparison logic in reduce function
    // This should test the exact branch condition at line 359
    game.players[0].addWonCards([new Card('♠', '10')]) // Lower trump
    game.players[1].addWonCards([new Card('♠', 'A')]) // Higher trump - should win
    game.players[2].addWonCards([new Card('♠', '5')]) // Even lower trump

    const results = game.calculateScore()

    // The Ace of Spades should be the high trump
    assert.strictEqual(results.high.card.rank, 'A')
    assert.strictEqual(results.high.card.suit, '♠')
    assert.strictEqual(results.high.team, 2) // Player 1 is on team 2
  })

  test('should handle dealNewCards when deck runs out', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Create a nearly empty deck by dealing most cards
    game.deck = new Deck()
    // Deal out most cards so only a few remain
    for (let i = 0; i < 50; i++) {
      game.deck.deal(1)
    }

    // Give each player some cards
    game.players.forEach(player => {
      player.addCardToHand(new Card('♥', 'A'))
    })

    // Now try to deal new cards - should handle empty deck gracefully
    game.dealNewCards()

    // Players should have received cards up to the deck limit
    // This tests the conditional at lines 140-143 where deck.isEmpty() is checked
    assert.ok(true) // Test passes if no error thrown
  })

  test('should handle cinch override when player already bid', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand() // Dealer is 0 (team 1), bidding starts with player 1

    const player0 = game.players[0] // Team 1, dealer
    const player1 = game.players[1] // Team 2

    // Player 0 (dealer) bids first
    game.processBid(player0, '2')

    // Manually set up cinch override phase where player 0 tries to counter
    // even though they already bid (edge case testing lines 200-203)
    game.cinchOverridePhase = true
    game.cinchBidder = player1
    game.cinchBidder.team = 2
    game.currentPlayer = 0

    // Player 0 tries to counter with cinch (but already bid)
    const result = game.processBid(player0, 'cinch')

    // Should return error indicating player already bid
    assert.strictEqual(result.finished, false)
    assert.strictEqual(result.cinchOverride, true)
    assert.strictEqual(result.error, 'Player has already bid this hand')
  })

  test('should handle pass during cinch override to next eligible player', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand() // Dealer is 0 (team 1), bidding starts with player 1

    const player0 = game.players[0] // Team 1, dealer
    const player1 = game.players[1] // Team 2

    // Player 1 bids cinch - dealer (player 0) can override
    let result = game.processBid(player1, 'cinch')
    assert.strictEqual(result.cinchOverride, true)
    assert.strictEqual(game.cinchOverridePhase, true)

    // Dealer passes - this should test lines 222-224
    result = game.processBid(player0, 'pass')

    // Should be finished since only dealer can override
    assert.strictEqual(result.finished, true)
    assert.strictEqual(result.cinchOverride, true)
    assert.strictEqual(result.overrideSuccessful, false)
  })

  test('should handle getEligibleOpposingPlayers with invalid dealer index', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Set up cinch bidder but don't start hand (dealer will be -1)
    game.cinchBidder = game.players[0]

    // This should test lines 290-292 where dealer < 0
    const eligible = game.getEligibleOpposingPlayers()
    assert.strictEqual(eligible.length, 0)

    // Test with dealer >= players.length
    game.dealer = 10
    const eligible2 = game.getEligibleOpposingPlayers()
    assert.strictEqual(eligible2.length, 0)
  })

  test('should handle getEligibleOpposingPlayers with null dealer', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Set dealer to valid index but make that slot null
    game.dealer = 2
    game.players[2] = null
    game.cinchBidder = game.players[0]

    // This should test lines 297-299 where dealer is null
    const eligible = game.getEligibleOpposingPlayers()
    assert.strictEqual(eligible.length, 0)
  })

  test('should handle multiple eligible players during cinch override', () => {
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
    game.startNewHand()

    const player1 = game.players[1] // Team 2

    // Manually create a scenario where multiple passes happen
    // Set up cinch override phase
    game.cinchOverridePhase = true
    game.cinchBidder = player1
    game.currentPlayer = 0
    game.overrideAttempts = 0
    game.dealer = 0

    // Mock getEligibleOpposingPlayers to return multiple players temporarily
    const originalMethod = game.getEligibleOpposingPlayers.bind(game)
    let callCount = 0
    game.getEligibleOpposingPlayers = () => {
      callCount++
      // First call returns 2 players to test the continue path
      if (callCount === 1) {
        return [game.players[0], game.players[2]]
      }
      // Subsequent calls use original logic
      return originalMethod()
    }

    // First pass should continue to next player (tests lines 222-224)
    const result = game.processBid(game.players[0], 'pass')

    // Restore original method
    game.getEligibleOpposingPlayers = originalMethod

    // Should not be finished, should continue override
    assert.strictEqual(result.finished, false)
    assert.strictEqual(result.cinchOverride, true)
  })
})
