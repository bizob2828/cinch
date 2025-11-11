/**
 * The four card suits used in the game.
 * @type {string[]}
 */
export const SUITS = ['♥', '♦', '♣', '♠']

/**
 * Card ranks in ascending order from lowest (2) to highest (Ace).
 * Index in this array determines card strength for trick resolution.
 * @type {string[]}
 */
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

/**
 * Mapping of bid names to their point values.
 * 'pass' = 0, number bids = face value, 'cinch' = 11 points.
 * @type {Object.<string, number>}
 */
export const BID_VALUES = { pass: 0, 1: 1, 2: 2, 3: 3, 4: 4, cinch: 11 }
