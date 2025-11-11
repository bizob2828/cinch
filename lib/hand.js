/**
 * Represents a collection of cards (a hand).
 * Used for both a player's current hand and their won cards.
 */
export class Hand {
  /**
   * Creates a new empty Hand instance.
   */
  constructor () {
    this.cards = []
  }

  /**
   * Adds a single card to the hand.
   * @param {Card} card - The card to add
   */
  addCard (card) {
    this.cards.push(card)
  }

  /**
   * Adds multiple cards to the hand.
   * @param {Card[]} cards - An array of cards to add
   */
  addCards (cards) {
    this.cards.push(...cards)
  }

  /**
   * Removes and returns a card at the specified index.
   * @param {number} index - The index of the card to remove
   * @returns {Card} The removed card
   */
  removeCard (index) {
    return this.cards.splice(index, 1)[0]
  }

  /**
   * Removes and returns multiple cards at the specified indices.
   * Automatically sorts indices in descending order to avoid index shifting issues.
   * @param {number[]} indices - An array of indices of cards to remove
   * @returns {Card[]} An array of the removed cards
   */
  removeCards (indices) {
    // Sort indices descending to avoid index shifting
    const sortedIndices = indices.sort((a, b) => b - a)
    const removedCards = []
    for (const index of sortedIndices) {
      removedCards.push(this.cards.splice(index, 1)[0])
    }
    return removedCards
  }

  /**
   * Checks if the hand contains a specific card.
   * @param {string} suit - The suit to search for
   * @param {string} rank - The rank to search for
   * @returns {boolean} True if the hand contains a card with the specified suit and rank
   */
  hasCard (suit, rank) {
    return this.cards.some(card => card.suit === suit && card.rank === rank)
  }

  /**
   * Checks if the hand contains any card of a specific suit.
   * @param {string} suit - The suit to search for
   * @returns {boolean} True if the hand contains at least one card of the specified suit
   */
  hasSuit (suit) {
    return this.cards.some(card => card.suit === suit)
  }

  /**
   * Gets all cards of a specific suit.
   * @param {string} suit - The suit to filter by
   * @returns {Card[]} An array of cards with the specified suit
   */
  getCardsOfSuit (suit) {
    return this.cards.filter(card => card.suit === suit)
  }

  /**
   * Gets all cards that are not of the trump suit.
   * @param {string} trumpSuit - The trump suit to exclude
   * @returns {Card[]} An array of non-trump cards
   */
  getNonTrumpCards (trumpSuit) {
    return this.cards.filter(card => card.suit !== trumpSuit)
  }

  /**
   * Gets the indices of all non-trump cards.
   * @param {string} trumpSuit - The trump suit to exclude
   * @returns {number[]} An array of indices of non-trump cards
   */
  getNonTrumpIndices (trumpSuit) {
    return this.cards.map((card, index) => ({ card, index }))
      .filter(({ card }) => card.suit !== trumpSuit)
      .map(({ index }) => index)
  }

  /**
   * Calculates the total point value of all cards in the hand.
   * @returns {number} The sum of point values of all cards
   */
  getTotalPointValue () {
    return this.cards.reduce((total, card) => total + card.getPointValue(), 0)
  }

  /**
   * Gets the number of cards in the hand.
   * @returns {number} The number of cards
   */
  size () {
    return this.cards.length
  }

  /**
   * Checks if the hand is empty.
   * @returns {boolean} True if the hand has no cards
   */
  isEmpty () {
    return this.cards.length === 0
  }

  /**
   * Converts the hand to a plain array of card objects.
   * @returns {Object[]} An array of objects with suit and rank properties
   */
  toArray () {
    return this.cards.map(card => ({ suit: card.suit, rank: card.rank }))
  }
}
