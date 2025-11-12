// server.js
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { CinchGame } from './lib/game.js'
import { SUITS, BID_VALUES } from './lib/constants.js'
const origin = process.env.ORIGIN || 'http://localhost:3000'

const app = express()
const server = http.createServer(app)
// The CORS origin is here to deploy on Render.com
// Make sure to adjust it to your deployment URL
// I may set this as an environment variable later
const io = new Server(server, {
  cors: {
    origin,
    methods: ['GET', 'POST']
  }
})
app.use(express.static('public'))

const PORT = process.env.PORT || 3000

// Game state
let game = null

// Helper function to get team color name
function getTeamName (teamNumber) {
  return teamNumber === 1 ? 'Blue Team' : 'Red Team'
}

// Initialize game
game = new CinchGame()

io.on('connection', socket => {
  // Register game event handlers for this socket (before rejoin/register)
  socket.on('bid', bid => handleBid(socket, bid))
  socket.on('chooseTrump', suit => handleTrump(socket, suit))
  socket.on('discardCards', indices => handleDiscard(socket, indices))
  socket.on('playCard', index => handlePlay(socket, index))
  socket.on('nextHand', () => {
    if (game.players.length === 4) {
      // Hide modal for all players before starting new hand
      io.emit('hideHandResultModal')
      startNewHand()
    }
  })
  socket.on('endGame', () => {
    io.emit('message', '🔄 Game ended by player request. Returning to login...')
    // Clear all game state and send players back to login
    game.reset()
    io.emit('gameEnded')
  })

  // Handle rejoin attempts
  socket.on('rejoinGame', session => {
    // Find player by session ID
    const existingPlayer = game.players.find(p => p && p.sessionId === session.sessionId)

    if (existingPlayer) {
      // Update socket ID for reconnected player
      existingPlayer.id = socket.id

      socket.emit('rejoinSuccess', {
        team: existingPlayer.team,
        name: existingPlayer.name,
        position: existingPlayer.seat
      })

      // Send current game state
      socket.emit('playerJoined', {
        players: game.players.map(p => p ? { name: p.name, team: p.team, seat: p.seat } : null)
      })

      // Send current hand if in progress
      if (existingPlayer.hand.size() > 0) {
        socket.emit('yourHand', existingPlayer.hand.toArray())
      }

      // Send current trump if set
      if (game.trumpSuit) {
        socket.emit('trumpSelected', game.trumpSuit)
      }

      // Send current scores
      socket.emit('scoreUpdate', game.scores)

      // Send current bid info if in bidding or later phase
      if (game.currentBid > 0 || game.highestBidder !== null) {
        socket.emit('bidUpdate', {
          currentBid: game.currentBid,
          highestBidder: game.highestBidder,
          bidContract: game.bidContract,
          bidderTeam: game.bidderTeam
        })
      }

      // Send current trick plays if in play phase
      if (game.trickPlays && game.trickPlays.length > 0) {
        socket.emit('trickUpdate', { trickPlays: game.trickPlays })
      }

      // If it's this player's turn, notify them
      if (game.currentPlayer === existingPlayer.seat) {
        if (game.phase === 'bidding') {
          const validBids = Object.keys(BID_VALUES).filter(b => BID_VALUES[b] > game.currentBid || b === 'pass')
          const cinchOverride = game.cinchOverride || false
          socket.emit('yourTurn', {
            phase: 'bidding',
            currentPlayer: game.currentPlayer,
            validBids,
            currentBid: game.currentBid,
            cinchOverride
          })
        } else if (game.phase === 'playing') {
          socket.emit('yourTurn', {
            phase: 'play',
            currentPlayer: game.currentPlayer
          })
        } else if (game.phase === 'chooseTrump') {
          socket.emit('chooseTrump', SUITS)
        }
      }

      io.emit('message', `🔄 ${existingPlayer.name} reconnected.`)
    } else {
      // Session not found or expired
      socket.emit('rejoinFailed')
    }
  })

  socket.on('registerName', data => {
    const { name, sessionId } = typeof data === 'string' ? { name: data, sessionId: null } : data

    if (game.players.length >= 4) {
      socket.emit('message', '❌ Game is full. Try again later.')
      socket.disconnect()
      return
    }

    const player = game.addPlayer(socket.id, name)
    if (!player) {
      socket.emit('message', '❌ Game is full. Try again later.')
      socket.disconnect()
      return
    }

    // Store session ID
    player.sessionId = sessionId

    socket.emit('welcome', { team: player.team, name: player.name, position: player.seat })
    io.emit('message', `👋 ${player.name} joined (${getTeamName(player.team)}).`)

    // Broadcast updated player list to all clients
    io.emit('playerJoined', {
      players: game.players.map(p => p ? { name: p.name, team: p.team, seat: p.seat } : null)
    })

    if (game.players.length === 4) {
      startNewHand()
    }
  })
  socket.on('disconnect', () => {
    const player = game.players.find(p => p && p.id === socket.id)
    if (player) {
      io.emit('message', `⏸️ ${player.name} disconnected. Waiting for reconnection...`)

      // Give player 60 seconds to reconnect before resetting
      setTimeout(() => {
        // Check if player is still disconnected
        const stillDisconnected = game.players.find(p => p && p.sessionId === player.sessionId && p.id === socket.id)
        if (stillDisconnected) {
          io.emit('message', '❌ Player did not reconnect. Game reset.')
          resetGame()
        }
      }, 60000)
    }
  })
})

function resetGame () {
  game.reset()
  // Emit gameReset to clear client UI states
  io.emit('gameReset')
}

function startNewHand () {
  game.startNewHand()

  io.emit('message', '🔄 New hand dealt!')
  io.emit('trumpCleared')

  for (const player of game.players) {
    io.to(player.id).emit('yourHand', player.hand.toArray())
  }

  const dealer = game.players[game.dealer]
  const firstBidder = game.getCurrentPlayer()
  io.emit('message', `${dealer.name} is dealing. Bidding starts with ${firstBidder.name}.`)
  io.to(firstBidder.id).emit('yourTurn', {
    phase: 'bidding',
    validBids: Object.keys(BID_VALUES),
    currentBid: game.currentBid,
    currentPlayer: game.currentPlayer
  })
}

function handleBid (socket, bid) {
  const player = game.getPlayer(socket.id)
  if (game.phase !== 'bidding' || player.seat !== game.currentPlayer) return

  // Handle cinch override phase differently
  if (game.cinchOverridePhase) {
    if (bid !== 'cinch' && bid !== 'pass') {
      socket.emit('message', "During cinch override, you can only bid 'cinch' or 'pass'")
      return
    }
  } else {
    if (!game.isValidBid(bid, game.currentBid)) {
      socket.emit('message', bid === 'pass' ? 'Invalid bid' : 'You must outbid the current bid')
      return
    }
  }

  io.emit('message', `${player.name} bids ${bid}`)

  const result = game.processBid(player, bid)

  // Broadcast current bid status
  io.emit('bidUpdate', {
    currentBid: game.currentBid,
    highestBidder: game.highestBidder ? game.highestBidder.name : null,
    bidContract: game.bidContract,
    bidderTeam: game.highestBidder ? game.highestBidder.team : null
  })

  if (result.finished) {
    if (result.cinchOverride) {
      if (result.overrideSuccessful) {
        io.emit('message', `🎯 ${game.highestBidder.name} overrides the cinch bid!`)
      } else {
        io.emit('message', `🎯 Cinch override declined. ${game.highestBidder.name} wins the bid with ${game.bidContract}.`)
      }
    } else if (result.cinchOffered) {
      // This shouldn't happen with current logic, but kept for safety
      io.emit('message', `🎯 ${game.highestBidder.name} wins the bid with ${game.bidContract}.`)
    } else {
      io.emit('message', `🎯 ${game.highestBidder.name} wins the bid with ${game.bidContract}.`)
    }

    game.phase = 'chooseTrump'
    io.to(game.highestBidder.id).emit('chooseTrump', SUITS)
  } else if (result.cinchOverride) {
    if (result.cinchOffered) {
      io.emit('message', `⚡ ${getTeamName(game.cinchBidder.team === 1 ? 2 : 1)} can override the cinch bid!`)
    }
    // Continue cinch override phase
    io.to(game.getCurrentPlayer().id).emit('yourTurn', {
      phase: 'bidding',
      validBids: ['cinch', 'pass'],
      cinchOverride: true
    })
  } else {
    // Normal bidding continues
    io.to(game.getCurrentPlayer().id).emit('yourTurn', {
      phase: 'bidding',
      validBids: Object.keys(BID_VALUES).filter(b => BID_VALUES[b] > game.currentBid || b === 'pass'),
      currentBid: game.currentBid,
      currentPlayer: game.currentPlayer
    })
  }
}

function handleTrump (socket, suit) {
  const player = game.getPlayer(socket.id)
  if (player.seat !== game.highestBidder.seat) return

  if (!game.setTrump(suit)) return

  io.emit('message', `Trump suit is ${game.trumpSuit}. Players must now discard non-trump cards.`)
  io.emit('trumpSelected', game.trumpSuit)

  // Ask all players to discard non-trump cards
  for (const p of game.players) {
    const nonTrumpIndices = p.hand.getNonTrumpIndices(game.trumpSuit)
    io.to(p.id).emit('discardPhase', {
      hand: p.hand.toArray(),
      trumpSuit: game.trumpSuit,
      nonTrumpIndices
    })
  }
}

function handleDiscard (socket, indices) {
  const player = game.getPlayer(socket.id)
  if (game.phase !== 'discarding') return

  player.discardCards(indices)

  game.playersDiscarded++
  io.emit('message', `${player.name} discarded ${indices.length} cards.`)

  // When all players have discarded, deal new cards
  if (game.playersDiscarded === 4) {
    dealNewCards()
  }
}

function dealNewCards () {
  io.emit('message', 'Dealing new cards to bring hands to 6 cards each...')

  game.dealNewCards()

  // Send updated hands to all players
  for (const player of game.players) {
    io.to(player.id).emit('yourHand', player.hand.toArray())
  }

  // Start playing phase
  game.phase = 'playing'
  game.currentPlayer = game.highestBidder.seat
  io.emit('message', 'Cards dealt. Starting play phase.')
  io.to(game.getCurrentPlayer().id).emit('yourTurn', {
    phase: 'play',
    hand: game.getCurrentPlayer().hand.toArray(),
    played: game.trickPlays.map(p => ({ card: { suit: p.card.suit, rank: p.card.rank }, name: p.name }))
  })
}

function handlePlay (socket, cardIndex) {
  const player = game.getPlayer(socket.id)

  const validation = game.canPlayCard(player, cardIndex)
  if (!validation.valid) {
    socket.emit('message', `❌ ${validation.reason}`)
    return
  }

  // Get card info before playing it (since playCard removes it from hand)
  const cardToPlay = player.hand.cards[cardIndex]
  const result = game.playCard(player, cardIndex)

  io.emit('cardPlayed', {
    player: player.seat,
    name: player.name,
    card: { suit: cardToPlay.suit, rank: cardToPlay.rank }
  })

  // Broadcast current trick state to all players
  io.emit('trickUpdate', {
    trickPlays: game.trickPlays.map(p => ({
      player: p.seat,
      card: { suit: p.card.suit, rank: p.card.rank },
      name: p.name
    }))
  })

  io.to(player.id).emit('yourHand', player.hand.toArray())

  if (result.trickComplete) {
    io.emit('message', `🃏 ${result.winner.name} wins the trick.`)
  }

  if (!game.isHandComplete()) {
    io.to(game.getCurrentPlayer().id).emit('yourTurn', {
      phase: 'play',
      hand: game.getCurrentPlayer().hand.toArray(),
      played: game.trickPlays.map(p => ({
        card: { suit: p.card.suit, rank: p.card.rank },
        name: p.name
      }))
    })
  } else {
    game.phase = 'scoring'
    performScoring()
  }
}

function performScoring () {
  const scoreResults = game.calculateScore()

  // Report individual points
  if (scoreResults.high) {
    io.emit('message', `🔝 High trump: ${scoreResults.high.card.rank} of ${scoreResults.high.card.suit} - ${getTeamName(scoreResults.high.team)}`)
  }

  if (scoreResults.low) {
    io.emit('message', `🔻 Low trump: ${scoreResults.low.card.rank} of ${scoreResults.low.card.suit} - ${getTeamName(scoreResults.low.team)}`)
  }

  if (scoreResults.jack) {
    io.emit('message', `🃏 Jack of trump - ${getTeamName(scoreResults.jack.team)}`)
  }

  if (scoreResults.game.team) {
    io.emit('message', `🎯 Game point: ${getTeamName(scoreResults.game.team)} (${scoreResults.game.points[scoreResults.game.team]} vs ${scoreResults.game.points[scoreResults.game.team === 1 ? 2 : 1]})`)
  } else {
    io.emit('message', `🎯 Game point: Tie (${scoreResults.game.points[1]} each) - No one gets the point`)
  }

  io.emit('message', `📊 Final points - Blue Team: ${scoreResults.teamPoints[1]}, Red Team: ${scoreResults.teamPoints[2]}`)

  const finalResult = game.applyScore(scoreResults)

  if (finalResult.success) {
    const pointsEarned = scoreResults.teamPoints[finalResult.biddingTeam]
    const pointsAwarded = finalResult.pointsAwarded

    if (game.bidContract === 11 && pointsEarned === 4) {
      io.emit('message', `🎯 CINCH SUCCESS! ${getTeamName(finalResult.biddingTeam)} got all 4 points and gets 11 points!`)
    } else if (pointsEarned > 4) {
      io.emit('message', `✅ ${getTeamName(finalResult.biddingTeam)} made the bid! Earned ${pointsEarned} points, awarded ${pointsAwarded} (4 point maximum).`)
    } else {
      io.emit('message', `✅ ${getTeamName(finalResult.biddingTeam)} made the bid and gets ${pointsAwarded} points!`)
    }
  } else {
    io.emit('message', `❌ ${getTeamName(finalResult.biddingTeam)} failed the bid and loses ${game.bidContract} points.`)
  }

  io.emit('scoreUpdate', game.scores)

  // Check if game is complete
  if (game.isGameComplete()) {
    const winningTeam = game.getWinningTeam()
    if (winningTeam) {
      io.emit('message', `🎉 GAME OVER! ${getTeamName(winningTeam)} wins with ${game.scores[`team${winningTeam}`]} points!`)
      io.emit('message', `Final score: Blue Team: ${game.scores.team1}, Red Team: ${game.scores.team2}`)
      io.emit('gameOver', {
        winningTeam,
        finalScores: { team1: game.scores.team1, team2: game.scores.team2 }
      })
    } else {
      // Tie at 21 or higher
      io.emit('message', `🎉 GAME OVER! It's a tie at ${game.scores.team1} points each!`)
      io.emit('gameOver', {
        winningTeam: null,
        finalScores: { team1: game.scores.team1, team2: game.scores.team2 }
      })
    }
  } else {
    io.emit('message', `🏁 Hand over. Blue Team: ${game.scores.team1}, Red Team: ${game.scores.team2}`)
  }
}

server.listen(PORT, () => console.log(`Cinch server running on http://localhost:${PORT}`))
