import { connectDB, disconnectDB } from '../utils/connectDB.js';
import Candle from "../../models/candle.js";

const EMA_GAP_THRESHOLD = 20; // point and percentage gap threshold
const COOLDOWN_CANDLES = 3;   // current single is only valid for 3 candles to prevent overtrading

// ====== BACKTEST ======
async function runBacktest(startTime = "2026-03-24", endTime = "2026-03-24") {
    await connectDB();

    let trades = [];
    let lastTradeIndex = -COOLDOWN_CANDLES; // ✅ cooldown tracker

    // Date conversion
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const start = Math.floor(startDate.getTime() / 1000);
    const end = Math.floor(endDate.getTime() / 1000);

    const query = {
        symbol: "NSE:NIFTY50-INDEX",
        timeframe: "10m",
        timestamp: {
            $gte: start,
            $lte: end
        }
    };

    let candles = await Candle.find(query).sort({ timestamp: 1 });

    // ✅ use index loop (needed for cooldown)
    for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];

        if (!candle.ema10 || !candle.ema20) continue;

        // ❌ cooldown check
        if (i - lastTradeIndex < COOLDOWN_CANDLES) continue;

        let pullbackSignal = detectPullback(candle, candle.ema10, candle.ema20);

        if (pullbackSignal.signal) {
            trades.push({
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                time: new Date(candle.timestamp * 1000).toLocaleString(),
                ...pullbackSignal
            });

            // ✅ update last trade index
            lastTradeIndex = i;
        }
    }

    await disconnectDB();
    console.table(trades);

    return trades;
}

function detectPullback(candle, ema10, ema20) {
    const { open, high, low, close } = candle;

    let trend = null;
    let signal = null;

    if (ema10 > ema20) trend = "UP";
    else if (ema10 < ema20) trend = "DOWN";

    const pullbackBuy = low <= ema10 || low <= ema20;
    const pullbackSell = high >= ema10 || high >= ema20;

    const emaGap = Math.abs(ema10 - ema20) > EMA_GAP_THRESHOLD;

    const bullish = close > open;
    const bearish = close < open;

    if (trend === "UP" && pullbackBuy && bullish && emaGap) {
        signal = "BUY";
    }

    if (trend === "DOWN" && pullbackSell && bearish && emaGap) {
        signal = "SELL";
    }

    return { trend, signal };
}

// ===== RUN =====
runBacktest().then(() => {
    console.log("Backtest Completed");
});