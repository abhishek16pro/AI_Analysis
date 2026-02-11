import pandas as pd
import json

def load_data(file_path):

    with open(file_path, "r") as file:
        raw_data = json.load(file)
    df = pd.DataFrame(raw_data, columns=[
        "timestamp", "open", "high", "low", "close", "volume"
    ])

    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s")
    df.set_index("timestamp", inplace=True)

    return df
