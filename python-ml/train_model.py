import joblib
import matplotlib.pyplot as plt
import pandas as pd

from xgboost import XGBClassifier
from data_loader import load_data
from feature_engineering_with_volume import add_indicators, add_features


# =========================
# Load Data
# =========================

df = load_data('candles', 'NSE:BSE-EQ', '2024-01-01', '2025-12-31')

df = add_indicators(df)
df = add_features(df)

# =========================
# Clean invalid rows
# =========================

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

# =========================
# Create Target (Correct version)
# =========================

LOOKAHEAD = 10
R_MULTIPLE = 1.5

df["future_high"] = df["high"].rolling(LOOKAHEAD).max().shift(-LOOKAHEAD)

df["target"] = (
    (df["future_high"] - df["close"]) >
    (df["atr"] * R_MULTIPLE)
).astype(int)

df = df.dropna()

# =========================
# Features for ML
# =========================

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
y = df["target"]


# =========================
# Time-based split
# =========================

split_index = int(len(df) * 0.8)

X_train = X.iloc[:split_index]
X_test  = X.iloc[split_index:]

y_train = y.iloc[:split_index]
y_test  = y.iloc[split_index:]


# =========================
# Train Model
# =========================

model = XGBClassifier(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
)

model.fit(X_train, y_train)


# =========================
# Evaluate
# =========================

accuracy = model.score(X_test, y_test)

print("Model Accuracy:", accuracy)


# =========================
# Save Model
# =========================

joblib.dump(model, "./trained_model/traned_model.pkl")

print("Model saved successfully")


# =========================
# Feature Importance Plot
# =========================

importance = model.feature_importances_

plt.figure(figsize=(10,5))

plt.bar(features, importance)

plt.title("Feature Importance")

plt.xticks(rotation=45)

plt.show()





# 0.55 – 0.65 → good
# 0.65 – 0.75 → excellent

# model.predict_proba(X_latest)
