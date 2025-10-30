import { describe, test } from 'node:test'
import assert from 'node:assert'
import { CinchGame } from '../lib/game.js'

describe('Basic Scoring Logic', () => {
  test('successful bid with normal points', () => {
    const game = new CinchGame()

    // Add 4 players
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Team 1 bids 2, earns 3 points
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 2
    const scoreResults = { teamPoints: { 1: 3, 2: 1 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, true, 'Bid should be successful')
    assert.strictEqual(game.scores.team1, 3, 'Team 1 should have 3 points')
    assert.strictEqual(game.scores.team2, 1, 'Team 2 should have 1 point')
  })

  test('successful bid with points capped at 4', () => {
    const game = new CinchGame()

    // Add 4 players
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Team 1 bids 2, earns 5 points (should be capped at 4)
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 2
    const scoreResults = { teamPoints: { 1: 5, 2: 1 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, true, 'Bid should be successful')
    assert.strictEqual(game.scores.team1, 4, 'Team 1 should be capped at 4 points')
    assert.strictEqual(game.scores.team2, 1, 'Team 2 should have 1 point')
  })

  test('failed bid results in negative points', () => {
    const game = new CinchGame()

    // Add 4 players
    for (let i = 0; i < 4; i++) {
      game.addPlayer(`id${i}`, `Player${i}`)
    }

    // Team 1 bids 3, earns only 1 point (fails bid)
    game.highestBidder = game.players[0] // Team 1
    game.bidContract = 3
    const scoreResults = { teamPoints: { 1: 1, 2: 2 } }

    const result = game.applyScore(scoreResults)

    assert.strictEqual(result.success, false, 'Bid should fail')
    assert.strictEqual(game.scores.team1, -3, 'Team 1 should lose bid amount (3 points)')
    assert.strictEqual(game.scores.team2, 2, 'Team 2 should keep their earned points')
  })
})
