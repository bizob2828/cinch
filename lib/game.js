import { Deck } from './deck.js'
import { Player } from './player.js'
import { BID_VALUES, SUITS, RANKS } from './constants.js'

/**
 * Represents the main Cinch card game engine.
 * Manages game state, players, bidding, trump selection, and scoring.
 */
export class CinchGame {
  /**
   * Creates a new CinchGame instance.
   * Initializes a new game with default values.
   */
  constructor () {
    this.players = []
    this.deck = new Deck()
    this.currentBid = 0
    this.highestBidder = null
    this.bidContract = 0
    this.trumpSuit = null
    this.phase = 'waiting'
    this.currentPlayer = 0
    this.trickPlays = []
    this.scores = { team1: 0, team2: 0 }
    this.bids = 0
    this.playersDiscarded = 0
    this.cinchBidder = null
    this.cinchOverridePhase = false
    this.overrideAttempts = 0
    this.dealer = -1 // Start at -1 so first hand starts with player 0 as dealer
    this.isFirstHand = true // Track if this is the very first hand
    this.playersBid = new Set() // Track which players have bid this hand
  }

  /**
   * Adds a new player to the game.
   * @param {string} id - Unique identifier for the player
   * @param {string} name - The player's display name
   * @returns {Player|null} The created player or null if game is full
   */
  addPlayer (id, name) {
    if (this.players.length >= 4) return null

    const seat = this.players.length
    const player = new Player(id, seat, name)
    this.players.push(player)

    return player
  }

  /**
   * Removes all players from the game.
   */
  removeAllPlayers () {
    this.players = []
  }

  /**
   * Resets the entire game to initial state.
   * Clears all players, scores, and game state.
   */
  reset () {
    this.players = []
    this.deck = new Deck()
    this.currentBid = 0
    this.highestBidder = null
    this.bidContract = 0
    this.trumpSuit = null
    this.phase = 'waiting'
    this.currentPlayer = 0
    this.trickPlays = []
    this.bids = 0
    this.playersDiscarded = 0
    this.scores = { team1: 0, team2: 0 }
    this.dealer = -1 // Reset dealer position to start fresh
    this.isFirstHand = true // Reset first hand flag
    this.cinchBidder = null
    this.cinchOverridePhase = false
    this.overrideAttempts = 0
    this.playersBid = new Set() // Reset players who have bid
  }

  /**
   * Starts a new hand in the game.
   * Rotates the dealer, resets hand-specific state, and deals cards.
   */
  startNewHand () {
    // Rotate dealer to next player
    this.dealer = (this.dealer + 1) % 4
    this.isFirstHand = false

    // Reset hand-specific state
    this.deck = new Deck()
    this.deck.shuffle()
    this.currentBid = 0
    this.highestBidder = null
    this.bidContract = 0
    this.trumpSuit = null
    this.phase = 'bidding'
    // Bidding starts with player to the left of dealer
    this.currentPlayer = (this.dealer + 1) % 4
    this.trickPlays = []
    this.bids = 0
    this.playersDiscarded = 0
    this.cinchBidder = null
    this.cinchOverridePhase = false
    this.overrideAttempts = 0
    this.playersBid = new Set() // Reset players who have bid

    // Reset players for new hand
    this.players.forEach(player => player.resetForNewHand())

    // Deal cards
    this.dealCards()
  }

  /**
   * Deals an initial set of cards to all players.
   * @param {number} [cardsEach=6] - Number of cards to deal to each player
   */
  dealCards (cardsEach = 6) {
    for (let i = 0; i < cardsEach; i++) {
      for (let p = 0; p < this.players.length; p++) {
        if (!this.deck.isEmpty()) {
          const card = this.deck.deal(1)[0]
          this.players[p].addCardToHand(card)
        }
      }
    }
  }

  /**
   * Deals new cards to bring each player's hand up to 6 cards.
   * Used after the discard phase.
   */
  dealNewCards () {
    for (const player of this.players) {
      const cardsNeeded = 6 - player.hand.size()
      for (let i = 0; i < cardsNeeded; i++) {
        if (!this.deck.isEmpty()) {
          const card = this.deck.deal(1)[0]
          player.addCardToHand(card)
        }
      }
    }
  }

  /**
   * Gets a player by their ID.
   * @param {string} id - The player's unique identifier
   * @returns {Player|undefined} The player or undefined if not found
   */
  getPlayer (id) {
    return this.players.find(p => p.id === id)
  }

  /**
   * Gets the current player whose turn it is.
   * @returns {Player} The current player
   */
  getCurrentPlayer () {
    return this.players[this.currentPlayer]
  }

  /**
   * Advances to the next player in turn order.
   */
  nextPlayer () {
    this.currentPlayer = (this.currentPlayer + 1) % 4
  }

  /**
   * Validates if a bid is legal.
   * @param {string} bid - The bid to validate (e.g., 'pass', '1', '2', '3', '4', 'cinch')
   * @param {number} currentBid - The current highest bid value
   * @returns {boolean} True if the bid is valid
   */
  isValidBid (bid, currentBid) {
    if (!(bid in BID_VALUES)) return false
    const value = BID_VALUES[bid]
    return bid === 'pass' || value > currentBid
  }

  /**
   * Processes a player's bid and updates game state accordingly.
   * Handles regular bids, cinch bids, and cinch override attempts.
   * @param {Player} player - The player making the bid
   * @param {string} bid - The bid value
   * @returns {Object} Result object with finished flag and cinch override info
   */
  processBid (player, bid) {
    const value = BID_VALUES[bid]

    // Handle cinch override phase
    if (this.cinchOverridePhase) {
      this.overrideAttempts++

      if (bid === 'cinch') {
        // Check if this player has already bid this hand
        if (this.playersBid.has(player.seat)) {
          // Player has already bid, cannot counter cinch
          return { finished: false, cinchOverride: true, error: 'Player has already bid this hand' }
        }

        // Override successful - this player becomes the new cinch bidder
        this.highestBidder = player
        this.bidContract = value
        this.cinchBidder = player
        this.playersBid.add(player.seat) // Mark this player as having bid
        this.cinchOverridePhase = false
        this.overrideAttempts = 0
        return { finished: true, cinchOverride: true, overrideSuccessful: true }
      } else {
        // Pass or other bid - check if all eligible opposing team members have had a chance
        const eligibleOpposingPlayers = this.getEligibleOpposingPlayers()
        if (this.overrideAttempts >= eligibleOpposingPlayers.length) {
          // All eligible opposing team members have declined to override
          this.cinchOverridePhase = false
          this.overrideAttempts = 0
          return { finished: true, cinchOverride: true, overrideSuccessful: false }
        }
        // Continue to next eligible opposing team member
        this.findNextEligibleOpposingTeamMember()
        return { finished: false, cinchOverride: true }
      }
    }

    // Normal bidding phase
    this.bids++
    this.playersBid.add(player.seat) // Track that this player has bid

    if (bid !== 'pass') {
      this.currentBid = value
      this.highestBidder = player
      this.bidContract = value

      // Check if this is a cinch bid
      if (bid === 'cinch') {
        this.cinchBidder = player

        // Check if we've completed normal bidding (4 bids) or if this cinch ends bidding early
        if (this.bids === 4) {
          // Normal end of bidding with cinch - go to trump selection
          this.phase = 'chooseTrump'
          this.cinchOverridePhase = false
          this.overrideAttempts = 0
          return { finished: true }
        } else {
          // Cinch bid made before normal end - offer override to opposing team members who haven't bid
          const eligibleOpposingPlayers = this.getEligibleOpposingPlayers()
          if (eligibleOpposingPlayers.length > 0) {
            this.cinchOverridePhase = true
            this.overrideAttempts = 0
            // Find first eligible opposing team member
            this.findNextEligibleOpposingTeamMember()
            return { finished: false, cinchOverride: true, cinchOffered: true }
          } else {
            // No eligible opposing players, cinch stands
            this.phase = 'chooseTrump'
            this.cinchOverridePhase = false
            this.overrideAttempts = 0
            return { finished: true }
          }
        }
      }
    }

    this.nextPlayer()

    if (this.bids === 4) {
      this.phase = 'chooseTrump'
      this.cinchOverridePhase = false
      this.overrideAttempts = 0
      return { finished: true }
    }

    return { finished: false }
  }

  /**
   * Gets all players on the opposing team who haven't bid yet.
   * Used for cinch override logic.
   * @returns {Player[]} Array of eligible opposing players
   */
  getEligibleOpposingPlayers () {
    const cinchBidderTeam = this.cinchBidder.team
    return this.players.filter(player =>
      player.team !== cinchBidderTeam &&
      !this.playersBid.has(player.seat)
    )
  }

  /**
   * Advances to the next player on the opposing team.
   * @private
   */
  findNextOpposingTeamMember () {
    const cinchBidderTeam = this.cinchBidder.team
    let attempts = 0

    do {
      this.nextPlayer()
      attempts++
    } while (this.players[this.currentPlayer].team === cinchBidderTeam && attempts < 4)
  }

  /**
   * Advances to the next eligible opposing team member who hasn't bid.
   * @private
   */
  findNextEligibleOpposingTeamMember () {
    const eligiblePlayers = this.getEligibleOpposingPlayers()
    if (eligiblePlayers.length === 0) return

    // Find the next eligible player in turn order
    let attempts = 0
    while (attempts < 4) {
      this.nextPlayer()
      if (eligiblePlayers.some(p => p.seat === this.currentPlayer)) {
        break
      }
      attempts++
    }
  }

  /**
   * Sets the trump suit for the current hand.
   * @param {string} suit - The suit to set as trump
   * @returns {boolean} True if successful, false if invalid suit
   */
  setTrump (suit) {
    if (!SUITS.includes(suit)) return false
    this.trumpSuit = suit
    this.phase = 'discarding'
    this.playersDiscarded = 0
    return true
  }

  /**
   * Validates whether a player can legally play a specific card.
   * Checks turn order and suit-following rules.
   * @param {Player} player - The player attempting to play
   * @param {number} cardIndex - The index of the card to play
   * @returns {Object} Object with valid flag and reason if invalid
   */
  canPlayCard (player, cardIndex) {
    if (this.phase !== 'playing' || player.seat !== this.currentPlayer) {
      return { valid: false, reason: 'Not your turn' }
    }

    const cardToPlay = player.hand.cards[cardIndex]
    if (!cardToPlay) {
      return { valid: false, reason: 'Invalid card index' }
    }

    // If this is not the first card of the trick, check if player must follow suit
    if (this.trickPlays.length > 0) {
      const leadSuit = this.trickPlays[0].card.suit
      const hasLeadSuit = player.hand.hasSuit(leadSuit)

      if (hasLeadSuit && cardToPlay.suit !== leadSuit) {
        return { valid: false, reason: `You must follow suit (${leadSuit}) if you have one.` }
      }
    }

    return { valid: true }
  }

  /**
   * Processes a player playing a card.
   * Updates trick state and determines winner if trick is complete.
   * @param {Player} player - The player playing the card
   * @param {number} cardIndex - The index of the card to play
   * @returns {Object} Object with trickComplete flag and winner info if applicable
   */
  playCard (player, cardIndex) {
    const card = player.playCard(cardIndex)
    this.trickPlays.push({ seat: player.seat, card, name: player.name })
    this.nextPlayer()

    if (this.trickPlays.length === 4) {
      const winner = this.resolveTrick()
      const winnerCards = this.trickPlays.map(p => p.card)
      this.players[winner.seat].addWonCards(winnerCards)
      this.trickPlays = []
      this.currentPlayer = winner.seat
      return { trickComplete: true, winner }
    }

    return { trickComplete: false }
  }

  /**
   * Determines the winner of a completed trick.
   * Trump cards beat non-trump, higher rank beats lower within same suit.
   * @returns {Object} The winning play object with seat, card, and name
   */
  resolveTrick () {
    let winning = this.trickPlays[0]
    for (const play of this.trickPlays.slice(1)) {
      if (play.card.suit === this.trumpSuit && winning.card.suit !== this.trumpSuit) {
        winning = play
      } else if (play.card.suit === winning.card.suit &&
                play.card.getRankIndex() > winning.card.getRankIndex()) {
        winning = play
      }
    }
    return winning
  }

  /**
   * Checks if the current hand is complete (all cards played).
   * @returns {boolean} True if all players have empty hands
   */
  isHandComplete () {
    return this.players.every(player => player.hand.cards.length === 0)
  }

  /**
   * Checks if the game is complete (a team has reached 21 points).
   * @returns {boolean} True if a team has reached 21 or more points
   */
  isGameComplete () {
    return this.scores.team1 >= 21 || this.scores.team2 >= 21
  }

  /**
   * Determines which team won the game.
   * @returns {number|null} The winning team number (1 or 2) or null if no winner
   */
  getWinningTeam () {
    if (this.scores.team1 >= 21 && this.scores.team2 >= 21) {
      // Both teams reached 21, highest score wins
      return this.scores.team1 > this.scores.team2 ? 1 : this.scores.team2 > this.scores.team1 ? 2 : null
    } else if (this.scores.team1 >= 21) {
      return 1
    } else if (this.scores.team2 >= 21) {
      return 2
    }
    return null
  }

  /**
   * Calculates the score for the completed hand.
   * Determines High, Low, Jack, and Game points based on Cinch rules.
   * @returns {Object} Score results with high, low, jack, game info and team points
   */
  calculateScore () {
    const teamPoints = { 1: 0, 2: 0 }
    const allPlayedCards = []

    // Collect all cards played this hand
    for (const player of this.players) {
      allPlayedCards.push(...player.wonCards.toArray())
    }

    // Find trump cards that were played
    const trumpCards = allPlayedCards.filter(card => card.suit === this.trumpSuit)

    const results = {
      high: null,
      low: null,
      jack: null,
      game: null,
      teamPoints: { 1: 0, 2: 0 }
    }

    // 1. HIGH TRUMP - highest trump card played
    if (trumpCards.length > 0) {
      const highTrump = trumpCards.reduce((highest, card) =>
        RANKS.indexOf(card.rank) > RANKS.indexOf(highest.rank) ? card : highest
      )
      const team = this.findCardTeam(highTrump)
      if (team) {
        teamPoints[team]++
        results.high = { card: highTrump, team }
      }
    }

    // 2. LOW TRUMP - lowest trump card played
    if (trumpCards.length > 0) {
      const lowTrump = trumpCards.reduce((lowest, card) =>
        RANKS.indexOf(card.rank) < RANKS.indexOf(lowest.rank) ? card : lowest
      )
      const team = this.findCardTeam(lowTrump)
      if (team) {
        teamPoints[team]++
        results.low = { card: lowTrump, team }
      }
    }

    // 3. JACK OF TRUMP - if jack of trump was played
    const jackOfTrump = trumpCards.find(card => card.rank === 'J')
    if (jackOfTrump) {
      const team = this.findCardTeam(jackOfTrump)
      if (team) {
        teamPoints[team]++
        results.jack = { team }
      }
    }

    // 4. GAME POINT - team with most card point values
    const teamCardPoints = { 1: 0, 2: 0 }
    for (const player of this.players) {
      teamCardPoints[player.team] += player.wonCards.getTotalPointValue()
    }

    if (teamCardPoints[1] > teamCardPoints[2]) {
      teamPoints[1]++
      results.game = { team: 1, points: teamCardPoints }
    } else if (teamCardPoints[2] > teamCardPoints[1]) {
      teamPoints[2]++
      results.game = { team: 2, points: teamCardPoints }
    } else {
      results.game = { team: null, points: teamCardPoints }
    }

    results.teamPoints = teamPoints
    return results
  }

  /**
   * Finds which team won a specific card.
   * @param {Object} targetCard - The card to find (with suit and rank properties)
   * @returns {number|null} The team number (1 or 2) or null if not found
   */
  findCardTeam (targetCard) {
    for (const player of this.players) {
      if (player.wonCards.hasCard(targetCard.suit, targetCard.rank)) {
        return player.team
      }
    }
    return null
  }

  /**
   * Applies the calculated score to the game, handling bid success/failure.
   * Updates team scores based on whether the bidding team made their bid.
   * @param {Object} scoreResults - The score results from calculateScore()
   * @returns {Object} Object with success flag, bidding team, and points awarded
   */
  applyScore (scoreResults) {
    const biddingTeam = this.highestBidder.team
    const otherTeam = biddingTeam === 1 ? 2 : 1

    // Non-bidding team always gets whatever points they accumulated (no penalty)
    this.scores[`team${otherTeam}`] += scoreResults.teamPoints[otherTeam]

    // Special handling for cinch bid
    if (this.bidContract === 11) {
      // Cinch bid: must get all 4 points to succeed, and if so, gets 11 points
      if (scoreResults.teamPoints[biddingTeam] === 4) {
        this.scores[`team${biddingTeam}`] += 11
        return { success: true, biddingTeam, pointsAwarded: 11 }
      } else {
        // Failed cinch - lose the bid amount
        this.scores[`team${biddingTeam}`] -= this.bidContract
        return { success: false, biddingTeam }
      }
    } else {
      // Normal bid: must get at least the bid amount
      if (scoreResults.teamPoints[biddingTeam] >= this.bidContract) {
        // Bidding team made their bid - they get their earned points (max 4)
        const pointsToAward = Math.min(scoreResults.teamPoints[biddingTeam], 4)
        this.scores[`team${biddingTeam}`] += pointsToAward
        return { success: true, biddingTeam, pointsAwarded: pointsToAward }
      } else {
        // Bidding team failed their bid - they lose the bid amount
        this.scores[`team${biddingTeam}`] -= this.bidContract
        return { success: false, biddingTeam }
      }
    }
  }
}
