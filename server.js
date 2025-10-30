// server.js
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { CinchGame } from './lib/game.js'
import { SUITS, BID_VALUES } from './lib/constants.js'

const app = express()
const server = http.createServer(app)
const io = new Server(server)
app.use(express.static('public'))

const PORT = 3000

// Game state
let game = null

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

    socket.emit('welcome', { team: player.team, name: player.name })
    io.emit('message', `👋 ${player.name} joined (Team ${player.team}).`)

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
  socket.on('disconnect', () => {
    io.emit('message', 'A player disconnected. Game reset.')
    resetGame()
  })
})

function resetGame () {
  game.reset()
}

function startNewHand () {
  game.startNewHand()

  io.emit('message', '🔄 New hand dealt!')
  io.emit('trumpCleared')

  for (const player of game.players) {
    io.to(player.id).emit('yourHand', player.hand.toArray())
  }

  io.emit('message', `Bidding starts with ${game.players[0].name}.`)
  io.to(game.getCurrentPlayer().id).emit('yourTurn', {
    phase: 'bidding',
    validBids: Object.keys(BID_VALUES)
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
      io.emit('message', `⚡ Team ${game.cinchBidder.team === 1 ? 2 : 1} can override the cinch bid!`)
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
      validBids: Object.keys(BID_VALUES).filter(b => BID_VALUES[b] > game.currentBid || b === 'pass')
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
    io.emit('message', `🔝 High trump: ${scoreResults.high.card.rank} of ${scoreResults.high.card.suit} - Team ${scoreResults.high.team}`)
  }

  if (scoreResults.low) {
    io.emit('message', `🔻 Low trump: ${scoreResults.low.card.rank} of ${scoreResults.low.card.suit} - Team ${scoreResults.low.team}`)
  }

  if (scoreResults.jack) {
    io.emit('message', `🃏 Jack of trump - Team ${scoreResults.jack.team}`)
  }

  if (scoreResults.game.team) {
    io.emit('message', `🎯 Game point: Team ${scoreResults.game.team} (${scoreResults.game.points[scoreResults.game.team]} vs ${scoreResults.game.points[scoreResults.game.team === 1 ? 2 : 1]})`)
  } else {
    io.emit('message', `🎯 Game point: Tie (${scoreResults.game.points[1]} each) - No one gets the point`)
  }

  io.emit('message', `📊 Final points - Team 1: ${scoreResults.teamPoints[1]}, Team 2: ${scoreResults.teamPoints[2]}`)

  const finalResult = game.applyScore(scoreResults)

  if (finalResult.success) {
    io.emit('message', `✅ Team ${finalResult.biddingTeam} made the bid!`)
  } else {
    io.emit('message', `❌ Team ${finalResult.biddingTeam} failed the bid and loses ${game.bidContract} points.`)
  }

  io.emit('scoreUpdate', game.scores)
  io.emit('message', `🏁 Hand over. Team 1: ${game.scores.team1}, Team 2: ${game.scores.team2}`)
}

server.listen(PORT, () => console.log(`Cinch server running on http://localhost:${PORT}`))
