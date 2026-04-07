import { saveHistoricalData } from './src/dataCollection/saveIndexOrStock.js'
import { applyEmaUsingAllCandles } from './src/utils/applyEMA.js'
import { connectDB, disconnectDB } from './src/utils/connectDB.js'
import { timeframes, supportedEma, symbols } from './src/utils/constant.js'


async function saveSingleHistorical() {
    try {
        await connectDB()
        const today = new Date().toISOString().split('T')[0];
        console.log(today);

        for (const symbol of symbols) {
            for (const tf of timeframes) {
                await saveHistoricalData(symbol, '2026-04-07', today, '1', tf)
                for (const ema of supportedEma) {
                    // console.log("RUnning for EMA========>", ema);
                    await applyEmaUsingAllCandles(symbol, `${tf}m`, ema)
                }
            }
        }
    } catch (error) {
        console.error("Error in saveSingleHistorical:", error);
    } finally {
        await disconnectDB()
    }
}
await saveSingleHistorical()