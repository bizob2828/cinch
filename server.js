// server.js
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { CinchGame } from './lib/game.js'
import { SUITS, BID_VALUES } from './lib/constants.js'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'https://cinch-57zi.onrender.com',
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
  if (game.players.length >= 4) {
    socket.emit('message', '❌ Game is full. Try again later.')
    socket.disconnect()
    return
  }

  socket.on('registerName', name => {
    const player = game.addPlayer(socket.id, name)
    if (!player) {
      socket.emit('message', '❌ Game is full. Try again later.')
      socket.disconnect()
      return
    }

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

  socket.on('bid', bid => handleBid(socket, bid))
  socket.on('chooseTrump', suit => handleTrump(socket, suit))
  socket.on('discardCards', indices => handleDiscard(socket, indices))
  socket.on('playCard', index => handlePlay(socket, index))
  socket.on('nextHand', () => {
    if (game.players.length === 4) startNewHand()
  })
  socket.on('endGame', () => {
    io.emit('message', '🔄 Game ended by player request. Starting fresh!')
    resetGameKeepPlayers()
  })
  socket.on('disconnect', () => {
    io.emit('message', '❌ A player disconnected. Game reset.')
    resetGame()
  })
})

function resetGame () {
  game.reset()
  // Emit gameReset to clear client UI states
  io.emit('gameReset')
}

function resetGameKeepPlayers () {
  // Store current players before reset
  const currentPlayers = [...game.players]

  // Reset the game state
  game.reset()

  // Re-add the same players in the same seats
  currentPlayers.forEach(player => {
    if (player) {
      game.addPlayer(player.id, player.name)
    }
  })

  // Emit gameReset to clear client UI states
  io.emit('gameReset')

  // Re-broadcast player list to all clients
  io.emit('playerJoined', {
    players: game.players.map(p => p ? { name: p.name, team: p.team, seat: p.seat } : null)
  })

  // If we have 4 players, start a new hand immediately
  if (game.players.length === 4) {
    startNewHand()
  }
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
