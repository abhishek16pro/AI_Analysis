function buildIndexByTs(data) {
  const map = new Map();
  for (let i = 0; i < data.length; i += 1) {
    const [ts] = data[i];
    if (!map.has(ts)) map.set(ts, i);
  }
  return map;
}

function resolveEntryPrice(candle, nextCandle, entryOnNextOpen) {
  if (entryOnNextOpen && nextCandle) return nextCandle[1];
  return candle[4];
}

function computeStops(entryPrice, riskReward, stopLossPoints, stopLossPct) {
  const risk = stopLossPoints != null
    ? stopLossPoints
    : entryPrice * (stopLossPct ?? 0.005);
  const stop = entryPrice - risk;
  const target = entryPrice + riskReward * risk;
  return { stop, target, risk };
}

export function backtestSignals({
  data,
  signals,
  riskReward = 2,
  stopLossPoints = 10,
  stopLossPct = null,
  entryOnNextOpen = false,
  maxBars = 200,
  intrabarOrder = "stop-first"
}) {
  const indexByTs = buildIndexByTs(data);
  const trades = [];

  for (const s of signals) {
    const idx = indexByTs.get(s.ts);
    if (idx == null) continue;

    const candle = data[idx];
    const nextCandle = data[idx + 1];
    const entry = resolveEntryPrice(candle, nextCandle, entryOnNextOpen);
    const { stop, target, risk } = computeStops(entry, riskReward, stopLossPoints, stopLossPct);

    let exit = entry;
    let outcome = "open";
    let exitTs = s.ts;

    const last = Math.min(data.length - 1, idx + maxBars);
    for (let i = idx + 1; i <= last; i += 1) {
      const [ts, open, high, low, close] = data[i];
      const hitStop = low <= stop;
      const hitTarget = high >= target;

      if (hitStop && hitTarget) {
        if (intrabarOrder === "target-first") {
          exit = target;
          outcome = "target";
        } else {
          exit = stop;
          outcome = "stop";
        }
        exitTs = ts;
        break;
      }

      if (hitStop) {
        exit = stop;
        outcome = "stop";
        exitTs = ts;
        break;
      }

      if (hitTarget) {
        exit = target;
        outcome = "target";
        exitTs = ts;
        break;
      }

      exit = close;
      exitTs = ts;
    }

    const pnl = exit - entry;
    trades.push({
      ts: s.ts,
      entry,
      stop,
      target,
      exit,
      exitTs,
      risk,
      outcome,
      pnl
    });
  }

  const totalPnL = trades.reduce((a, b) => a + b.pnl, 0);
  const wins = trades.filter(t => t.outcome === "target").length;
  const losses = trades.filter(t => t.outcome === "stop").length;
  const winRate = trades.length ? wins / trades.length : 0;

  return {
    riskReward,
    trades,
    totalPnL,
    wins,
    losses,
    winRate
  };
}

export function findBestRiskReward({
  data,
  signals,
  ratios = [1, 1.5, 2, 2.5, 3],
  stopLossPoints = 10,
  stopLossPct = null,
  entryOnNextOpen = false,
  maxBars = 200,
  intrabarOrder = "stop-first"
}) {
  let best = null;

  for (const riskReward of ratios) {
    const result = backtestSignals({
      data,
      signals,
      riskReward,
      stopLossPoints,
      stopLossPct,
      entryOnNextOpen,
      maxBars,
      intrabarOrder
    });

    if (
      !best ||
      result.totalPnL > best.totalPnL ||
      (result.totalPnL === best.totalPnL && result.winRate > best.winRate)
    ) {
      best = result;
    }
  }

  return best;
}
