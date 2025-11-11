import { SUITS, RANKS } from './constants.js'
import { Card } from './card.js'

/**
 * Represents a standard deck of playing cards.
 */
export class Deck {
  /**
   * Creates a new Deck instance with a full set of cards.
   * Automatically creates all 52 cards (4 suits × 13 ranks).
   */
  constructor () {
    this.cards = []
    this.createDeck()
  }

  /**
   * Creates a full deck of 52 cards.
   * Resets the deck to contain all cards in their original order.
   */
  createDeck () {
    this.cards = []
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(new Card(suit, rank))
      }
    }
  }

  /**
   * Shuffles the deck using the Fisher-Yates algorithm.
   * Randomizes the order of all cards in the deck.
   * @returns {Deck} Returns this deck instance for method chaining
   */
  shuffle () {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
    return this
  }

  /**
   * Deals cards from the top of the deck.
   * Removes and returns the specified number of cards from the deck.
   * @param {number} [numCards=1] - The number of cards to deal
   * @returns {Card[]} An array of dealt cards
   */
  deal (numCards = 1) {
    return this.cards.splice(0, numCards)
  }

  /**
   * Checks if the deck is empty.
   * @returns {boolean} True if the deck has no cards remaining
   */
  isEmpty () {
    return this.cards.length === 0
  }

  /**
   * Gets the number of cards remaining in the deck.
   * @returns {number} The number of cards in the deck
   */
  size () {
    return this.cards.length
  }
}
