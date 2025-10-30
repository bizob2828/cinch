export class Hand {
  constructor () {
    this.cards = []
  }

  addCard (card) {
    this.cards.push(card)
  }

  addCards (cards) {
    this.cards.push(...cards)
  }

  removeCard (index) {
    return this.cards.splice(index, 1)[0]
  }

  removeCards (indices) {
    // Sort indices descending to avoid index shifting
    const sortedIndices = indices.sort((a, b) => b - a)
    const removedCards = []
    for (const index of sortedIndices) {
      removedCards.push(this.cards.splice(index, 1)[0])
    }
    return removedCards
  }

  hasCard (suit, rank) {
    return this.cards.some(card => card.suit === suit && card.rank === rank)
  }

  hasSuit (suit) {
    return this.cards.some(card => card.suit === suit)
  }

  getCardsOfSuit (suit) {
    return this.cards.filter(card => card.suit === suit)
  }

  getNonTrumpCards (trumpSuit) {
    return this.cards.filter(card => card.suit !== trumpSuit)
  }

  getNonTrumpIndices (trumpSuit) {
    return this.cards.map((card, index) => ({ card, index }))
      .filter(({ card }) => card.suit !== trumpSuit)
      .map(({ index }) => index)
  }

  getTotalPointValue () {
    return this.cards.reduce((total, card) => total + card.getPointValue(), 0)
  }

  size () {
    return this.cards.length
  }

  isEmpty () {
    return this.cards.length === 0
  }

  toArray () {
    return this.cards.map(card => ({ suit: card.suit, rank: card.rank }))
  }
}
