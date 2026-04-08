import { timeframes, supportedEma, symbols, indexMapping } from './constant.js';
import { saveHistoricalData } from '../dataCollection/saveIndexOrStock.js';
import { applyEmaUsingReqCandles } from './applyEMA.js';
import logger from './logger.js';
import { emitter, channels } from './eventEmitter.js';

export function getEpochRange(timeframeMin) {
    const timeframeSec = timeframeMin * 60;

    // Current time in seconds
    const now = Math.floor(new Date().getTime() / 1000);

    // ===== MARKET START (Today 09:15 IST) =====
    const nowDate = new Date();
    const marketStart = new Date(
        nowDate.getFullYear(),
        nowDate.getMonth(),
        nowDate.getDate(),
        9,
        15,
        0,
        0
    );

    const marketStartEpoch = Math.floor(marketStart.getTime() / 1000);

    // ❌ Before market open
    if (now < marketStartEpoch) return null;

    // ===== Time passed since market open =====
    const elapsed = now - marketStartEpoch;

    // ===== Number of FULL candles formed =====
    const completedCandles = Math.floor(elapsed / timeframeSec);

    // ❌ No candle completed yet
    if (completedCandles <= 0) return null;

    // ===== Last completed candle =====
    const endEpoch = marketStartEpoch + completedCandles * timeframeSec - 1;
    const startEpoch = endEpoch - timeframeSec + 1;

    return {
        startEpoch,
        endEpoch,
    };
}

export async function saveLiveCandle() {
    try {
        for (const tf of timeframes) {
            const tfInt = parseInt(tf);
            for (const symbol of symbols) {

                let { startEpoch, endEpoch } = getEpochRange(tfInt);
                if (!startEpoch || !endEpoch) {
                    logger.info('saveLiveCandle - No valid range', { symbol, timeframe: `${tf}m` });
                    continue;
                }

                logger.info('saveLiveCandle - range', { symbol, timeframe: `${tf}m`, startEpoch, endEpoch });

                await saveHistoricalData(indexMapping[symbol], startEpoch, endEpoch, '0', tf);
                for (const ema of supportedEma) {
                    await applyEmaUsingReqCandles(symbol, `${tf}m`, ema);
                }

            }
        }

    } catch (error) {
        console.log("Error:", error);
    }
}

export function startMarketScheduler() {

    const marketStart = new Date();
    marketStart.setHours(9, 15, 0, 0);

    const marketEnd = new Date();
    marketEnd.setHours(15, 30, 0, 0);

    const now = new Date();

    // ⛔ If market already closed
    if (now > marketEnd) {
        console.log("❌ Market already closed");
        return;
    }

    // ⏳ Delay until next exact minute boundary
    const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    logger.info("🚀 Scheduler initialized", { now: now.toLocaleString() });
    logger.info("⏳ First run will start", { firstRun: new Date(now.getTime() + delay).toLocaleString() });

    setTimeout(() => {
        runIfMarketOpen(marketStart, marketEnd);

        // 🔁 Run every 1 min
        const interval = setInterval(() => {
            runIfMarketOpen(marketStart, marketEnd, interval);
        }, 60000);

    }, delay);
}

async function runIfMarketOpen(marketStart, marketEnd, interval = null) {
    const now = new Date();

    if (now < marketStart) {
        // logger.info("Waiting for market open", { now: now.toLocaleString(), marketStart: marketStart.toLocaleString() });
        return;
    }

    if (now > marketEnd) {
        // logger.info("Market closed, stopping scheduler", { now: now.toLocaleString(), marketEnd: marketEnd.toLocaleString() });
        if (interval) clearInterval(interval);
        return;
    }

    logger.info("Running scheduler", { now: now.toLocaleString() });

    await saveLiveCandle();

    // Emit event after data is successfully saved
    emitter.emit(channels.DATA_SAVED);
}