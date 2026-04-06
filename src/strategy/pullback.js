import Candle from "../../models/candle.js";
import DynamicStg from '../../models/dynamicStg.js';
import logger from "../utils/logger.js";
import { emitter, channels } from "../utils/eventEmitter.js";

export async function runPullbackStrategy(stg) {
  try {
    if (!stg || !stg.isActive) return stg;

    if (stg?.log?.isTriggered) return await afterTrigger(stg);

    let trend = null;
    let pullBackSignal = null;

    const currentTime = Math.floor(new Date() / 1000);
    logger.info(currentTime);


    const limit = Math.max(stg.slCandles, stg.filter.candlesLookback);
    const t1 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t1, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    const t2 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t2, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    logger.info("Timeframe 1 Candles:", t1[0]);
    logger.info("Timeframe 2 Candles:", t2[0]);

    if (t1.length < limit || t2.length < limit) return stg

    // Both EMA should be in same direction
    const t1FirstEMA = t1[0][`ema${stg.ema1}`]
    const t1SecondEMA = t1[0][`ema${stg.ema2}`]

    const t2FirstEMA = t2[0][`ema${stg.ema1}`]
    const t2SecondEMA = t2[0][`ema${stg.ema2}`]

    logger.info("First timeframe EMA", { t1FirstEMA, t1SecondEMA });
    logger.info("Second timeframe EMA", { t2FirstEMA, t2SecondEMA });

    // Check for minimum EMA gap
    const threshold = typeof stg.emaGapThreshold === "string" && stg.emaGapThreshold.includes("%")
      ? (t1[0][`ema${stg.ema1}`] * parseFloat(stg.emaGapThreshold)) / 100
      : parseFloat(stg.emaGapThreshold);

    const emaGapT1 = Math.abs(t1FirstEMA - t1SecondEMA);
    logger.info("Threshold status", { threshold, emaGapT1 });
    if (emaGapT1 < threshold) return stg;

    // Check for trend with both timeframes
    if (t1FirstEMA > t1SecondEMA && t2FirstEMA > t2SecondEMA) trend = "UP";
    else if (t1FirstEMA < t1SecondEMA && t2FirstEMA < t2SecondEMA) trend = "DOWN";

    logger.info("Trend", trend);
    if (!trend) return stg;

    // Check for pullback on crossover EMA
    if (trend === "UP") pullBackSignal = t1[0].low <= t1[0][`ema${stg.crossOver === "ema1" ? stg.ema1 : stg.ema2}`];
    else pullBackSignal = t1[0].high >= t1[0][`ema${stg.crossOver === "ema1" ? stg.ema1 : stg.ema2}`];

    logger.info("Pullback Signal", pullBackSignal);
    if (!pullBackSignal) return stg;

    let emaDeltaArray = t1.slice(0, -1).map((c, i) => c[`ema${stg.ema1}`] - t1[i + 1][`ema${stg.ema1}`]);

    // Check for EMA delta confirmation
    const emaDeltaConfirmation = Math.max(emaDeltaArray.filter(v => v > 0).length, emaDeltaArray.filter(v => v < 0).length) >= stg.filter.candleJusity;

    logger.info("EMA Delta Confirmation", emaDeltaConfirmation);
    if (!emaDeltaConfirmation) return stg;

    logger.info("All conditions met. Triggering strategy.");
    logger.info("Treand:", trend, "PullBackSignal:", pullBackSignal, "EMA Gap T1:", emaGapT1, "EMA Delta Confirmation:", emaDeltaConfirmation);


    stg.log = stg.log || {};

    stg.log.trend = trend;
    stg.log.isTriggered = true;
    stg.log.triggeredCandleInfo = {
      timestamp: t1[0].timestamp,
      open: t1[0].open,
      high: t1[0].high,
      low: t1[0].low,
      close: t1[0].close,
    };
    logger.info("Updated Strategy:", stg);

    await DynamicStg.findOneAndUpdate(
      { _id: stg._id },
      { $set: stg },
      { returnDocument: 'after' }
    );
    return stg;

  } catch (error) {
    logger.warn("Error in runPullbackStrategy:", error);
    return stg;
  }
}

export async function afterTrigger(stg) {
  try {
    logger.info("Running afterTrigger");
    // logger.info(stg);
    const currentTime = Math.floor(new Date() / 1000);
    let isReset = false;

    const latestCandles = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t1, symbol: stg.index }).sort({ timestamp: -1 }).limit(stg.slCandles);
    logger.info(latestCandles[0]);

    if (stg.log.trend === "UP") {
      let high = Math.max(stg.log.triggeredCandleInfo.open, stg.log.triggeredCandleInfo.close);
      if (latestCandles[0].close > high) {
        logger.info("Hit Portfolio for", stg.name, stg.log.trend, "removing logs for next run!");
        isReset = true;
        const minUnderlying = Math.min(...latestCandles.map(c => c.low));
        const stoploss = latestCandles[0].close - minUnderlying;
        const target = stoploss * stg.targetMultiplier;
        logger.info("SLTG", { stoploss, target });
        emitter.emit(channels.PULLBACK_STRATEGY, { stg, stoploss, target });
      }
    }
    else if (stg.log.trend === "DOWN") {
      let low = Math.min(stg.log.triggeredCandleInfo.open, stg.log.triggeredCandleInfo.close);
      if (latestCandles[0].close < low) {
        logger.info("Hit Portfolio for", stg.name, stg.log.trend, "removing logs for next run!");
        isReset = true;
        const maxUnderlying = Math.max(...latestCandles.map(c => c.high));
        const stoploss = maxUnderlying - latestCandles[0].close
        const target = stoploss * stg.targetMultiplier;
        logger.info("SLTG", { stoploss, target });
        emitter.emit(channels.PULLBACK_STRATEGY, { stg, stoploss, target });
      }
    }
    if (isReset) {
      logger.info("Resetting logs for", stg.name, "removing logs for next run!");

      // await DynamicStg.findOneAndUpdate(
      //   { _id: stg._id },
      //   { $unset: { log: 1 } },
      //   { returnDocument: 'after' }
      // );
    }

    return stg

  } catch (error) {
    logger.warn("Error in afterTrigger:", error);
  }
}