import { connectDB } from '../src/utils/connectDB.js';
import Candle from '../models/candle.js';

await connectDB();

const symbol = 'NSE:NIFTY50-INDEX';
const timeframe = '5m';

// Get all candles for the symbol
const candles = await Candle.find({ symbol, timeframe }).sort({ timestamp: 1 });

console.log(`\nTotal candles: ${candles.length}`);
console.log(`Expected per day: 75 (6.25 hours / 5 min)\n`);

// Group by date
const byDate = {};
candles.forEach(candle => {
    const date = new Date(candle.date).toISOString().split('T')[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(candle);
});

// Show missing dates
const dates = Object.keys(byDate).sort();
let totalMissing = 0;

console.log('Date\t\tCandles\tMissing\tStatus');
console.log('─'.repeat(50));

dates.forEach(date => {
    const count = byDate[date].length;
    const missing = Math.max(0, 75 - count);
    const status = count === 75 ? '✓ Complete' : count === 0 ? '✗ No data' : '⚠ Incomplete';

    if (missing > 0) {
        console.log(`${date}\t${count}\t${missing}\t${status}`);
        totalMissing += missing;
    }
});

console.log('─'.repeat(50));
console.log(`\nTotal Missing: ${totalMissing} candles`);
console.log(`Missing Days: ${Object.values(byDate).filter(d => d.length < 75).length}`);
