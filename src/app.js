import { runPullbackStrategy } from './strategy/pullback.js';
import { connectDB } from './utils/connectDB.js';
import connectRedis from './utils/connectRedis.js';
import { startMarketScheduler } from './utils/saveLiveData.js';
import { emitter, channels } from './utils/eventEmitter.js';
import { initializeCronJobs } from './utils/cronConfig.js';
import './strategybuilder/pullback.js';
import logger from './utils/logger.js';

async function executeStrategies() {
    try {

        const redisClient = await connectRedis();
        const runningStg = await redisClient.lrange("DMC", 0, -1);
        const ParallelCheckPromise = [];

        for (let s of runningStg) {
            s = JSON.parse(s);
            logger.info("Running strategy", { strategy: s.name, type: s.strategyType.toUpperCase() });

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

    // Listen for data save completion event
    emitter.on(channels.DATA_SAVED, async () => {
        logger.info("📊 Data saved successfully, running strategies...");
        await executeStrategies();
    });

    startMarketScheduler();
    await executeStrategies();
}

startApp();