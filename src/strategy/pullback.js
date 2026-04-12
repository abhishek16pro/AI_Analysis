import Candle from "../../models/candle.js";
import DynamicStg from '../../models/dynamicStg.js';
import logger from "../utils/logger.js";
import connectRedis from "../utils/connectRedis.js";
import { emitter, channels } from "../utils/eventEmitter.js";

export async function runPullbackStrategy(stg) {
  try {
    if (!stg || !stg.active) return stg;

    if (stg?.log?.isPullback) return await afterTrigger(stg);

    let trend = null;
    let pullBackSignal = null;

    const currentTime = Math.floor(new Date() / 1000);

    const limit = Math.max(stg.slCandles, stg.candleLookback);
    const t1 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t1, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    const t2 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t2, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    // logger.info("Timeframe 1 Candles:", t1[0]);
    // logger.info("Timeframe 2 Candles:", t2[0]);

    if (t1.length < limit || t2.length < limit) return stg

    // Both EMA should be in same direction
    const t1FirstEMA = t1[0][`ema${stg.ema1}`]
    const t1SecondEMA = t1[0][`ema${stg.ema2}`]

    const t2FirstEMA = t2[0][`ema${stg.ema1}`]
    const t2SecondEMA = t2[0][`ema${stg.ema2}`]

    // logger.info("First timeframe EMA", { t1FirstEMA, t1SecondEMA });
    // logger.info("Second timeframe EMA", { t2FirstEMA, t2SecondEMA });

    // Check for minimum EMA gap
    const threshold = typeof stg.emaGapThreshold === "string" && stg.emaGapThreshold.includes("%")
      ? (t1[0][`ema${stg.ema1}`] * parseFloat(stg.emaGapThreshold)) / 100
      : parseFloat(stg.emaGapThreshold);

    const emaGapT1 = Math.abs(t1FirstEMA - t1SecondEMA);
    // logger.info("Threshold status", { threshold, emaGapT1, isAboveThreshold: emaGapT1 >= threshold });
    if (emaGapT1 < threshold) return stg;

    // Check for trend with both timeframes
    if (t1FirstEMA > t1SecondEMA && t2FirstEMA > t2SecondEMA) trend = "UP";
    else if (t1FirstEMA < t1SecondEMA && t2FirstEMA < t2SecondEMA) trend = "DOWN";

    logger.info("Trend", { trend });
    if (!trend) return stg;

    // Check for pullback on crossover EMA
    if (trend === "UP") pullBackSignal = t1[0].low <= t1[0][`ema${stg.emaCrossOver === "ema1" ? stg.ema1 : stg.ema2}`];
    else pullBackSignal = t1[0].high >= t1[0][`ema${stg.emaCrossOver === "ema1" ? stg.ema1 : stg.ema2}`];

    logger.info("Pullback Signal", { pullBackSignal });
    if (!pullBackSignal) return stg;

    logger.info("All conditions met. Triggering strategy.");
    logger.info("Trend:", { trend }, "PullBackSignal:", { pullBackSignal }, "EMA Gap T1:", { emaGapT1 });

    stg.log = stg.log || {};

    // Add delta check for current chandle toches the ema2 or not
    const isEma2 = (trend === "UP" && t1[0].low <= t1[0][`ema${stg.ema2}`]) || (trend === "DOWN" && t1[0].high >= t1[0][`ema${stg.ema2}`]);
    stg.log.deltaCheckon = isEma2 ? 'ema2' : 'ema1';
    logger.info("DeltaCheckon updated to", { deltaCheckon: stg.log.deltaCheckon });


    stg.log.trend = trend;
    stg.log.isPullback = true;
    stg.log.pullbackCandleInfo = {
      timestamp: t1[0].timestamp,
      open: t1[0].open,
      high: t1[0].high,
      low: t1[0].low,
      close: t1[0].close,
    };

    await updateStrategyInRedis(stg);

    logger.info(stg.name, "INFO", `Pullback strategy triggered for ${stg.index} in ${trend} trend`);

    const updatedStg = await updateStrategyInDB(stg)
    return updatedStg;

  } catch (error) {
    logger.warn("Error in runPullbackStrategy:", error);
    return stg;
  }
}

export async function afterTrigger(stg) {
  try {
    logger.info("Running afterTrigger");
    const currentTime = Math.floor(new Date() / 1000);
    let trend = null

    const limit = Math.max(stg.slCandles, stg.candleLookback);
    const latestCandleT1 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t1, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    const latestCandleT2 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t2, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    // logger.info(latestCandleT1[0]);

    // Add delta check for current chandle touches the ema2 or not
    if (stg.log.deltaCheckon === 'ema1') {
      const isEma2 = (stg.log.trend === "UP" && latestCandleT1[0].low <= latestCandleT1[0][`ema${stg.ema2}`]) || (stg.log.trend === "DOWN" && latestCandleT1[0].high >= latestCandleT1[0][`ema${stg.ema2}`]);
      if (isEma2) {
        stg.log.deltaCheckon = isEma2 ? 'ema2' : 'ema1';
        logger.info("DeltaCheckon updated to", stg.log.deltaCheckon);

        await updateStrategyInDB(stg);
        await updateStrategyInRedis(stg);
      }
    }

    if (stg.log.trend === "UP") {
      if (latestCandleT1[0].close > stg.log.pullbackCandleInfo.high) {

        // Checking if the candle which triggered the signal has ema1 > ema2 in both time fram
        const t1FirstEMA = latestCandleT1[0][`ema${stg.ema1}`]
        const t1SecondEMA = latestCandleT1[0][`ema${stg.ema2}`]
        const t2FirstEMA = latestCandleT2[0][`ema${stg.ema1}`]
        const t2SecondEMA = latestCandleT2[0][`ema${stg.ema2}`]

        // Check for trend with both timeframes
        if (t1FirstEMA > t1SecondEMA && t2FirstEMA > t2SecondEMA) trend = "UP";
        if (!trend) {
          logger.info("Trend is not in favour");
          return stg;
        }

        const emaArray = latestCandleT1.slice(0, 6).map(c => c[`ema${stg[stg.log.deltaCheckon]}`]);
        const emaCheck = emaArray.slice(1).filter((v, i) => v < emaArray[i]).length >= stg.candleJustify;
        logger.info("EMA validation check", emaCheck, emaArray);
        if (!emaCheck) return stg;

        const minUnderlying = Math.min(...latestCandleT1.slice(0, stg.slCandles).map(c => c.low));
        const stoploss = latestCandleT1[0].close - minUnderlying;
        const target = stoploss * stg.targetMultiplier;
        logger.info(stg.name, "INFO", `Pullback signal emitted for ${stg.name} with SL: ${stoploss}, Target: ${target}`);
        emitter.emit(channels.PULLBACK_STRATEGY, { stg, stoploss, target });
      }
      else {
        stg.log.pullbackCandleInfo = {
          timestamp: latestCandleT1[0].timestamp,
          open: latestCandleT1[0].open,
          high: latestCandleT1[0].high,
          low: latestCandleT1[0].low,
          close: latestCandleT1[0].close,
        };
        console.log("Updating pullBack Candle", { timestamp: latestCandleT1[0].timestamp, open: latestCandleT1[0].open, high: latestCandleT1[0].high, low: latestCandleT1[0].low, close: latestCandleT1[0].close });
        await updateStrategyInDB(stg);
        await updateStrategyInRedis(stg);
      }
    }

    else if (stg.log.trend === "DOWN") {
      if (latestCandleT1[0].close < stg.log.pullbackCandleInfo.low) {

        // Checking if the candle which triggered the signal has ema1 > ema2 in both time fram
        const t1FirstEMA = latestCandleT1[0][`ema${stg.ema1}`]
        const t1SecondEMA = latestCandleT1[0][`ema${stg.ema2}`]
        const t2FirstEMA = latestCandleT2[0][`ema${stg.ema1}`]
        const t2SecondEMA = latestCandleT2[0][`ema${stg.ema2}`]

        // Check for trend with both timeframes
        if (t1FirstEMA < t1SecondEMA && t2FirstEMA < t2SecondEMA) trend = "DOWN";
        if (!trend) {
          logger.info("Trend is not in favour");
          return stg;
        }

        const emaArray = latestCandleT1.slice(0, 6).map(c => c[`ema${stg[stg.log.deltaCheckon]}`]);
        const emaCheck = emaArray.slice(1).filter((v, i) => v > emaArray[i]).length >= stg.candleJustify;
        logger.info("EMA validation check", emaCheck, emaArray);
        if (emaCheck) return stg;

        const maxUnderlying = Math.max(...latestCandleT1.slice(0, stg.slCandles).map(c => c.high));
        const stoploss = maxUnderlying - latestCandleT1[0].close;
        const target = stoploss * stg.targetMultiplier;
        logger.info(stg.name, "INFO", `Pullback signal emitted for ${stg.name} with SL: ${stoploss}, Target: ${target}`);
        emitter.emit(channels.PULLBACK_STRATEGY, { stg, stoploss, target });
      }
      else { // iska mtlb candle ne low nhi diya hai, to update krdo pullback candle info
        stg.log.pullbackCandleInfo = {
          timestamp: latestCandleT1[0].timestamp,
          open: latestCandleT1[0].open,
          high: latestCandleT1[0].high,
          low: latestCandleT1[0].low,
          close: latestCandleT1[0].close,
        };
        console.log("Updating pullBack Candle", { timestamp: latestCandleT1[0].timestamp, open: latestCandleT1[0].open, high: latestCandleT1[0].high, low: latestCandleT1[0].low, close: latestCandleT1[0].close });
        await updateStrategyInDB(stg);
        await updateStrategyInRedis(stg);
      }
    }

    return stg

  } catch (error) {
    logger.warn("Error in afterTrigger:", error);
  }
}

// Function to update the strategy in db
export async function updateStrategyInDB(stg) {
  try {
    const updatedStg = await DynamicStg.findOneAndUpdate(
      { _id: stg._id },
      { $set: stg },
      { returnDocument: 'after' }
    );
    return updatedStg;
  }
  catch (error) {
    logger.error("Error occurred while updating strategy in DB", { error });
    return stg;
  }
}

// Fucntion to update the update the stg in redis list "DMC" after trigger
export async function updateStrategyInRedis(stg) {
  try {
    const redisClient = await connectRedis();
    const stgList = await redisClient.lrange("DMC", 0, -1);
    const stgIndex = stgList.findIndex(s => {
      const parsed = JSON.parse(s);
      return parsed._id === stg._id.toString();
    });
    if (stgIndex !== -1) {
      await redisClient.lset("DMC", stgIndex, JSON.stringify(stg));
      logger.info("Strategy updated in Redis successfully", { strategy: stg.name });
    }
  } catch (error) {
    logger.error("Error occurred while updating strategy in Redis", { error });
  }
}