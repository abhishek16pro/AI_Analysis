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
  volume: Number,
  ema10: Number,
  ema20: Number,
  ema30: Number,
  ema50: Number,
  ema100: Number

}, { versionKey: false });

candleSchema.index(
  { symbol: 1, timeframe: 1, timestamp: 1 },
  { unique: true }
);

export default mongoose.model("candles", candleSchema);