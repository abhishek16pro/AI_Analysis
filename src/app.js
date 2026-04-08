import { runPullbackStrategy } from './strategy/pullback.js';
import { connectDB } from './utils/connectDB.js';
import DynamicStg from '../models/dynamicStg.js';
import { startMarketScheduler } from './utils/saveLiveData.js';
import { emitter, channels } from './utils/eventEmitter.js';
import './strategybuilder/pullback.js';
import logger from './utils/logger.js';

async function executeStrategies() {
    try {
        const ParallelCheckPromise = [];

        const stg = await DynamicStg.find({ isActive: true }).lean();

        for (let s of stg) {
            logger.info("Running strategy", { strategy: s.name });

            if (s.isActive && s.type.toUpperCase() === "PULLBACK") {
                ParallelCheckPromise.push(runPullbackStrategy(s));
            }
        }

        await Promise.all(ParallelCheckPromise);

    } catch (error) {
        logger.error("Error in execution", { error: error.message || error, stack: error.stack });
    }
}

async function startApp() {
    await connectDB();

    // Listen for data save completion event
    emitter.on(channels.DATA_SAVED, async () => {
        console.log("📊 Data saved successfully, running strategies...");
        await executeStrategies();
    });

    startMarketScheduler();
    // await executeStrategies();
}

startApp();