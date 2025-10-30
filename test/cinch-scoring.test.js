import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { CinchGame } from '../lib/game.js'

describe('Cinch Scoring Logic', () => {
  let game

  beforeEach(() => {
    game = new CinchGame()
    // Add 4 players for each test
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }
  })

  test('should handle normal bid with earned points', () => {
    // Team 1 bids 2, earns 3 points
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 2
    const scoreResults = { teamPoints: { 1: 3, 2: 1 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.biddingTeam, 1)
    assert.strictEqual(result.pointsAwarded, 3)
    assert.strictEqual(game.scores.team1, 3)
    assert.strictEqual(game.scores.team2, 1)
  })

  test('should handle successful cinch bid (all 4 points gets 11)', () => {
    // Team 1 bids cinch, gets all 4 points
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 11 // Cinch
    const scoreResults = { teamPoints: { 1: 4, 2: 0 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.biddingTeam, 1)
    assert.strictEqual(result.pointsAwarded, 11)
    assert.strictEqual(game.scores.team1, 11)
    assert.strictEqual(game.scores.team2, 0)
  })

  test('should handle failed cinch bid (less than 4 points)', () => {
    // Team 1 bids cinch, gets only 3 points
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 11 // Cinch
    const scoreResults = { teamPoints: { 1: 3, 2: 1 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, false)
    assert.strictEqual(result.biddingTeam, 1)
    assert.strictEqual(game.scores.team1, -11) // Loses bid amount
    assert.strictEqual(game.scores.team2, 1) // Non-bidding team gets their points
  })

  test('should handle normal bid failure', () => {
    // Team 1 bids 3, gets only 2 points
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 3
    const scoreResults = { teamPoints: { 1: 2, 2: 2 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, false)
    assert.strictEqual(result.biddingTeam, 1)
    assert.strictEqual(game.scores.team1, -3) // Loses bid amount
    assert.strictEqual(game.scores.team2, 2) // Non-bidding team gets their points
  })

  test('should cap normal bids at 4 points maximum', () => {
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
})
