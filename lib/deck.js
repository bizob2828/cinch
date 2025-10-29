import { SUITS, RANKS } from './constants.js';
import { Card } from './card.js';
export class Deck {
  constructor() {
    this.cards = [];
    this.createDeck();
  }

  createDeck() {
    this.cards = [];
    for(const suit of SUITS) {
      for(const rank of RANKS) {
        this.cards.push(new Card(suit, rank));
      }
    }
  }

  shuffle() {
    for(let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  deal(numCards = 1) {
    return this.cards.splice(0, numCards);
  }

  isEmpty() {
    return this.cards.length === 0;
  }

  size() {
    return this.cards.length;
  }
}

