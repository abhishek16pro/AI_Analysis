import { fyersModel } from 'fyers-api-v3'
import dotenv from "dotenv";
dotenv.config();

var fyers = new fyersModel({ "path": "./logs", "enableLogging": true })

fyers.setAppId(process.env.client_id)
fyers.setRedirectUrl(process.env.redirect_uri)
var URL = fyers.generateAuthCode()
console.log(URL);