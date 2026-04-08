import { timeframes, supportedEma, symbols, indexMapping } from './constant.js';
import { saveHistoricalData } from '../dataCollection/saveIndexOrStock.js';
import { applyEmaUsingReqCandles } from './applyEMA.js';
import logger from './logger.js';
import { emitter, channels } from './eventEmitter.js';

export const getEpochRange = (minutes) => {
    const now = new Date();
    now.setSeconds(0, 0);
    const start = Math.floor(now.getTime() / 1000) - 2 * minutes * 60;
    const end = Math.floor(now.getTime() / 1000) - minutes * 60;
    return { start, end};
};

export async function saveLiveCandle() {
    try {
        for (const tf of timeframes) {
            const tfInt = parseInt(tf);
            for (const symbol of symbols) {

                let { start, end } = getEpochRange(tfInt);
                logger.info('saveLiveCandle - range', { symbol, timeframe: `${tf}m`, start, end });

                await saveHistoricalData(indexMapping[symbol], start, end, '0', tf);
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
    // temp changes 
    // emitter.emit(channels.DATA_SAVED);

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
        logger.info("Waiting for market open", { now: now.toLocaleString(), marketStart: marketStart.toLocaleString() });
        return;
    }

    if (now > marketEnd) {
        logger.info("Market closed, stopping scheduler", { now: now.toLocaleString(), marketEnd: marketEnd.toLocaleString() });
        if (interval) clearInterval(interval);
        return;
    }

    logger.info("Running scheduler", { now: now.toLocaleString() });

    await saveLiveCandle();

    // Emit event after data is successfully saved
    emitter.emit(channels.DATA_SAVED);
}