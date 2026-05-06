import { emitter, channels } from "../utils/eventEmitter.js"
import { addStrategy, getStgName, triggerStg } from "../utils/robowriterHelper.js";
import logger from '../utils/logger.js';
import { saveLog } from "../utils/saveLogs.js";

export async function runPullbackStrategy(data) {
    try {
        const readyStg = await buildPullBackStg(data);
        // logger.info("Built strategy for pullback:", readyStg);
        let response = await addStrategy(readyStg);
        await saveLog(data.stg.name, data.stg.strategyType, "INFO", `Strategy built and added successfully: ${response || 'No response message'}`);
        logger.info("Response from strategy execution:", { response });
        let triggerResponse = await triggerStg(response); // Trigger the strategy
        logger.info("Response from strategy triggering:", { triggerResponse });
        await saveLog(data.stg.name, data.stg.strategyType, "INFO", `Strategy triggered successfully: ${triggerResponse || 'No response message'}`);
        return readyStg.name;
    } catch (error) {
        logger.warn("Error in runPullbackStrategy:", error);
        await saveLog(data.stg.name, data.stg.strategyType, "ERROR", `Error in runPullbackStrategy: ${error.message}`);

    }
}

export async function buildPullBackStg(data) {
    try {
        const name = await getStgName(data.stg.name)
        let lot1, lot2;
        let optionType1, optionType2;
        let strikeSelectionType1, strikeSelectionType2;
        let strikeSelectionValue1, strikeSelectionValue2;
        let tradeType1, tradeType2;
        if (data.stg.log.trend === "UP") {
            lot1 = data.stg.upLegs[0].lot || 1;
            lot2 = data.stg.upLegs[1].lot || 1;
            tradeType1 = data.stg.upLegs[0].tradeType || "B";
            tradeType2 = data.stg.upLegs[1].tradeType || "S";
            optionType1 = data.stg.upLegs[0].optionType || "CE";
            optionType2 = data.stg.upLegs[1].optionType || "PE";
            strikeSelectionType1 = data.stg.upLegs[0].strikeSelectionType || "Atm";
            strikeSelectionType2 = data.stg.upLegs[1].strikeSelectionType || "Atm";
            strikeSelectionValue1 = String(data.stg.upLegs[0].strikeSelectionValue) || "0";
            strikeSelectionValue2 = String(data.stg.upLegs[1].strikeSelectionValue) || "0";
        } else {
            lot1 = data.stg.downLegs[0].lot || 1;
            lot2 = data.stg.downLegs[1].lot || 1;
            optionType1 = data.stg.downLegs[0].optionType || "PE";
            optionType2 = data.stg.downLegs[1].optionType || "CE";
            strikeSelectionType1 = data.stg.downLegs[0].strikeSelectionType || "Atm";
            strikeSelectionType2 = data.stg.downLegs[1].strikeSelectionType || "Atm";
            strikeSelectionValue1 = String(data.stg.downLegs[0].strikeSelectionValue) || "0";
            strikeSelectionValue2 = String(data.stg.downLegs[1].strikeSelectionValue) || "0";
            tradeType1 = data.stg.downLegs[0].tradeType || "B";
            tradeType2 = data.stg.downLegs[1].tradeType || "S";
        }
        const startTime = new Date().toLocaleTimeString('en-GB', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        let baseStg = {
            "index": data.stg.index,
            "name": name,
            "tag": data.stg.strategyTag,
            "type": "TimeWise",
            "orderType": null,
            "entryType": "Sl-Limit",
            "entrybuffervalue": 5,
            "exitType": "Sl-Limit",
            "exitbuffervalue": 5,
            "runOnDay": [
                new Date().getDay()
            ],
            "lossType": "None",
            "loss": null,
            "combinedSlTrailAfter": "",
            "combinedSlTrailBy": "",
            "onStopLoss": null,
            "onLossBooking": [],
            "onLossBookingSqOff": [],
            "profitType": "None",
            "profit": null,
            "onProfit": null,
            "onProfitBooking": [],
            "onProfitBookingSqOff": [],
            "onTarget": null,
            "onTargetOption": null,
            "onCompletion": [],
            "onCompletionExecute": [],
            "onCompletionSqoff": [],
            "rexOnCompletion": 0,
            "rexCondition": "both",
            "rexDelay": 0,
            "onCompletionExecuteDelay": 0,
            "startTime": startTime,
            "endTime": data.stg.endTime,
            "sqTime": data.stg.endTime,
            "wtCandleClose": 0,
            "rexCandleCloseTime": 0,
            "upPortfolioOnSl": [],
            "downPortfolioOnSl": [],
            "upPortfolioOnTg": [],
            "downPortfolioOnTg": [],
            "diffPercentage": null,
            "minPoints": null,
            "minHoldTime": null,
            "whichLegSqoff": "",
            "action": "",
            "isCpRatioEnable": false,
            "minVwapCheckGap": 5,
            "minVwapCheckTimes": 3,
            "minVwapDiff": 0,
            "isVwapEnabled": false,
            "combinedVwapType": "onLeg",
            "monitorTime": null,
            "checkIntervalMinutes": 1,
            "isOrbEnabled": false,
            "isCombinedEntry": false,
            "combinedEntryType": "combinedPremium",
            "combinedEntryValue": "0",
            "combinedStrikeSelectionType": "Sd",
            "combinedStrikeSelectionValue": 0,
            "combinedDecayType": "onSignal",
            "checkCombinedStrikeDecay": false,
            "lds": false,
            "watchMinutes": 0,
            "decayPercentage": 0,
            "montoringStrikeType": "Atm",
            "monitoringStrikeValue": 0,
            "rangeBuffer": "",
            "isDecayDrivenStraddle": false,
            "isRollingStraddleEnabled": false,
            "isStraddleValueDecay": false,
            "isStaticStrikeDecay": false,
            "straddleStrikeBasis": "Atm",
            "strikeOffsetFromATM": 0,
            "stdDecay": "0",
            "dayHighLow": false,
            "ldsType": "dayLow",
            "ldsSLType": "oppositeSide",
            "ldsSlBuffer": 0,
            "ldsAutoExit": false,
            "candleCloseLds": 0,
            "ldsEntryBuffer": 0,
            "ldsMonitorType": "onLeg",
            "doubleUnderlying": false,
            "rangeArray": [
                {
                    "rangeFrame": 0
                }
            ],
            "leg1": {
                "added": true,
                "idle": false,
                "lot": lot1,
                "tradeType": tradeType1,
                "optionType": optionType1,
                "strikeSelectionType": strikeSelectionType1,
                "strikeSelectionValue": strikeSelectionValue1,
                "waitTrade": null,
                "vwapWaitTrade": null,
                "underlyingWaitTrade": null,
                "targetType": "underlyingpoints",
                "targetValue": `${parseInt(data.target)}`,
                "sLType": "underlyingpoints",
                "sLValue": `${parseInt(data.stoploss)}`,
                "wtCandleClose": 0,
                "rexCandleCloseTime": 0,
                "trailAfter": null,
                "trailBy": null,
                "onTargetType": "None",
                "onTargetValue": [],
                "onTargetTimes": 0,
                "onSLType": "None",
                "onSLValue": [],
                "onSLTimes": 0,
                "legDelay": 0,
                "onStopLossExecute": [],
                "onStopLossSqoff": [],
                "onTakeProfitExecute": [],
                "onTakeProfitSqoff": [],
                "onStartAction": [],
                "onStartExecute": [],
                "onStartSqoff": []
            },
            "leg2": {
                "added": true,
                "idle": false,
                "lot": lot2,
                "tradeType": tradeType2,
                "optionType": optionType2,
                "strikeSelectionType": strikeSelectionType2,
                "strikeSelectionValue": strikeSelectionValue2,
                "waitTrade": null,
                "vwapWaitTrade": null,
                "underlyingWaitTrade": null,
                "targetType": "underlyingpoints",
                "targetValue": `${parseInt(data.target)}`,
                "sLType": "underlyingpoints",
                "sLValue": `${parseInt(data.stoploss)}`,
                "wtCandleClose": 0,
                "rexCandleCloseTime": 0,
                "trailAfter": null,
                "trailBy": null,
                "onTargetType": "None",
                "onTargetValue": [],
                "onTargetTimes": 0,
                "onSLType": "None",
                "onSLValue": [],
                "onSLTimes": 0,
                "legDelay": 0,
                "onStopLossExecute": [],
                "onStopLossSqoff": [],
                "onTakeProfitExecute": [],
                "onTakeProfitSqoff": [],
                "onStartAction": [],
                "onStartSqoff": []
            }
        }
        return baseStg;
    } catch (error) {
        logger.error("Error in buildPullBackStg:", error);
        await saveLog(data.stg.name, data.stg.strategyType, "ERROR", `Error in buildPullBackStg: ${error.message}`);
        throw error;
    }
}