from data_loader import load_data
import os
from feature_engineering_with_volume import add_indicators, add_features


def save_df_to_csv(df, filename):

    folder = "trained_model"

    # create folder if not exists
    if not os.path.exists(folder):
        os.makedirs(folder)

    filepath = os.path.join(folder, filename)

    df.to_csv(filepath)

    print(f"CSV saved at: {filepath}")


df = load_data('candles', 'NSE:BSE-EQ', '2025-01-01', '2025-12-31')
df = add_indicators(df)
df = add_features(df)

df = df.replace([float("inf"), -float("inf")], None)

df = df.dropna(subset=[
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
])

save_df_to_csv(df, "nifty50_5min_features_all.csv")
# print(df)
