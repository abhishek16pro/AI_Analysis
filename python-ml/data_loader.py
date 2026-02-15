from pymongo import MongoClient
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.getenv("MONGODB_URI")
mongo_db = os.getenv("MONGODB_NAME")

client = MongoClient(mongo_url)
db = client[mongo_db]


def load_data(collection_name, symbol, start_date=None, end_date=None):

    collection = db[collection_name]
    print(f"Loading data for {symbol} from collection {collection_name}...")

    # Build query
    query = {"symbol": symbol}
    
    if start_date or end_date:
        query["timestamp"] = {}
        
        if start_date:
            start_timestamp = pd.to_datetime(start_date).timestamp()
            query["timestamp"]["$gte"] = int(start_timestamp)
            print(f"  From: {start_date}")
        
        if end_date:
            # End of day for the specified date (add 24 hours)
            end_datetime = pd.to_datetime(end_date) + pd.Timedelta(days=1)
            end_timestamp = end_datetime.timestamp()
            query["timestamp"]["$lt"] = int(end_timestamp)
            print(f"  To: {end_date} (inclusive)")

    cursor = collection.find(
        query,
        {
            "_id": 0,          # skip MongoDB internal id
            "symbol": 1,
            "timestamp": 1,
            "open": 1,
            "high": 1,
            "low": 1,
            "close": 1,
            "volume": 1
        }
    ).sort("timestamp", 1)

    data = list(cursor)
    print(f"  Records fetched: {len(data)}")

    df = pd.DataFrame(data)

    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s", utc=True).dt.tz_convert("Asia/Kolkata")
        df.set_index("timestamp", inplace=True)

    return df
