import { Deck } from "./deck.js";
import { Player } from "./player.js";
import { BID_VALUES, SUITS, RANKS } from "./constants.js";

export class CinchGame {
  constructor() {
    this.players = [];
    this.deck = new Deck();
    this.currentBid = 0;
    this.highestBidder = null;
    this.bidContract = 0;
    this.trumpSuit = null;
    this.phase = "waiting";
    this.currentPlayer = 0;
    this.trickPlays = [];
    this.scores = { team1: 0, team2: 0 };
    this.bids = 0;
    this.playersDiscarded = 0;
    this.cinchBidder = null;
    this.cinchOverridePhase = false;
    this.overrideAttempts = 0;
  }

  addPlayer(id, name) {
    if (this.players.length >= 4) return null;
    
    const seat = this.players.length;
    const player = new Player(id, seat, name);
    this.players.push(player);
    
    return player;
  }

  removeAllPlayers() {
    this.players = [];
  }

  reset() {
    this.players = [];
    this.deck = new Deck();
    this.currentBid = 0;
    this.highestBidder = null;
    this.bidContract = 0;
    this.trumpSuit = null;
    this.phase = "waiting";
    this.currentPlayer = 0;
    this.trickPlays = [];
    this.bids = 0;
    this.playersDiscarded = 0;
    this.scores = { team1: 0, team2: 0 };
  }

  startNewHand() {
    // Reset hand-specific state
    this.deck = new Deck();
    this.deck.shuffle();
    this.currentBid = 0;
    this.highestBidder = null;
    this.bidContract = 0;    
    this.trumpSuit = null;
    this.phase = "bidding";
    this.currentPlayer = 0;
    this.trickPlays = [];
    this.bids = 0;
    this.playersDiscarded = 0;
    this.cinchBidder = null;
    this.cinchOverridePhase = false;
    this.overrideAttempts = 0;

    // Reset players for new hand
    this.players.forEach(player => player.resetForNewHand());

    // Deal cards
    this.dealCards();
  }

  dealCards(cardsEach = 6) {
    for(let i = 0; i < cardsEach; i++) {
      for(let p = 0; p < this.players.length; p++) {
        if(!this.deck.isEmpty()) {
          const card = this.deck.deal(1)[0];
          this.players[p].addCardToHand(card);
        }
      }
    }
  }

  dealNewCards() {
    for(const player of this.players) {
      const cardsNeeded = 6 - player.hand.size();
      for(let i = 0; i < cardsNeeded; i++) {
        if(!this.deck.isEmpty()) {
          const card = this.deck.deal(1)[0];
          player.addCardToHand(card);
        }
      }
    }
  }

  getPlayer(id) {
    return this.players.find(p => p.id === id);
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayer];
  }

  nextPlayer() {
    this.currentPlayer = (this.currentPlayer + 1) % 4;
  }

  isValidBid(bid, currentBid) {
    if (!(bid in BID_VALUES)) return false;
    const value = BID_VALUES[bid];
    return bid === "pass" || value > currentBid;
  }

  processBid(player, bid) {
    const value = BID_VALUES[bid];
    
    // Handle cinch override phase
    if (this.cinchOverridePhase) {
      this.overrideAttempts++;
      
      if (bid === "cinch") {
        // Override successful - this player becomes the new cinch bidder
        this.highestBidder = player;
        this.bidContract = value;
        this.cinchBidder = player;
        return { finished: true, cinchOverride: true, overrideSuccessful: true };
      } else {
        // Pass or other bid - check if all opposing team members have had a chance
        if (this.overrideAttempts >= 2) {
          // Both opposing team members have declined to override
          return { finished: true, cinchOverride: true, overrideSuccessful: false };
        }
        // Continue to next opposing team member
        this.nextPlayer();
        return { finished: false, cinchOverride: true };
      }
    }

    // Normal bidding phase
    this.bids++;
    
    if(bid !== "pass") {
      this.currentBid = value;
      this.highestBidder = player;
      this.bidContract = value;
      
      // Check if this is a cinch bid
      if (bid === "cinch") {
        this.cinchBidder = player;
        
        // Check if we've completed normal bidding (4 bids) or if this cinch ends bidding early
        if (this.bids === 4) {
          // Normal end of bidding with cinch - go to trump selection
          this.phase = "chooseTrump";
          return { finished: true };
        } else {
          // Cinch bid made before normal end - offer override to opposing team
          this.cinchOverridePhase = true;
          this.overrideAttempts = 0;
          // Find first opposing team member after current player
          this.findNextOpposingTeamMember();
          return { finished: false, cinchOverride: true, cinchOffered: true };
        }
      }
    }

    this.nextPlayer();

    if (this.bids === 4) {
      this.phase = "chooseTrump";
      return { finished: true };
    }
    
    return { finished: false };
  }

  findNextOpposingTeamMember() {
    const cinchTeam = this.cinchBidder.team;
    // Start from next player and find opposing team member
    let nextPlayer = (this.currentPlayer + 1) % 4;
    while (this.players[nextPlayer].team === cinchTeam) {
      nextPlayer = (nextPlayer + 1) % 4;
    }
    this.currentPlayer = nextPlayer;
  }

  setTrump(suit) {
    if (!SUITS.includes(suit)) return false;
    this.trumpSuit = suit;
    this.phase = "discarding";
    this.playersDiscarded = 0;
    return true;
  }

  canPlayCard(player, cardIndex) {
    if (this.phase !== "playing" || player.seat !== this.currentPlayer) {
      return { valid: false, reason: "Not your turn" };
    }

    const cardToPlay = player.hand.cards[cardIndex];
    if (!cardToPlay) {
      return { valid: false, reason: "Invalid card index" };
    }

    // If this is not the first card of the trick, check if player must follow suit
    if(this.trickPlays.length > 0) {
      const leadSuit = this.trickPlays[0].card.suit;
      const hasLeadSuit = player.hand.hasSuit(leadSuit);
      
      if(hasLeadSuit && cardToPlay.suit !== leadSuit) {
        return { valid: false, reason: `You must follow suit (${leadSuit}) if you have one.` };
      }
    }

    return { valid: true };
  }

  playCard(player, cardIndex) {
    const card = player.playCard(cardIndex);
    this.trickPlays.push({ seat: player.seat, card, name: player.name });
    this.nextPlayer();

    if(this.trickPlays.length === 4) {
      const winner = this.resolveTrick();
      const winnerCards = this.trickPlays.map(p => p.card);
      this.players[winner.seat].addWonCards(winnerCards);
      this.trickPlays = [];
      this.currentPlayer = winner.seat;
      return { trickComplete: true, winner };
    }

    return { trickComplete: false };
  }

  resolveTrick() {
    let winning = this.trickPlays[0];
    for(const play of this.trickPlays.slice(1)) {
      if(play.card.suit === this.trumpSuit && winning.card.suit !== this.trumpSuit) {
        winning = play;
      } else if(play.card.suit === winning.card.suit && 
                play.card.getRankIndex() > winning.card.getRankIndex()) {
        winning = play;
      }
    }
    return winning;
  }

  isHandComplete() {
    return this.players.every(player => player.hand.isEmpty());
  }

  calculateScore() {
    const teamPoints = { 1: 0, 2: 0 };
    const allPlayedCards = [];
    
    // Collect all cards played this hand
    for(const player of this.players) {
      allPlayedCards.push(...player.wonCards.toArray());
    }
    
    // Find trump cards that were played
    const trumpCards = allPlayedCards.filter(card => card.suit === this.trumpSuit);
    
    const results = {
      high: null,
      low: null,
      jack: null,
      game: null,
      teamPoints: { 1: 0, 2: 0 }
    };

    // 1. HIGH TRUMP - highest trump card played
    if(trumpCards.length > 0) {
      const highTrump = trumpCards.reduce((highest, card) => 
        RANKS.indexOf(card.rank) > RANKS.indexOf(highest.rank) ? card : highest
      );
      const team = this.findCardTeam(highTrump);
      if(team) {
        teamPoints[team]++;
        results.high = { card: highTrump, team };
      }
    }
    
    // 2. LOW TRUMP - lowest trump card played  
    if(trumpCards.length > 0) {
      const lowTrump = trumpCards.reduce((lowest, card) => 
        RANKS.indexOf(card.rank) < RANKS.indexOf(lowest.rank) ? card : lowest
      );
      const team = this.findCardTeam(lowTrump);
      if(team) {
        teamPoints[team]++;
        results.low = { card: lowTrump, team };
      }
    }
    
    // 3. JACK OF TRUMP - if jack of trump was played
    const jackOfTrump = trumpCards.find(card => card.rank === "J");
    if(jackOfTrump) {
      const team = this.findCardTeam(jackOfTrump);
      if(team) {
        teamPoints[team]++;
        results.jack = { team };
      }
    }
    
    // 4. GAME POINT - team with most card point values
    const teamCardPoints = { 1: 0, 2: 0 };
    for(const player of this.players) {
      teamCardPoints[player.team] += player.wonCards.getTotalPointValue();
    }
    
    if(teamCardPoints[1] > teamCardPoints[2]) {
      teamPoints[1]++;
      results.game = { team: 1, points: teamCardPoints };
    } else if(teamCardPoints[2] > teamCardPoints[1]) {
      teamPoints[2]++;
      results.game = { team: 2, points: teamCardPoints };
    } else {
      results.game = { team: null, points: teamCardPoints };
    }

    results.teamPoints = teamPoints;
    return results;
  }

  findCardTeam(targetCard) {
    for(const player of this.players) {
      if(player.wonCards.hasCard(targetCard.suit, targetCard.rank)) {
        return player.team;
      }
    }
    return null;
  }

  applyScore(scoreResults) {
    const biddingTeam = this.highestBidder.team;
    const otherTeam = biddingTeam === 1 ? 2 : 1;
    
    if(scoreResults.teamPoints[biddingTeam] >= this.bidContract) {
      this.scores[`team${biddingTeam}`] += scoreResults.teamPoints[biddingTeam];
      this.scores[`team${otherTeam}`] += scoreResults.teamPoints[otherTeam];
      return { success: true, biddingTeam };
    } else {
      this.scores[`team${biddingTeam}`] -= this.bidContract;
      this.scores[`team${otherTeam}`] += scoreResults.teamPoints[otherTeam];
      return { success: false, biddingTeam };
    }
  }
}

