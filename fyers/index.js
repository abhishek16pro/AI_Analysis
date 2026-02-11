import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { updateVWAP } from "./src/indicators/vwap.js";
import { vwapPullback } from "./src/indicators/vwap.Pullback.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, "src", "data.json");
const raw = fs.readFileSync(dataPath, "utf8");
const data = JSON.parse(raw);

// Rolling average volume window
const avgWindow = 20;
const volumes = [];

let signals = [];

for (const row of data) {
  const [ts, open, high, low, close, volume] = row;
  const d = new Date(ts * 1000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const time = `${hh}:${mm}`;

  volumes.push(volume);
  if (volumes.length > avgWindow) volumes.shift();
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

  const candle = {
    timestamp: d.toISOString().slice(0, 16).replace("T", " "),
    open,
    high,
    low,
    close,
    volume
  };

  const vwap = updateVWAP(candle);
  const signal = vwapPullback(candle, { vwap, avgVolume, time });

  if (signal) {
    signals.push({ ts, time, close, vwap: Number(vwap.toFixed(2)), volume, avgVolume: Math.round(avgVolume) });
  }
}

console.log("rows", data.length);
console.log("signals", signals.length);
console.log("first5", signals.slice(0, 5));
