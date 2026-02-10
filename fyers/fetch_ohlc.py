import os
import pickle
from dotenv import load_dotenv
from fyers_apiv3 import fyersModel

# Load environment variables
load_dotenv()

# Initialize Fyers model
fyers = fyersModel.FyersModel(
    client_id=os.getenv('client_id'),
    token=os.getenv('access_token'),
    log_path="./logs"
)

def fetch_and_save_ohlc(symbol, resolution, date_format, range_from, range_to, cont_flag="1"):
    """
    Fetch OHLC data from Fyers API and save to pickle file
    
    Parameters:
    - symbol: Stock symbol (e.g., "NSE:BSE-EQ")
    - resolution: Candle resolution (e.g., "5" for 5-minute)
    - date_format: Date format (e.g., "1" for DD-MM-YYYY)
    - range_from: Start date (e.g., "2026-02-10")
    - range_to: End date (e.g., "2026-02-11")
    - cont_flag: Continuation flag (default "1")
    """
    try:
        # Prepare request parameters
        data = {
            "symbol": symbol,
            "resolution": resolution,
            "date_format": date_format,
            "range_from": range_from,
            "range_to": range_to,
            "cont_flag": cont_flag
        }
        
        # Fetch historical data
        print(f"Fetching OHLC data for {symbol} from {range_from} to {range_to}...")
        response = fyers.history(data)
        
        if response.get('s') == 'ok' and 'candles' in response:
            candles = response['candles']
            print(f"✓ Fetched {len(candles)} candles")
            
            # Clean up symbol name (remove : and -)
            clean_symbol = symbol.replace(":", "_").replace("-", "_")
            filename = f"{clean_symbol}_{range_from}_{range_to}.pkl"
            
            # Create data folder if it doesn't exist
            data_folder = "./data"
            if not os.path.exists(data_folder):
                os.makedirs(data_folder)
            
            filepath = os.path.join(data_folder, filename)
            
            # Save to pickle file
            with open(filepath, 'wb') as f:
                pickle.dump(candles, f)
            
            print(f"✓ Data saved to {filepath}")
            return True
        else:
            print(f"✗ Error: {response}")
            return False
            
    except Exception as e:
        print(f"✗ Error fetching/saving data: {str(e)}")
        return False


if __name__ == "__main__":
    # Example usage
    fetch_and_save_ohlc(
        symbol="NSE:BSE-EQ",
        resolution="5",
        date_format="1",
        range_from="2026-02-10",
        range_to="2026-02-11",
        cont_flag="1"
    )
