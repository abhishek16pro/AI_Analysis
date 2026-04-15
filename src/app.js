import { runPullbackStrategy } from './strategy/pullback.js';
import { connectDB } from './utils/connectDB.js';
import connectRedis from './utils/connectRedis.js';
import { startMarketScheduler } from './utils/saveLiveData.js';
import { emitter, channels } from './utils/eventEmitter.js';
import { initializeCronJobs } from './utils/cronConfig.js';
import { pushStrategiesToRedis } from './utils/cronJobs.js';
import './strategybuilder/pullback.js';
import logger from './utils/logger.js';

function isCurrentTimeBetween(startTime, endTime) {
    if (!startTime || !endTime) return false;

    const now = new Date();
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;

    if (endTotal >= startTotal) {
        return nowMinutes >= startTotal && nowMinutes <= endTotal;
    }

    // Overnight window, e.g. 22:00 to 05:00
    return nowMinutes >= startTotal || nowMinutes <= endTotal;
}

async function executeStrategies() {
    try {

        const redisClient = await connectRedis();
        const runningStg = await redisClient.lrange("DMC", 0, -1);
        const ParallelCheckPromise = [];

        for (let s of runningStg) {
            s = JSON.parse(s);

            const strategyStart = s.start || s.startTime;
            const strategyEnd = s.end || s.endTime;

            // logger.info("Running strategy", { strategy: s.name, type: s.strategyType.toUpperCase(), start: strategyStart, end: strategyEnd });
            if (!s.active) {
                logger.info("Skipping inactive strategy", { strategy: s.name });
                continue;
            }

            if (strategyStart && strategyEnd && !isCurrentTimeBetween(strategyStart, strategyEnd)) {
                logger.info("Skipping strategy because current time is outside the start/end window", { strategy: s.name, start: strategyStart, end: strategyEnd });
                continue;
            }

            switch (s.strategyType.toUpperCase()) {
                case "EMA_CROSSOVER":
                    ParallelCheckPromise.push(runPullbackStrategy(s));
                    break;
                default:
                    logger.warn("No matching strategy found", { strategyType: s.strategyType });
                    break;
            }
        }

        await Promise.all(ParallelCheckPromise);

    } catch (error) {
        logger.error("Error in execution", { error: error.message || error, stack: error.stack });
    }
}

async function startApp() {
    await connectDB();
    initializeCronJobs();
    // await pushStrategiesToRedis(); // Initial push of strategies to Redis on app start

    // Listen for data save completion event
    emitter.on(channels.DATA_SAVED, async () => {
        logger.info("📊 Data saved successfully, running strategies...");
        await executeStrategies();
    });

    startMarketScheduler();
    // await executeStrategies();
}


startApp();