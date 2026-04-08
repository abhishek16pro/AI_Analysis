import { fyersModel } from "fyers-api-v3";
import Candle from "../../models/candle.js";
import connectRedis from "../utils/connectRedis.js";
import logger from "../utils/logger.js";
import dotenv from "dotenv";
import { indexMapping } from "../utils/constant.js";
import { saveLog } from "../utils/saveLogs.js";
dotenv.config();

var fyers = new fyersModel({ enableLogging: false });
const client = await connectRedis();
const access_token = await client.get("FYERS_TOKEN");

fyers.setAppId(process.env.client_id);
fyers.setRedirectUrl(process.env.redirect_uri);
fyers.setAccessToken(access_token);

function formatDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Save index or stock candles data to MongoDB
 * Format: {
 *   "symbol": "NSE:NIFTY50-INDEX",
 *   "exchange": "NSE",
 *   "instrument": "INDEX",
 *   "underlying": "NIFTY",
 *   "timeframe": "5m",
 *   "timestamp": 1707904500,
 *   "open": 22500,
 *   "high": 22520,
 *   "low": 22490,
 *   "close": 22510,
 *   "volume": 0
 * }
 */
async function saveIndexOrStockCandles(response, symbol, timeframe = "5") {
    if (!response || !response.candles || !Array.isArray(response.candles)) {
        logger.warn("Invalid response format or no candles data");
        saveLog(symbol, "WARN", `Invalid response format or no candles data for ${symbol}`);
        return { saved: 0, errors: 0 };
    }

    const exchange = symbol.split(":")[0];
    const isIndex = symbol.includes("-INDEX");
    const instrument = isIndex ? "INDEX" : "STOCK";
    const underlying = isIndex ? symbol.slice(symbol.indexOf(":") + 1, symbol.indexOf("-")) : symbol.slice(symbol.indexOf(":") + 1);
    const timeframeStr = `${timeframe}m`;

    let saved = 0;
    let errors = 0;
    let duplicates = 0;

    for (const candle of response.candles) {
        try {
            const [timestamp, open, high, low, close, volume] = candle;

            const candleDoc = {
                symbol: indexMapping[symbol] || symbol,
                exchange,
                instrument,
                underlying,
                timeframe: timeframeStr,
                timestamp: Number(timestamp),
                date: new Date(Number(timestamp) * 1000 + 5.5 * 60 * 60 * 1000), // Convert UTC to IST (UTC+5:30)
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
                volume: Number(volume) || 0,
            };

            await Candle.insertOne(candleDoc);
            saved++;
        } catch (error) {
            if (error.code === 11000) {
                // Duplicate key error - skip silently
                duplicates++;
            } else {
                errors++;
                logger.error(`Error saving candle for ${symbol}:`, error.message);
                saveLog(symbol, "ERROR", `Error saving candle for ${symbol}: ${error.message}`);
            }
        }
    }

    logger.info(`Saved: ${saved}, Duplicates (skipped): ${duplicates}, Errors: ${errors} for ${symbol} (${timeframeStr})`);
    return { saved, errors };
}

/**
 * Fetch and save index/stock data for a given time range
 * @param {String} symbol - Index/Stock symbol (e.g., "NSE:NIFTY50-INDEX" or "NSE:SBIN-EQ")
 * @param {String} startDateStr - Start date (YYYY-MM-DD)
 * @param {String} endDateStr - End date (YYYY-MM-DD)
 * @param {String} dateFormat -date_format is a boolean flag. 0 to enter the epoch value. Eg:670073472. 1 to enter the date format as yyyy-mm-dd. Eg: 2023-11-29    
 * @param {String} timeframe - Candle timeframe in minutes (default: "5")
 */
export async function saveHistoricalData(symbol, startDateStr, endDateStr, dateFormat, timeframe) {
    try {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        if (isNaN(start) || isNaN(end) || start > end) throw new Error("Invalid start or end date");


        logger.info(`Fetching ${symbol} data from ${startDateStr} to ${endDateStr} (timeframe: ${timeframe}m)`);

        let cursor = new Date(start);
        let totalSaved = 0;
        let totalErrors = 0;

        while (cursor <= end) {
            const chunkStart = new Date(cursor);
            const nextMonth = new Date(chunkStart);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            let chunkEnd = new Date(nextMonth);
            chunkEnd.setDate(chunkEnd.getDate() - 1);
            if (chunkEnd > end) chunkEnd = new Date(end);

            const range_from = dateFormat == 0 ? Math.floor(chunkStart.getTime()).toString() : formatDate(chunkStart);
            const range_to = dateFormat == 0 ? Math.floor(chunkEnd.getTime()).toString() : formatDate(chunkEnd);

            let inp = {
                symbol: symbol,
                resolution: timeframe,
                date_format: dateFormat,
                range_from: range_from,
                range_to: range_to,
                cont_flag: "1",
            };

            try {
                logger.info(`Fetching ${symbol} data for ${range_from} to ${range_to}`);
                const response = await fyers.getHistory(inp);
                // logger.info(`Response for ${symbol} data:`, response);

                const { saved, errors } = await saveIndexOrStockCandles(response, symbol, timeframe);

                totalSaved += saved;
                totalErrors += errors;
            } catch (err) {
                logger.error(`Error fetching ${symbol} data for ${range_from} to ${range_to}:`, err.message);
                saveLog(symbol, "ERROR", `Error fetching ${symbol} data for ${range_from} to ${range_to}: ${err.message}`);
                totalErrors++;
            }

            cursor = new Date(nextMonth);
            await new Promise((r) => setTimeout(r, 250));
        }

        logger.info(
            `Data fetch complete for ${symbol}. Total saved: ${totalSaved}, Total errors: ${totalErrors}`
        );
        return { totalSaved, totalErrors };
    } catch (error) {
        logger.error("Error in saveHistoricalData:", error.message);
        saveLog(symbol, "ERROR", `Error in saveHistoricalData for ${symbol}: ${error.message}`);
    }
}

export { saveIndexOrStockCandles };

