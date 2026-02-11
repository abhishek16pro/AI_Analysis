from data_loader import load_data
from feature_engine import add_indicators, add_features
import json
from pathlib import Path


df = load_data('../data/NSE-BSE-EQ_2026-01-01_2026-02-11.json')
df = add_indicators(df)
df = add_features(df)

# Save output
output_dir = Path("output")
output_dir.mkdir(exist_ok=True)

file_path = output_dir / "feature_data.csv"
df.to_csv(file_path, index=False)

print("Saved successfully at:", file_path.resolve())