from fastapi import FastAPI
import joblib
import pandas as pd

app = FastAPI()
model = joblib.load("trade_model.pkl")

features = [
    "price_vwap_dist",
    "ema_slope",
    "volume_spike",
    "body_ratio",
    "atr_percentile"
]

@app.post("/predict")
def predict(data: dict):

    df = pd.DataFrame([data])
    prob = model.predict_proba(df[features])[0][1]

    return {"win_probability": float(prob)}
