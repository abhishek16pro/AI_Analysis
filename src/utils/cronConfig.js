import cron from 'node-cron';
import { pushStrategiesToRedis } from './cronJobs.js';
import logger from './logger.js';
import { saveSingleHistorical } from '../../oneTimeHistorical.js';

const cronConfig = {
    pushStg: '30 9 * * *', // 9:30 AM daily
    saveHistorical: '35 15 * * *', // 3:35 PM daily (after market close)
}

const pushStgJob = () => {
    cron.schedule(cronConfig.pushStg, async () => {
        try {
            logger.info(`[CRON] Starting push strategies job at ${new Date().toISOString()}`);
            await pushStrategiesToRedis();
            logger.info('[CRON] Push strategies job completed successfully');
        } catch (error) {
            logger.error('[CRON] Push strategies job failed:', { error });
        }
    });
};
    
const saveHistoricalDataJob = () => {
    cron.schedule(cronConfig.saveHistorical, async () => {
        try {
            logger.info(`[CRON] Starting save historical data job at ${new Date().toISOString()}`);
            await saveSingleHistorical();
            logger.info('[CRON] Save historical data job completed successfully');
        } catch (error) {
            logger.error('[CRON] Save historical data job failed:', { error });
        }
    });
};


export const initializeCronJobs = async () => {
    logger.info('[CRON] Initializing cron jobs...');
    pushStgJob();
    saveHistoricalDataJob();
    logger.info('[CRON] All cron jobs initialized successfully');
};