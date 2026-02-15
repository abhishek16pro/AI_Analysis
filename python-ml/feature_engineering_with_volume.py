import ta
import pandas as pd


# ============================
# ADD INDICATORS (5 PRIORITY)
# ============================

def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds the 5 most important indicators for NIFTY 5-minute trading
    """

    # 1. EMA 21 (Primary trend indicator)
    df["ema_21"] = ta.trend.ema_indicator(
        close=df["close"],
        window=21
    )

    # 2. VWAP (Institutional reference level)
    df["vwap"] = ta.volume.volume_weighted_average_price(
        high=df["high"],
        low=df["low"],
        close=df["close"],
        volume=df["volume"]
    )

    # 3. ATR 14 (Volatility measurement)
    df["atr"] = ta.volatility.average_true_range(
        high=df["high"],
        low=df["low"],
        close=df["close"],
        window=14
    )

    # 4. ADX 14 (Trend strength)
    df["adx"] = ta.trend.adx(
        high=df["high"],
        low=df["low"],
        close=df["close"],
        window=14
    )

    # 5. Volume Moving Average (for spike detection)
    df["volume_ma"] = df["volume"].rolling(window=20).mean()

    return df


# ============================
# ADD FEATURES (MOST IMPORTANT)
# ============================

def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds most powerful predictive features for ML and strategy
    """

    # Distance from VWAP (mean reversion / continuation)
    df["price_vwap_dist"] = (
        (df["close"] - df["vwap"]) / df["vwap"]
    )

    # EMA slope (momentum strength)
    df["ema_slope"] = df["ema_21"].diff()

    # Volume spike detection
    df["volume_spike"] = (
        df["volume"] / df["volume_ma"]
    )

    # ATR percentile (volatility regime detection)
    df["atr_percentile"] = df["atr"].rolling(200).apply(
        lambda x: pd.Series(x).rank(pct=True).iloc[-1]
    )

    # Trend direction
    df["trend"] = (
        df["close"] > df["ema_21"]
    ).astype(int)

    # Strong trend detection
    df["strong_trend"] = (
        df["adx"] > 25
    ).astype(int)

    # Candle strength
    df["body_ratio"] = (
        abs(df["close"] - df["open"]) /
        (df["high"] - df["low"])
    )

    return df
