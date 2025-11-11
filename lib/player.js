import { Hand } from './hand.js'

/**
 * Represents a player in the Cinch card game.
 */
export class Player {
  /**
   * Creates a new Player instance.
   * @param {string} id - Unique identifier for the player (typically socket ID)
   * @param {number} seat - The player's seat position (0-3)
   * @param {string} [name] - The player's display name. Defaults to "Player {seat + 1}"
   */
  constructor (id, seat, name) {
    this.id = id
    this.seat = seat
    this.name = name || `Player ${seat + 1}`
    this.team = (seat % 2 === 0 ? 1 : 2)
    this.hand = new Hand()
    this.wonCards = new Hand()
  }

  /**
   * Adds a single card to the player's hand.
   * @param {Card} card - The card to add to the player's hand
   */
  addCardToHand (card) {
    this.hand.addCard(card)
  }

  /**
   * Adds multiple cards to the player's hand.
   * @param {Card[]} cards - An array of cards to add to the player's hand
   */
  addCardsToHand (cards) {
    this.hand.addCards(cards)
  }

  /**
   * Plays a card from the player's hand by index.
   * Removes and returns the card at the specified index.
   * @param {number} index - The index of the card to play
   * @returns {Card} The card that was played
   */
  playCard (index) {
    return this.hand.removeCard(index)
  }

  /**
   * Discards multiple cards from the player's hand.
   * @param {number[]} indices - An array of indices of cards to discard
   * @returns {Card[]} An array of the discarded cards
   */
  discardCards (indices) {
    return this.hand.removeCards(indices)
  }

  /**
   * Adds cards to the player's collection of won cards (from tricks).
   * @param {Card[]} cards - An array of cards won in tricks
   */
  addWonCards (cards) {
    this.wonCards.addCards(cards)
  }

  /**
   * Resets the player's state for a new hand.
   * Clears both the current hand and won cards.
   */
  resetForNewHand () {
    this.hand = new Hand()
    this.wonCards = new Hand()
  }
}
