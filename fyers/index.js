import { fyersModel } from 'fyers-api-v3'
import dotenv from "dotenv";
dotenv.config();

var fyers = new fyersModel({ "path": "./logs", "enableLogging": true })
fyers.setAppId(process.env.client_id)
fyers.setRedirectUrl(process.env.redirect_uri)
fyers.setAccessToken(process.env.access_token);

// fyers.getQuotes(["NSE:SBIN-EQ"]).then((response) => {
//     console.log(JSON.stringify(response, null, 2))
// }).catch((err) => {
//     console.log(err)
// })

var inp = {
    "symbol": "NSE:BSE-EQ",
    "resolution": "5",
    "date_format": "1",
    "range_from": "2026-02-10",
    "range_to": "2026-02-11",
    "cont_flag": "1"
}

fyers.getHistory(inp).then((response) => {
    console.log(JSON.stringify(response, null, 2))
}).catch((err) => {
    console.log(err)
})

