import joblib
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from data_loader import load_data
from feature_engine import add_indicators, add_features


df = load_data('../data/NSE-BSE-EQ_2026-01-01_2026-02-11.json')
df = add_indicators(df)
df = add_features(df)

LOOKAHEAD = 10
R_MULTIPLE = 1.5

df["future_high"] = df["high"].shift(-LOOKAHEAD).rolling(LOOKAHEAD).max()
df["target"] = (
    (df["future_high"] - df["close"]) >
    (df["atr"] * R_MULTIPLE)
).astype(int)

df = df.dropna()

features = [
    "price_vwap_dist",
    "ema_slope",
    "volume_spike",
    "body_ratio",
    "atr_percentile"
]

X = df[features]
y = df["target"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, shuffle=False
)

model = XGBClassifier(
    n_estimators=200,
    max_depth=4,
    learning_rate=0.05
)

model.fit(X_train, y_train)
print("Model Accuracy:", model.score(X_test, y_test))

joblib.dump(model, "./output/trade_model.pkl")
