import { saveHistoricalData } from './src/dataCollection/saveIndexOrStock.js'
import { applyEmaUsingAllCandles } from './src/utils/applyEMA.js'
import { connectDB } from './src/utils/connectDB.js'
import { timeframes, supportedEma, symbols, indexMapping } from './src/utils/constant.js'


async function saveSingleHistorical() {
    try {
        await connectDB()
        const today = new Date().toISOString().split('T')[0];

        for (const symbol of symbols) {
            for (const tf of timeframes) {
                await saveHistoricalData(indexMapping[symbol], '2026-01-01', today, '1', tf)
                for (const ema of supportedEma) {
                    await applyEmaUsingAllCandles(symbol, `${tf}m`, ema)
                }
            }
        }
    } catch (error) {
        console.error("Error in saveSingleHistorical:", error);
    }
}

await saveSingleHistorical()