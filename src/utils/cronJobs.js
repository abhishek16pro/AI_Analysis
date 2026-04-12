import DynamicStg from '../../models/dynamicStg.js';
import connectRedis from './connectRedis.js';
import logger from "./logger.js";

export async function pushStrategiesToRedis() {
    try {
        const stg = await DynamicStg.find({ active: true }).lean();
        if (!stg || stg.length === 0) {
            logger.info("No active strategies found to push to Redis");
            return;
        }
        for (let s of stg) {
            logger.info("Pushing strategy to Redis", { strategy: s.name });
            const redisClient = await connectRedis();
            // push into a redis queue
            await redisClient.lpush("DMC", JSON.stringify(s));
            logger.info("Strategy pushed to Redis successfully", { strategy: s.name });
        }

    } catch (error) {
        logger.error("Error occurred while pushing strategies to Redis", { error });
    }
}