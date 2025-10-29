'use strict'
import { RANKS } from './constants.js';
export class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }

  getPointValue() {
    switch(this.rank) {
      case "A": return 4;
      case "K": return 3;
      case "Q": return 2;
      case "J": return 1;
      case "10": return 10;
      default: return 0;
    }
  }

  getRankIndex() {
    return RANKS.indexOf(this.rank);
  }

  toString() {
    return `${this.rank} of ${this.suit}`;
  }
}

