import { fyersModel } from 'fyers-api-v3'
import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var fyers = new fyersModel({ "path": "./logs", "enableLogging": true })
fyers.setAppId(process.env.client_id)
fyers.setRedirectUrl(process.env.redirect_uri)
fyers.setAccessToken(process.env.access_token);

// fyers.getQuotes(["NSE:SBIN-EQ"]).then((response) => {
//     console.log(JSON.stringify(response, null, 2))
// }).catch((err) => {
//     console.log(err)
// })

var inp = {
    "symbol": "NSE:BSE-EQ",
    "resolution": "5",
    "date_format": "1",
    "range_from": "2026-01-01",
    "range_to": "2026-02-11",
    "cont_flag": "1"
}

function saveToFiles(data, symbol, rangeFrom, rangeTo) {
    const dataDir = path.join(__dirname, '../data');

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create filename
    const filename = `${symbol}_${rangeFrom}_${rangeTo}`;
    const jsonPath = path.join(dataDir, `${filename}.json`);
    const csvPath = path.join(dataDir, `${filename}.csv`);

    // Save JSON
    fs.writeFileSync(jsonPath, JSON.stringify(data.candles, null, 2));
    console.log(`JSON saved to: ${jsonPath}`);

    // Save CSV
    if (data.candles && data.candles.length > 0) {
        const csvHeader = 'timestamp,open,high,low,close,volume\n';
        const csvRows = data.candles.map(candle =>
            `${candle[0]},${candle[1]},${candle[2]},${candle[3]},${candle[4]},${candle[5]}`
        ).join('\n');

        fs.writeFileSync(csvPath, csvHeader + csvRows);
        console.log(`CSV saved to: ${csvPath}`);
    }
}

fyers.getHistory(inp).then((response) => {
    console.log(JSON.stringify(response, null, 2))
    saveToFiles(response, inp.symbol.replace(":", "-"), inp.range_from, inp.range_to);
}).catch((err) => {
    console.log(err)
})

