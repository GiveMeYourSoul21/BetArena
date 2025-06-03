const mongoose = require('mongoose');

const pokerGameSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'poker',
    required: true
  },
  players: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    username: String,
    chips: { type: Number, default: 1000 },
    cards: [{ 
      suit: String, 
      value: String, 
      hidden: { type: Boolean, default: true } 
    }],
    isBot: { type: Boolean, default: false },
    position: { type: Number, required: true },
    currentBet: { type: Number, default: 0 },
    isDealer: { type: Boolean, default: false },
    isSmallBlind: { type: Boolean, default: false },
    isBigBlind: { type: Boolean, default: false },
    isUTG: { type: Boolean, default: false },
    folded: { type: Boolean, default: false },
    isAllIn: { type: Boolean, default: false },
    hasActed: { type: Boolean, default: false }
  }],
  pot: { type: Number, default: 0 },
  sidePots: [{
    amount: Number,
    eligiblePlayers: [Number]
  }],
  deck: [{ suit: String, value: String }],
  communityCards: [{ suit: String, value: String }],
  currentRound: {
    type: String,
    enum: ['preflop', 'flop', 'turn', 'river', 'showdown'],
    default: 'preflop'
  },
  currentTurn: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished', 'eliminated', 'replaced'],
    default: 'waiting'
  },
  settings: {
    maxPlayers: { type: Number, default: 4 },
    smallBlind: { type: Number, default: 10 },
    bigBlind: { type: Number, default: 20 }
  },
  dealerPosition: { type: Number, default: 0 },
  roundData: {
    lastBet: { type: Number, default: 0 },
    lastRaise: { type: Number, default: 0 },
    betsEqualized: { type: Boolean, default: false }
  },
  winner: { type: String, default: null },
  winningHand: { type: String, default: null },
  winningCombination: { type: String, default: null },
  showdown: { type: Boolean, default: false },
  nextGameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PokerGame',
    default: null
  },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('PokerGame', pokerGameSchema); 