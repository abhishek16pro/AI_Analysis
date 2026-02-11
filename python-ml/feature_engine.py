import ta
import pandas as pd

def add_indicators(df):

    df["ema_9"] = ta.trend.ema_indicator(df["close"], 9)
    df["ema_21"] = ta.trend.ema_indicator(df["close"], 21)
    df["ema_55"] = ta.trend.ema_indicator(df["close"], 55)

    df["atr"] = ta.volatility.average_true_range(
        df["high"], df["low"], df["close"], 14
    )

    df["adx"] = ta.trend.adx(
        df["high"], df["low"], df["close"], 14
    )

    df["vwap"] = ta.volume.volume_weighted_average_price(
        df["high"], df["low"], df["close"], df["volume"]
    )

    return df


def add_features(df):

    df["price_vwap_dist"] = (df["close"] - df["vwap"]) / df["vwap"]
    df["ema_slope"] = df["ema_21"].diff()
    df["volume_spike"] = df["volume"] / df["volume"].rolling(20).mean()
    df["body_ratio"] = abs(df["close"] - df["open"]) / (df["high"] - df["low"])
    df["atr_percentile"] = df["atr"].rolling(100).apply(
        lambda x: pd.Series(x).rank(pct=True).iloc[-1]
    )

    return df