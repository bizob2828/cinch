/* eslint-disable no-undef, no-unused-vars */
const socket = io()
const joinForm = document.getElementById('joinForm')
const joinBtn = document.getElementById('joinBtn')
const playerNameInput = document.getElementById('playerNameInput')
const gameUI = document.getElementById('gameUI')

// Game state
let playerPosition = -1
const playerNames = ['', '', '', '']
const playerTeams = [0, 0, 0, 0]
let currentPlayer = -1
let auditCollapsed = false

// UI Elements
const handDiv = document.getElementById('hand')
const playedDiv = document.getElementById('playedCards')
const biddingDiv = document.getElementById('bidding')
const chooseTrumpDiv = document.getElementById('chooseTrump')
const discardingDiv = document.getElementById('discarding')
const scoreDiv = document.getElementById('scoreboard')
const trumpDisplay = document.getElementById('trumpDisplay')
const trumpSuitSpan = document.getElementById('trumpSuit')
const bidDisplay = document.getElementById('bidDisplay')
const currentBidSpan = document.getElementById('currentBid')
const nextHandBtn = document.getElementById('nextHand')
const auditContent = document.getElementById('auditContent')
const auditToggle = document.getElementById('auditToggle')

function joinGame () {
  const name = playerNameInput.value.trim() || 'Anonymous'
  socket.emit('registerName', name)

  // Hide join form and show game UI
  joinForm.style.display = 'none'
  gameUI.classList.remove('hidden')
}

function toggleAudit () {
  auditCollapsed = !auditCollapsed
  auditContent.classList.toggle('collapsed', auditCollapsed)
  auditToggle.classList.toggle('collapsed', auditCollapsed)
  auditToggle.textContent = auditCollapsed ? '▶' : '▼'
}

function addAuditMessage (message) {
  const messageDiv = document.createElement('div')
  messageDiv.className = 'audit-message'
  messageDiv.textContent = message
  auditContent.appendChild(messageDiv)

  // Auto-scroll to bottom if not collapsed
  if (!auditCollapsed) {
    auditContent.scrollTop = auditContent.scrollHeight
  }
}

function updatePlayerPositions () {
  const positions = ['playerSouth', 'playerWest', 'playerNorth', 'playerEast']

  positions.forEach((posId, index) => {
    const element = document.getElementById(posId)
    const nameElement = element.querySelector('.player-name')
    const actualPlayerIndex = (playerPosition + index) % 4

    if (playerNames[actualPlayerIndex]) {
      nameElement.textContent = playerNames[actualPlayerIndex]
      nameElement.classList.remove('team1', 'team2')
      nameElement.classList.add(playerTeams[actualPlayerIndex] === 1 ? 'team1' : 'team2')

      // Highlight current player
      nameElement.classList.toggle('active', actualPlayerIndex === currentPlayer)
    } else {
      nameElement.textContent = 'Waiting...'
      nameElement.classList.remove('team1', 'team2', 'active')
    }
  })
}

function displayPlayedCards (playedCards) {
  playedDiv.innerHTML = ''

  playedCards.forEach((play) => {
    if (play && play.card) {
      const cardElement = document.createElement('div')
      cardElement.className = 'played-card'
      cardElement.textContent = `${play.card.rank}${play.card.suit}`

      // Calculate relative position from current player's perspective
      // Player positions: South=0, West=1, North=2, East=3 (from current player's view)
      // Card positions: North=0, East=1, South=2, West=3 (CSS positioning)
      const playerRelativeIndex = (play.player - playerPosition + 4) % 4
      const cardPositionMapping = [2, 3, 0, 1] // Maps player index to card position
      const relativePosition = cardPositionMapping[playerRelativeIndex]
      cardElement.setAttribute('data-position', relativePosition)

      // Color red suits
      if (play.card.suit === '♥' || play.card.suit === '♦') {
        cardElement.classList.add('red-suit')
      }

      playedDiv.appendChild(cardElement)
    }
  })
}

joinBtn.onclick = joinGame

// Allow Enter key to submit the form
playerNameInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    joinGame()
  }
})

let selectedCards = []
let currentTrumpSuit = null

// Helper function to get team color name
function getTeamName (teamNumber) {
  return teamNumber === 1 ? 'Blue Team' : 'Red Team'
}

function getTeamColor (teamNumber) {
  return teamNumber === 1 ? '#0064c8' : '#c80000'
}

// Global functions for button handlers
function bid (amount) {
  socket.emit('bid', amount)
  biddingDiv.classList.add('hidden')
}

function chooseTrump (suit) {
  socket.emit('chooseTrump', suit)
  chooseTrumpDiv.classList.add('hidden')
}

function nextHand () {
  playedDiv.innerHTML = ''
  trumpDisplay.style.display = 'none'
  socket.emit('nextHand')
  nextHandBtn.style.display = 'none'
}

function endGame () {
  if (confirm('Are you sure you want to end the current game? This will reset all scores and start fresh.')) {
    socket.emit('endGame')
  }
}

function showWinningModal (winningTeam, team1Score, team2Score) {
  const modal = document.getElementById('handResultModal')
  const title = document.getElementById('handResultTitle')
  const team1ScoreEl = document.getElementById('team1Score')
  const team2ScoreEl = document.getElementById('team2Score')

  if (winningTeam === 0) {
    title.textContent = 'Hand Complete - Tie!'
  } else {
    title.textContent = `${getTeamName(winningTeam)} Leads!`
  }

  team1ScoreEl.textContent = team1Score
  team2ScoreEl.textContent = team2Score

  modal.classList.remove('hidden')

  // Hide modal after 3 seconds
  setTimeout(() => {
    modal.classList.add('hidden')
  }, 3000)
}

// Event handlers
socket.on('welcome', ({ team, name, position }) => {
  document.getElementById('status').innerText = `${name} (${getTeamName(team)})`
  playerPosition = position
  updatePlayerPositions()
})

socket.on('playerJoined', ({ players }) => {
  players.forEach((player, index) => {
    if (player) {
      playerNames[player.seat] = player.name
      playerTeams[player.seat] = player.team
    }
  })
  updatePlayerPositions()
})

socket.on('yourHand', cards => {
  handDiv.innerHTML = cards.map((c, i) => {
    const isRedSuit = c.suit === '♥' || c.suit === '♦'
    const redSuitClass = isRedSuit ? ' red-suit' : ''
    return `<div class='card${redSuitClass}' data-i='${i}'>${c.rank}${c.suit}</div>`
  }).join('')
  handDiv.querySelectorAll('.card').forEach(cardDiv => {
    cardDiv.onclick = null // Clear previous onclicks
  })
})

socket.on('yourTurn', data => {
  console.log('your turn', data)
  currentPlayer = data.currentPlayer
  updatePlayerPositions()

  biddingDiv.classList.add('hidden')
  chooseTrumpDiv.classList.add('hidden')
  discardingDiv.classList.add('hidden')
  nextHandBtn.style.display = 'none'

  if (data.phase === 'bidding') {
    if (data.cinchOverride) {
      const buttonsHtml = data.validBids.map(b =>
        `<button class="action-button bid-button ${b === 'cinch' ? 'cinch' : ''}" onclick="bid('${b}')">${b}</button>`
      ).join('')
      biddingDiv.innerHTML = `
        <h3 style="color: #ff4444;">⚡ CINCH OVERRIDE ⚡</h3>
        <p>The opposing team bid cinch. You can override!</p>
        <div class="action-buttons">${buttonsHtml}</div>
      `
    } else {
      // Normal bidding
      const buttonsHtml = data.validBids.map(b =>
        `<button class="action-button bid-button ${b === 'cinch' ? 'cinch' : ''}" onclick="bid('${b}')">${b}</button>`
      ).join('')
      const currentBidText = data.currentBid > 0 ? data.currentBid : 'None'
      biddingDiv.innerHTML = `
        <h3>Your Turn to Bid</h3>
        <p>Current bid: ${currentBidText}</p>
        <div class="action-buttons">${buttonsHtml}</div>
      `
    }
    biddingDiv.classList.remove('hidden')
  } else if (data.phase === 'play') {
    addAuditMessage('Your turn to play a card')
    handDiv.querySelectorAll('.card').forEach(cardDiv => {
      cardDiv.onclick = () => {
        const index = cardDiv.getAttribute('data-i')
        socket.emit('playCard', parseInt(index))
        // Don't disable clicks here - wait for server confirmation
      }
    })
  }
})

socket.on('chooseTrump', suits => {
  console.log('choose trump', suits)
  chooseTrumpDiv.classList.remove('hidden')
})

function finishDiscarding () {
  // Remove discarded cards from UI immediately
  const sortedIndices = selectedCards.sort((a, b) => b - a) // Sort descending to avoid index shifting
  sortedIndices.forEach(index => {
    const cardDiv = handDiv.children[index]
    if (cardDiv) {
      cardDiv.remove()
    }
  })

  // Update data-i attributes for remaining cards
  handDiv.querySelectorAll('.card').forEach((cardDiv, newIndex) => {
    cardDiv.setAttribute('data-i', newIndex)
  })

  socket.emit('discardCards', selectedCards)
  discardingDiv.classList.add('hidden')
  selectedCards = []

  // Remove click handlers and highlighting from remaining cards
  handDiv.querySelectorAll('.card').forEach(cardDiv => {
    cardDiv.onclick = null
    cardDiv.classList.remove('selected', 'non-trump', 'unselected-discard')
  })
}

socket.on('discardPhase', data => {
  console.log('discard phase', data)
  selectedCards = [...data.nonTrumpIndices] // Start with all non-trump cards selected
  discardingDiv.classList.remove('hidden')

  // Set up non-trump cards (start selected by default)
  handDiv.querySelectorAll('.card').forEach((cardDiv, index) => {
    cardDiv.classList.remove('selected', 'non-trump', 'unselected-discard')
    cardDiv.onclick = null

    if (data.nonTrumpIndices.includes(index)) {
      // Non-trump cards start selected (red)
      cardDiv.classList.add('selected')
      cardDiv.onclick = () => {
        if (selectedCards.includes(index)) {
          // Unselect: remove from selectedCards and change to white
          selectedCards = selectedCards.filter(i => i !== index)
          cardDiv.classList.remove('selected')
          cardDiv.classList.add('unselected-discard')
        } else {
          // Select: add to selectedCards and change to red
          selectedCards.push(index)
          cardDiv.classList.remove('unselected-discard')
          cardDiv.classList.add('selected')
        }
      }
    }
  })
})

socket.on('cardPlayed', ({ player, name, card }) => {
  addAuditMessage(`${name} played ${card.rank}${card.suit}`)

  // If this is our own card being played, disable our card clicks
  if (player === playerPosition) {
    handDiv.querySelectorAll('.card').forEach(cd => { cd.onclick = null })
  }
})

socket.on('trickUpdate', ({ trickPlays }) => {
  displayPlayedCards(trickPlays)
})

socket.on('trickPlayed', ({ trickPlays, winner }) => {
  displayPlayedCards(trickPlays)
  if (winner) {
    addAuditMessage(`${winner.name} won the trick`)
  }
})

socket.on('scoreUpdate', scores => {
  scoreDiv.innerText = `Blue Team: ${scores.team1} | Red Team: ${scores.team2}`
  nextHandBtn.style.display = 'block'
})

socket.on('trumpSelected', suit => {
  currentTrumpSuit = suit
  trumpSuitSpan.innerText = suit
  // Color the trump suit display red for hearts and diamonds
  if (suit === '♥' || suit === '♦') {
    trumpSuitSpan.style.color = '#cc0000'
  } else {
    trumpSuitSpan.style.color = '#fff'
  }
  trumpDisplay.style.display = 'block'
  addAuditMessage(`Trump suit selected: ${suit}`)
})

socket.on('bidUpdate', ({ currentBid, highestBidder, bidContract, bidderTeam }) => {
  if (currentBid > 0) {
    currentBidSpan.innerText = bidContract === 11 ? 'Cinch' : bidContract

    // Color the bid based on the team
    if (bidderTeam === 1) {
      currentBidSpan.style.color = '#0064c8' // Blue Team
    } else if (bidderTeam === 2) {
      currentBidSpan.style.color = '#c80000' // Red Team
    } else {
      currentBidSpan.style.color = '#ffeb3b' // Default yellow
    }

    bidDisplay.style.display = 'block'
  } else {
    bidDisplay.style.display = 'none'
  }
})

socket.on('trumpCleared', () => {
  currentTrumpSuit = null
  trumpDisplay.style.display = 'none'
  trumpSuitSpan.innerText = ''
  bidDisplay.style.display = 'none'
  currentBidSpan.innerText = '-'
  currentBidSpan.style.color = '#ffeb3b' // Reset to default
  nextHandBtn.style.display = 'none' // Hide Next Hand button when new hand starts
})

socket.on('handStarted', ({ dealer }) => {
  // Clear played cards from previous hand
  playedDiv.innerHTML = ''
  // Clear bid display for new hand
  bidDisplay.style.display = 'none'
  currentBidSpan.innerText = '-'
  currentBidSpan.style.color = '#ffeb3b' // Reset to default
  if (dealer !== undefined) {
    addAuditMessage(`New hand started. ${playerNames[dealer]} is dealing.`)
  }
})

// Handle messages and show modals for hand completion
socket.on('message', (msg) => {
  addAuditMessage(msg)

  // Don't clear cards when trick wins - keep them visible until next hand
  if (msg.includes('Hand over')) {
    // Show winning team modal - parse from Blue Team/Red Team format
    const blueScore = parseInt(msg.match(/Blue Team: (\d+)/)[1])
    const redScore = parseInt(msg.match(/Red Team: (\d+)/)[1])
    showWinningModal(blueScore > redScore ? 1 : redScore > blueScore ? 2 : 0, blueScore, redScore)
  }
})

socket.on('gameOver', (data) => {
  const modal = document.getElementById('handResultModal')
  const title = document.getElementById('handResultTitle')
  const team1ScoreEl = document.getElementById('team1Score')
  const team2ScoreEl = document.getElementById('team2Score')

  if (data.winningTeam) {
    title.textContent = `🎉 GAME OVER! ${getTeamName(data.winningTeam)} Wins!`
    title.style.color = getTeamColor(data.winningTeam)
  } else {
    title.textContent = '🎉 GAME OVER! It\'s a Tie!'
    title.style.color = '#ffeb3b'
  }

  team1ScoreEl.textContent = data.finalScores.team1
  team2ScoreEl.textContent = data.finalScores.team2

  modal.classList.remove('hidden')

  // Hide the "Next Hand" button since the game is over
  nextHandBtn.style.display = 'none'

  // Don't auto-hide the modal for game over
})

socket.on('gameReset', () => {
  // Reset all UI elements to initial state
  handDiv.innerHTML = ''
  playedDiv.innerHTML = ''
  scoreDiv.innerText = 'Blue Team: 0 | Red Team: 0'

  // Hide all action areas and modals
  biddingDiv.classList.add('hidden')
  chooseTrumpDiv.classList.add('hidden')
  discardingDiv.classList.add('hidden')
  nextHandBtn.style.display = 'none'

  // Hide trump and bid displays
  trumpDisplay.style.display = 'none'
  bidDisplay.style.display = 'none'
  currentBidSpan.innerText = '-'
  currentBidSpan.style.color = '#ffeb3b'
  trumpSuitSpan.innerText = ''

  // Hide hand result modal
  const modal = document.getElementById('handResultModal')
  modal.classList.add('hidden')

  // Reset game state but keep player position info (will be updated by playerJoined event)
  selectedCards = []
  currentTrumpSuit = null
  currentPlayer = -1

  // Don't reset playerPosition, playerNames, playerTeams here -
  // they will be updated by the playerJoined event that follows
})
/* eslint-enable no-undef, no-unused-vars */
