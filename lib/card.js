'use strict'
import { RANKS } from './constants.js'

/**
 * Represents a playing card with a suit and rank.
 */
export class Card {
  /**
   * Creates a new Card instance.
   * @param {string} suit - The suit of the card (e.g., '♥', '♦', '♣', '♠')
   * @param {string} rank - The rank of the card (e.g., '2', '3', ..., '10', 'J', 'Q', 'K', 'A')
   */
  constructor (suit, rank) {
    this.suit = suit
    this.rank = rank
  }

  /**
   * Gets the point value of the card based on Cinch game scoring rules.
   * @returns {number} The point value: Ace=4, King=3, Queen=2, Jack=1, 10=10, all others=0
   */
  getPointValue () {
    switch (this.rank) {
      case 'A': return 4
      case 'K': return 3
      case 'Q': return 2
      case 'J': return 1
      case '10': return 10
      default: return 0
    }
  }

  /**
   * Gets the index of this card's rank in the RANKS array.
   * Higher index indicates higher rank.
   * @returns {number} The index position of the rank (0-12)
   */
  getRankIndex () {
    return RANKS.indexOf(this.rank)
  }

  /**
   * Returns a string representation of the card.
   * @returns {string} A formatted string like "A of ♥"
   */
  toString () {
    return `${this.rank} of ${this.suit}`
  }
}
