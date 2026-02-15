import mongoose from "mongoose";

const candleSchema = new mongoose.Schema({

  symbol: { type: String, required: true },
  exchange: {
    type: String,
    required: true,
    enum: ["NSE", "BSE", "MCX"]
  },
  instrument: {
    type: String,
    required: true,
    enum: ["INDEX", "OPTION", "STOCK", "FUTURE"]
  },
  underlying: String,

  expiry: String,
  strike: Number,
  option_type: String,

  timeframe: String,

  timestamp: Number,
  date: Date,

  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number

}, { versionKey: false });

candleSchema.index(
  { symbol: 1, timeframe: 1, timestamp: 1 },
  { unique: true }
);

export default mongoose.model("candles", candleSchema);

// Example Index or Stock:
// {
//   "symbol": "NSE:NIFTY50-INDEX",
//   "exchange": "NSE",
//   "instrument": "INDEX",
//   "underlying": "NIFTY",
//   "timeframe": "5m",

//   "timestamp": 1707904500,
//   "open": 22500,
//   "high": 22520,
//   "low": 22490,
//   "close": 22510,
//   "volume": 0
// }


// Example Options:
// {
//   "symbol": "NSE:NIFTY26FEB25000CE",
//   "exchange": "NSE",
//   "instrument": "OPTION",
//   "underlying": "NIFTY",
//   "expiry": "2026-02-26",
//   "strike": 25000,
//   "option_type": "CE",
//   "timeframe": "5m",

//   "timestamp": 1707904500,
//   "date": ISODate("2026-02-14T09:55:00Z"),

//   "open": 120,
//   "high": 125,
//   "low": 118,
//   "close": 122,
//   "volume": 15000
// }
