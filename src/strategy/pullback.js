import Candle from "../../models/candle.js";
import DynamicStg from '../../models/dynamicStg.js';
import logger from "../utils/logger.js";
import connectRedis from "../utils/connectRedis.js";
import { emitter, channels } from "../utils/eventEmitter.js";

export async function runPullbackStrategy(stg) {
  const strategyLogger = logger.child({ strategy: stg.name });
  try {
    if (!stg) return stg;

    if (stg?.log?.isPullback) return await afterTrigger(stg);

    let trend = null;
    let pullBackSignal = null;

    const currentTime = Math.floor(new Date() / 1000);

    const limit = Math.max(parseInt(stg.slCandles), parseInt(stg.candleLookback));
    const t1 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t1, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    const t2 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t2, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    // strategyLogger.info("Timeframe 1 Candles:", t1[0]);
    // strategyLogger.info("Timeframe 2 Candles:", t2[0]);

    if (t1.length < limit || t2.length < limit) return stg

    // Both EMA should be in same direction
    const t1FirstEMA = t1[0][`ema${stg.ema1}`]
    const t1SecondEMA = t1[0][`ema${stg.ema2}`]

    const t2FirstEMA = t2[0][`ema${stg.ema1}`]
    const t2SecondEMA = t2[0][`ema${stg.ema2}`]

    // strategyLogger.info("First timeframe EMA", { t1FirstEMA, t1SecondEMA });
    // strategyLogger.info("Second timeframe EMA", { t2FirstEMA, t2SecondEMA });

    // Check for minimum EMA gap
    const threshold = typeof stg.emaGapThreshold === "string" && stg.emaGapThreshold.includes("%")
      ? (t1[0][`ema${stg.ema1}`] * parseFloat(stg.emaGapThreshold)) / 100
      : parseFloat(stg.emaGapThreshold);

    const emaGapT1 = Math.abs(t1FirstEMA - t1SecondEMA);
    // strategyLogger.info("Threshold status", { threshold, emaGapT1, isAboveThreshold: emaGapT1 >= threshold });
    if (emaGapT1 < threshold) return stg;

    // Check for trend with both timeframes
    if (t1FirstEMA > t1SecondEMA && t2FirstEMA > t2SecondEMA) trend = "UP";
    else if (t1FirstEMA < t1SecondEMA && t2FirstEMA < t2SecondEMA) trend = "DOWN";

    strategyLogger.info("Trend", { trend });
    if (!trend) return stg;

    // Check for pullback on crossover EMA
    if (trend === "UP") pullBackSignal = t1[0].low <= t1[0][`ema${stg.emaCrossOver === "ema1" ? stg.ema1 : stg.ema2}`];
    else pullBackSignal = t1[0].high >= t1[0][`ema${stg.emaCrossOver === "ema1" ? stg.ema1 : stg.ema2}`];

    strategyLogger.info("Pullback Signal", { pullBackSignal });
    if (!pullBackSignal) return stg;

    strategyLogger.info("All conditions met. Triggering strategy.");
    strategyLogger.info("Strategy execution details", { trend, pullBackSignal, emaGapT1 });

    stg.log = stg.log || {};
    // Add delta check for current chandle toches the ema2 or not
    const isEma2 = (trend === "UP" && t1[0].low <= t1[0][`ema${stg.ema2}`]) || (trend === "DOWN" && t1[0].high >= t1[0][`ema${stg.ema2}`]);
    stg.log.deltaCheckon = isEma2 ? 'ema2' : 'ema1';
    strategyLogger.info("DeltaCheckon updated to", { deltaCheckon: stg.log.deltaCheckon });

    // EMA validation check
    const isBullish = trend === "UP";
    const emaArray = t1.slice(0, stg.candleLookback).map(c => c[`ema${stg[stg.log.deltaCheckon]}`]);
    const emaCheck = emaArray.slice(1).filter((v, i) => isBullish ? v < emaArray[i] : v > emaArray[i]).length >= stg.candleJustify;
    strategyLogger.info("EMA validation check", { emaCheck, emaArray });

    if (!emaCheck) {
      strategyLogger.info("EMA check failed. Not validating the signal.");
      return stg;
    }

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
    const updatedStg = await updateStrategyInDB(stg)
    return updatedStg;

  } catch (error) {
    strategyLogger.warn("Error in runPullbackStrategy", { error: error.message || error, stack: error.stack });
    return stg;
  }
}

export async function afterTrigger(stg) {
  const strategyLogger = logger.child({ strategy: stg.name });
  try {
    strategyLogger.info("Running afterTrigger");
    const currentTime = Math.floor(new Date() / 1000);

    const limit = Math.max(parseInt(stg.slCandles), parseInt(stg.candleLookback));
    const latestCandleT1 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t1, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    const latestCandleT2 = await Candle.find({ timestamp: { $lte: currentTime }, timeframe: stg.t2, symbol: stg.index }).sort({ timestamp: -1 }).limit(limit);
    // strategyLogger.info(latestCandleT1[0]);

    // Add delta check for current candle touches the ema2 or not
    if (stg.log.deltaCheckon === 'ema1') {
      const isEma2 = (stg.log.trend === "UP" && latestCandleT1[0].low <= latestCandleT1[0][`ema${stg.ema2}`]) || (stg.log.trend === "DOWN" && latestCandleT1[0].high >= latestCandleT1[0][`ema${stg.ema2}`]);
      if (isEma2) {
        stg.log.deltaCheckon = 'ema2';
        strategyLogger.info("DeltaCheckon updated to", { deltaCheckon: stg.log.deltaCheckon });

        await updateStrategyInDB(stg);
        await updateStrategyInRedis(stg);
      }
    }

    const isBullish = stg.log.trend === "UP";
    const breakoutCondition = isBullish ? latestCandleT1[0].close > stg.log.pullbackCandleInfo.high : latestCandleT1[0].close < stg.log.pullbackCandleInfo.low;

    if (breakoutCondition) {
      // Checking if the candle which triggered the signal has ema1 > ema2 in both timeframes
      const t1FirstEMA = latestCandleT1[0][`ema${stg.ema1}`];
      const t1SecondEMA = latestCandleT1[0][`ema${stg.ema2}`];
      const t2FirstEMA = latestCandleT2[0][`ema${stg.ema1}`];
      const t2SecondEMA = latestCandleT2[0][`ema${stg.ema2}`];

      // Check for trend with both timeframes
      const trendCondition = isBullish ? (t1FirstEMA > t1SecondEMA && t2FirstEMA > t2SecondEMA) : (t1FirstEMA < t1SecondEMA && t2FirstEMA < t2SecondEMA);

      if (!trendCondition) {
        strategyLogger.info("Trend is not in favour");
        return stg;
      }

      const emaArray = latestCandleT1.slice(0, stg.candleLookback).map(c => c[`ema${stg[stg.log.deltaCheckon]}`]);
      const emaCheck = emaArray.slice(1).filter((v, i) => isBullish ? v < emaArray[i] : v > emaArray[i]).length >= stg.candleJustify;
      strategyLogger.info("EMA validation check", { emaCheck, emaArray });

      if (!emaCheck) {
        strategyLogger.info("EMA check failed. Not validating the signal.");
        return stg;
      }

      // Calculate stoploss
      let stoploss;
      if (isBullish) {
        const minUnderlying = Math.min(...latestCandleT1.slice(0, parseInt(stg.slCandles)).map(c => c.low));
        stoploss = latestCandleT1[0].close - minUnderlying;
      } else {
        const maxUnderlying = Math.max(...latestCandleT1.slice(0, parseInt(stg.slCandles)).map(c => c.high));
        stoploss = maxUnderlying - latestCandleT1[0].close;
      }

      const target = stoploss * parseFloat(stg.targetMultiplier);
      strategyLogger.info(`Pullback signal emitted for ${stg.name} with SL: ${stoploss}, Target: ${target}`, { stoploss, target });
      
      emitter.emit(channels.PULLBACK_STRATEGY, { stg, stoploss, target });


      stg.active = false;
      stg.maxTrade -= 1;
      await updateStrategyInDB(stg);
      await updateStrategyInRedis(stg);
      if (stg.maxTrade > 0) {
        await reRunStrategy(stg);
      }
    } else {
      // Update pullback candle info
      stg.log.pullbackCandleInfo = {
        timestamp: latestCandleT1[0].timestamp,
        open: latestCandleT1[0].open,
        high: latestCandleT1[0].high,
        low: latestCandleT1[0].low,
        close: latestCandleT1[0].close,
      };
      strategyLogger.info("Updating pullBack Candle", {
        timestamp: latestCandleT1[0].timestamp,
        open: latestCandleT1[0].open,
        high: latestCandleT1[0].high,
        low: latestCandleT1[0].low,
        close: latestCandleT1[0].close
      });
      await updateStrategyInDB(stg);
      await updateStrategyInRedis(stg);
    }

    return stg;

  } catch (error) {
    strategyLogger.warn("Error in afterTrigger", { error: error.message || error, stack: error.stack });
  }
}

async function reRunStrategy(stg) {
  const strategyLogger = logger.child({ strategy: stg.name });
  try {
    if (stg.maxTrade <= 0) {
      strategyLogger.info("Max trade limit reached. Not re-running.");
      return stg;
    }
    // Clone the strategy to create a new one
    const newStg = JSON.parse(JSON.stringify(stg));

    // Remove the ID to create a new document
    delete newStg._id;

    // Remove logs and set active to true
    newStg.log = {};
    newStg.active = true;

    // Generate new name with suffix
    const baseName = stg.name.replace(/_\d+$/, ''); // Remove existing suffix if present

    // Find the highest existing suffix for this strategy
    const existingStrategies = await DynamicStg.find({ name: new RegExp(`^${baseName}(_\\d+)?$`) });

    let newSuffix = 1;
    if (existingStrategies.length > 0) {
      const suffixes = existingStrategies.map(s => {
        const match = s.name.match(/_(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
      newSuffix = Math.max(...suffixes) + 1;
    }

    newStg.name = `${baseName}_${newSuffix}`;
    strategyLogger.info("Created new strategy version", { newName: newStg.name });

    // Save new strategy to database
    const savedStg = await DynamicStg.create(newStg);

    // Push to Redis DMC array
    const redisClient = await connectRedis();
    await redisClient.rpush("DMC", JSON.stringify(savedStg));
    strategyLogger.info("Strategy pushed to Redis DMC array and saved to database", { newName: newStg.name });

    return savedStg;
  } catch (error) {
    strategyLogger.warn("Error in rerunStrategy", { error: error.message || error, stack: error.stack });
  }
}


// Function to update the strategy in db
export async function updateStrategyInDB(stg) {
  const strategyLogger = logger.child({ strategy: stg.name });
  try {
    const updatedStg = await DynamicStg.findOneAndUpdate(
      { _id: stg._id },
      { $set: stg },
      { returnDocument: 'after' }
    );
    return updatedStg;
  }
  catch (error) {
    strategyLogger.error("Error occurred while updating strategy in DB", { error: error.message || error, stack: error.stack });
    return stg;
  }
}

// Fucntion to update the update the stg in redis list "DMC" after trigger
export async function updateStrategyInRedis(stg) {
  const strategyLogger = logger.child({ strategy: stg.name });
  try {
    const redisClient = await connectRedis();
    const stgList = await redisClient.lrange("DMC", 0, -1);
    const stgIndex = stgList.findIndex(s => {
      const parsed = JSON.parse(s);
      return parsed._id === stg._id.toString();
    });
    if (stgIndex !== -1) {
      await redisClient.lset("DMC", stgIndex, JSON.stringify(stg));
      strategyLogger.info("Strategy updated in Redis successfully");
    }
  } catch (error) {
    strategyLogger.error("Error occurred while updating strategy in Redis", { error: error.message || error, stack: error.stack });
  }
}