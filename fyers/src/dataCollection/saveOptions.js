import { fyersModel } from "fyers-api-v3";
import connectDB from "../utils/connectDB.js";
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
 * Extract option details from symbol
 * Example: NSE:NIFTY26FEB25000CE -> { expiry: "2026-02-26", strike: 25000, option_type: "CE" }
 */
function extractOptionDetails(symbol) {
    const sym = symbol.split(":")[1] || symbol;
    
    const match = sym.match(/(\d{2})([A-Z]{3})(\d+)([CP][EA]?)$/);
    
    if (!match) return null;
    
    const [, day, month, strike, optionType] = match;
    
    const months = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
    const monthNum = months[month];
    
    const year = 2026;
    const expiryDate = new Date(year, monthNum - 1, parseInt(day));
    const expiryStr = expiryDate.toISOString().split('T')[0];
    
    return {
        expiry: expiryStr,
        strike: parseInt(strike),
        option_type: optionType
    };
}

/**
 * Get underlying from option symbol
 * Example: NSE:NIFTY26FEB25000CE -> NIFTY
 */
function getUnderlyingFromOption(symbol) {
    const sym = symbol.split(":")[1] || symbol;
    
    if (sym.includes("BANKNIFTY")) return "BANKNIFTY";
    if (sym.includes("FINNIFTY")) return "FINNIFTY";
    if (sym.includes("MIDCPNIFTY")) return "MIDCPNIFTY";
    if (sym.includes("NIFTY")) return "NIFTY";
    
    return "NIFTY";
}

/**
 * Save options candles data to MongoDB
 * Format: {
 *   "symbol": "NSE:NIFTY26FEB25000CE",
 *   "exchange": "NSE",
 *   "instrument": "OPTION",
 *   "underlying": "NIFTY",
 *   "expiry": "2026-02-26",
 *   "strike": 25000,
 *   "option_type": "CE",
 *   "timeframe": "5m",
 *   "timestamp": 1707904500,
 *   "date": ISODate("2026-02-14T09:55:00Z"),
 *   "open": 120,
 *   "high": 125,
 *   "low": 118,
 *   "close": 122,
 *   "volume": 15000
 * }
 */
async function saveOptionsCandles(response, symbol, timeframe = "5") {
    if (!response || !response.candles || !Array.isArray(response.candles)) {
        console.warn("Invalid response format or no candles data");
        return { saved: 0, errors: 0 };
    }
    
    const exchange = symbol.split(":")[0];
    const underlying = getUnderlyingFromOption(symbol);
    const optionDetails = extractOptionDetails(symbol);
    const timeframeStr = `${timeframe}m`;
    
    let saved = 0;
    let errors = 0;
    let duplicates = 0;

    if (!optionDetails) {
        console.error(`Could not extract option details from ${symbol}`);
        return { saved: 0, errors: 1 };
    }

    for (const candle of response.candles) {
        try {
            const [timestamp, open, high, low, close, volume] = candle;

            const candleDoc = {
                symbol,
                exchange,
                instrument: "OPTION",
                underlying,
                expiry: optionDetails.expiry,
                strike: optionDetails.strike,
                option_type: optionDetails.option_type,
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
 * Fetch and save options data for a given time range
 * @param {String} symbol - Options symbol (e.g., "NSE:NIFTY26FEB25000CE")
 * @param {String} startDateStr - Start date (YYYY-MM-DD)
 * @param {String} endDateStr - End date (YYYY-MM-DD)
 * @param {String} timeframe - Candle timeframe in minutes (default: "5")
 */
export async function saveOptionsData(symbol, startDateStr, endDateStr, timeframe = "5") {
    await connectDB();

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start) || isNaN(end) || start > end) {
        throw new Error("Invalid start or end date");
    }

    console.log(
        `Fetching options ${symbol} data from ${startDateStr} to ${endDateStr} (timeframe: ${timeframe}m)`
    );

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
            console.log(`Fetching ${symbol} options data for ${range_from} to ${range_to}`);
            const response = await fyers.getHistory(inp);
            const { saved, errors } = await saveOptionsCandles(response, symbol, timeframe);

            totalSaved += saved;
            totalErrors += errors;
        } catch (err) {
            console.error(`Error fetching ${symbol} options data for ${range_from} to ${range_to}:`, err.message);
            totalErrors++;
        }

        cursor = new Date(nextMonth);
        await new Promise((r) => setTimeout(r, 250));
    }

    console.log(
        `Options data fetch complete for ${symbol}. Total saved: ${totalSaved}, Total errors: ${totalErrors}`
    );
    return { totalSaved, totalErrors };
}

export { saveOptionsCandles };
