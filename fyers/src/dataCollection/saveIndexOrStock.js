import { fyersModel } from "fyers-api-v3";
import { connectDB, disconnectDB } from "../utils/connectDB.js";
import Candle from "../../models/candle.js";
import dotenv from "dotenv";
dotenv.config();

var fyers = new fyersModel({ enableLogging: false });

fyers.setAppId(process.env.client_id);
fyers.setRedirectUrl(process.env.redirect_uri);
fyers.setAccessToken(process.env.access_token);

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
        console.warn("Invalid response format or no candles data");
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
                symbol,
                exchange,
                instrument,
                underlying,
                timeframe: timeframeStr,
                timestamp: Number(timestamp),
                date: new Date(Number(timestamp) * 1000),
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
                console.error(`Error saving candle for ${symbol}:`, error.message);
            }
        }
    }

    console.log(`Saved: ${saved}, Duplicates (skipped): ${duplicates}, Errors: ${errors} for ${symbol} (${timeframeStr})`);
    return { saved, errors };
}

/**
 * Fetch and save index/stock data for a given time range
 * @param {String} symbol - Index/Stock symbol (e.g., "NSE:NIFTY50-INDEX" or "NSE:SBIN-EQ")
 * @param {String} startDateStr - Start date (YYYY-MM-DD)
 * @param {String} endDateStr - End date (YYYY-MM-DD)
 * @param {String} timeframe - Candle timeframe in minutes (default: "5")
 */
export async function saveHistoricalData(symbol, startDateStr, endDateStr, timeframe = "5") {
    try {
        await connectDB();
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        if (isNaN(start) || isNaN(end) || start > end) throw new Error("Invalid start or end date");


        console.log(`Fetching ${symbol} data from ${startDateStr} to ${endDateStr} (timeframe: ${timeframe}m)`);

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

            const range_from = formatDate(chunkStart);
            const range_to = formatDate(chunkEnd);

            let inp = {
                symbol: symbol,
                resolution: timeframe,
                date_format: "1",
                range_from: range_from,
                range_to: range_to,
                cont_flag: "1",
            };

            try {
                console.log(`Fetching ${symbol} data for ${range_from} to ${range_to}`);
                const response = await fyers.getHistory(inp);
                const { saved, errors } = await saveIndexOrStockCandles(response, symbol, timeframe);

                totalSaved += saved;
                totalErrors += errors;
            } catch (err) {
                console.error(`Error fetching ${symbol} data for ${range_from} to ${range_to}:`, err.message);
                totalErrors++;
            }

            cursor = new Date(nextMonth);
            await new Promise((r) => setTimeout(r, 250));
        }

        console.log(
            `Data fetch complete for ${symbol}. Total saved: ${totalSaved}, Total errors: ${totalErrors}`
        );
        return { totalSaved, totalErrors };
    } catch (error) {
        console.error("Error in saveHistoricalData:", error.message);
    }
    finally {
        await disconnectDB();
    }
}

export { saveIndexOrStockCandles };

