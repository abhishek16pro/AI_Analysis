export function calculateDailyVWAP(candles) {
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  let currentDay = null;

  return candles.map(c => {
    const day = c.timestamp.split(" ")[0]; // YYYY-MM-DD

    if (day !== currentDay) {
      currentDay = day;
      cumulativePV = 0;
      cumulativeVolume = 0;
    }

    const high = Number(c.high);
    const low = Number(c.low);
    const close = Number(c.close);
    const volume = Number(c.volume);

    const typicalPrice = (high + low + close) / 3;

    cumulativePV += typicalPrice * volume;
    cumulativeVolume += volume;

    return {
      ...c,
      vwap: cumulativePV / cumulativeVolume
    };
  });
}
