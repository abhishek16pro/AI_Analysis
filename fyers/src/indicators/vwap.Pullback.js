export function vwapPullback(candle, context) {
  const {
    vwap,
    avgVolume,
    time
  } = context;

  const priceAboveVWAP = candle.close > vwap;
  const nearVWAP = Math.abs(candle.close - vwap) < 5; // adjust for Nifty
  const lowVolume = candle.volume < avgVolume;
  const validTime = time >= "10:00" && time <= "13:30";

  if (priceAboveVWAP && nearVWAP && lowVolume && validTime) {
    return {
      signal: "BUY",
      reason: "VWAP_PULLBACK"
    };
  }

  return null;
}