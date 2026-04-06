import { emitter, channels } from "../utils/eventEmitter.js"
import { addStrategy, getStgName, triggerStg, getUnderLying } from "../utils/robowriterHelper.js";
import { indexMapping } from "../utils/constant.js";
import logger from '../utils/logger.js';

emitter.on(channels.PULLBACK_STRATEGY, async (data) => {
    logger.info("Received PULLBACK_STRATEGY event with data:", data.stg.name);
    await runPullbackStrategy(data);
});

async function runPullbackStrategy(data) {
    try {
        const readyStg = await buildPullBackStg(data);
        let response = await addStrategy(readyStg);
        logger.info("Response from strategy execution:", response);
        let triggerResponse = await triggerStg(response); // Trigger the strategy
        logger.info("Response from strategy triggering:", triggerResponse);

    } catch (error) {
        logger.warn("Error in runPullbackStrategy:", error);
    }
}

async function buildPullBackStg(data) {
    logger.info({ data })
    const name = await getStgName(data.stg.name)
    const side = data.stg.log.trend === "DOWN" ? "PE" : "CE"
    const startTime = new Date().toLocaleTimeString('en-GB', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    let baseStg = {
        "index": indexMapping[data.stg.index],
        "name": name,
        "tag": "DMC",
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
        "endTime": "15:15:00",
        "sqTime": "15:15:00",
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
            "lot": 1,
            "tradeType": "B",
            "optionType": side,
            "strikeSelectionType": "Atm",
            "strikeSelectionValue": "-2",
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
        }
    }

    return baseStg;
}