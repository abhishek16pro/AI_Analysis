// export const timeframes = ["10"]   // In mins
// export const supportedEma = [10]
// export const symbols = ["NIFTY"]

export const timeframes = ["1", "2", "3", "5", "10", "15", "30", "60", "120", "240"]   // In mins
export const supportedEma = [10, 20, 30, 50, 100]
export const symbols = ["NIFTY"]

export const indexMapping = {
    "NIFTY": "NSE:NIFTY50-INDEX",
    "NSE:NIFTY50-INDEX": "NIFTY"
}

export const tokenMapping = {
    "NSE:NIFTY50-INDEX": 26000
}