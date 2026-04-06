import { EMA } from 'technicalindicators';
import Candle from "../../models/candle.js";

export async function applyEmaUsingAllCandles(index = 'NSE:NIFTY50-INDEX', timeframe = '10m', period = 10) {
    try {
        // 1. Fetch sorted data (VERY IMPORTANT)
        const candles = await Candle.find({
            symbol: index,
            timeframe: timeframe
        }).sort({ timestamp: 1 });

        console.log("Total candles:", candles.length);

        // 2. Extract close prices
        const closePrices = candles.map(c => c.close);

        // 3. Calculate EMA
        const emaValues = EMA.calculate({
            period,
            values: closePrices
        });

        console.log("EMA calculated:", emaValues.length);

        // 4. Update DB
        const bulkOps = [];

        for (let i = period - 1; i < candles.length; i++) {
            const ema = emaValues[i - (period - 1)];

            bulkOps.push({
                updateOne: {
                    filter: { _id: candles[i]._id },
                    update: { $set: { [`ema${period}`]: ema } } // field name
                }
            });
        }

        if (bulkOps.length > 0) {
            let result = await Candle.bulkWrite(bulkOps);
            console.log(result);
        }
        console.log("✅ EMA added successfully");
    } catch (err) {
        console.error(err);
    }
}

export async function applyEmaUsingReqCandles(index, timeframe, period) {
    try {
        const multiplier = 2 / (period + 1);

        // 1. Last candle jisme EMA already hai
        const lastEmaCandle = await Candle.findOne({
            symbol: index,
            timeframe: timeframe,
            [`ema${period}`]: { $exists: true }
        }).sort({ timestamp: -1 });

        if (!lastEmaCandle) {
            console.log("No previous EMA found. Run full calculation once.");
            return;
        }

        let prevEma = lastEmaCandle[`ema${period}`];
        let lastTimestamp = lastEmaCandle.timestamp;

        console.log("Starting EMA from:", new Date(lastTimestamp * 1000));

        // 2. Next candles jisme EMA nahi hai
        const candles = await Candle.find({
            symbol: index,
            timeframe: timeframe,
            timestamp: { $gt: lastTimestamp },
            [`ema${period}`]: { $exists: false }
        }).sort({ timestamp: 1 });

        console.log("Candles to update:", candles.length);

        // 3. Loop and update EMA
        for (let candle of candles) {
            const currentClose = candle.close;

            const ema = (currentClose - prevEma) * multiplier + prevEma;

            // Update DB
            await Candle.updateOne(
                { _id: candle._id },
                { $set: { [`ema${period}`]: ema } }
            );

            prevEma = ema; // update for next iteration
        }

        console.log("EMA update completed ✅");

    } catch (err) {
        console.error("applyEmaUsingReqCandles:", err);
    }
}