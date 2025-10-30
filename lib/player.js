import { Hand } from './hand.js'
export class Player {
  constructor (id, seat, name) {
    this.id = id
    this.seat = seat
    this.name = name || `Player ${seat + 1}`
    this.team = (seat % 2 === 0 ? 1 : 2)
    this.hand = new Hand()
    this.wonCards = new Hand()
  }

  addCardToHand (card) {
    this.hand.addCard(card)
  }

  addCardsToHand (cards) {
    this.hand.addCards(cards)
  }

  playCard (index) {
    return this.hand.removeCard(index)
  }

  discardCards (indices) {
    return this.hand.removeCards(indices)
  }

  addWonCards (cards) {
    this.wonCards.addCards(cards)
  }

  resetForNewHand () {
    this.hand = new Hand()
    this.wonCards = new Hand()
  }
}
