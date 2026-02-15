# backtest.py

import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from data_loader import load_data
from feature_engineering_with_volume import add_indicators, add_features


# ============================
# CONFIGURATION
# ============================

MODEL_PATH = "./trained_model/traned_model.pkl"

SYMBOL = "NSE:BSE-EQ"

START_DATE = "2026-01-01"
END_DATE   = "2026-01-31"

INITIAL_CAPITAL = 100000

RISK_PER_TRADE = 0.01      # 1%
SL_MULTIPLE = 1.0
TARGET_MULTIPLE = 1.5

LOOKAHEAD = 10

PROBABILITY_THRESHOLD = 0.60


# ============================
# LOAD MODEL
# ============================

model = joblib.load(MODEL_PATH)

print("Model loaded")


# ============================
# LOAD DATA
# ============================

df = load_data(
    "candles",
    SYMBOL,
    start_date=START_DATE,
    end_date=END_DATE
)

print(f"Loaded {len(df)} candles")
print(f"Range: {df.index.min()} → {df.index.max()}")


# ============================
# FEATURE ENGINEERING
# ============================

df = add_indicators(df)

df.loc[df["atr"] == 0, "atr"] = None
df.loc[df["adx"] == 0, "adx"] = None

df = add_features(df)

df = df.dropna()

print("After feature cleaning:", len(df))


# ============================
# FEATURES USED IN TRAINING
# ============================

features = [
    "ema_21",
    "vwap",
    "atr",
    "adx",
    "volume_ma",
    "price_vwap_dist",
    "ema_slope",
    "volume_spike",
    "atr_percentile",
    "trend",
    "strong_trend",
    "body_ratio"
]

X = df[features]


# ============================
# MODEL PREDICTION
# ============================

df["probability"] = model.predict_proba(X)[:, 1]

print("\nSample predictions:")
print(df[["close", "probability"]].head())


# ============================
# BACKTEST ENGINE
# ============================

capital = INITIAL_CAPITAL

equity_curve = []

trade_log = []

wins = 0
losses = 0


for i in range(len(df) - LOOKAHEAD):

    row = df.iloc[i]

    equity_curve.append(capital)

    probability = row["probability"]

    if probability < PROBABILITY_THRESHOLD:
        continue


    entry_price = row["close"]

    atr = row["atr"]

    stop_loss = entry_price - (SL_MULTIPLE * atr)

    target = entry_price + (TARGET_MULTIPLE * atr)


    future_candles = df.iloc[i+1:i+LOOKAHEAD+1]


    result = "NONE"
    exit_price = entry_price


    for _, candle in future_candles.iterrows():

        if candle["low"] <= stop_loss:

            result = "LOSS"

            exit_price = stop_loss

            break


        if candle["high"] >= target:

            result = "WIN"

            exit_price = target

            break


    risk_amount = capital * RISK_PER_TRADE


    if result == "WIN":

        profit = risk_amount * TARGET_MULTIPLE

        capital += profit

        wins += 1


    elif result == "LOSS":

        loss = risk_amount

        capital -= loss

        losses += 1

        profit = -loss


    else:

        profit = 0


    trade_log.append({
        "time": row.name,
        "entry": entry_price,
        "exit": exit_price,
        "probability": probability,
        "result": result,
        "profit": profit,
        "capital": capital
    })


equity_curve.append(capital)


# ============================
# PERFORMANCE METRICS
# ============================

total_trades = wins + losses

win_rate = wins / total_trades if total_trades > 0 else 0

total_profit = capital - INITIAL_CAPITAL


equity_array = np.array(equity_curve)

peak = np.maximum.accumulate(equity_array)

drawdown = peak - equity_array

max_drawdown = np.max(drawdown)


returns = np.diff(equity_array)

if len(returns) > 0:
    sharpe = np.mean(returns) / (np.std(returns) + 1e-9) * np.sqrt(252)
else:
    sharpe = 0


# ============================
# PRINT RESULTS
# ============================

print("\n==========================")
print("BACKTEST RESULTS")
print("==========================")

print("Initial capital:", INITIAL_CAPITAL)
print("Final capital:", round(capital, 2))

print("Total profit:", round(total_profit, 2))

print("Total trades:", total_trades)

print("Wins:", wins)
print("Losses:", losses)

print("Win rate:", round(win_rate * 100, 2), "%")

print("Max drawdown:", round(max_drawdown, 2))

print("Sharpe ratio:", round(sharpe, 2))


# ============================
# SAVE TRADE LOG
# ============================

trade_df = pd.DataFrame(trade_log)

trade_df.to_csv("trade_log.csv", index=False)

print("\nTrade log saved to trade_log.csv")


# ============================
# EQUITY CURVE PLOT
# ============================

plt.figure(figsize=(12,6))

plt.plot(equity_curve)

plt.title("Equity Curve")

plt.xlabel("Trades")

plt.ylabel("Capital")

plt.grid()

plt.show()
