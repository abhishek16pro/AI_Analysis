import { fyersDataSocket as DataSocket } from "fyers-api-v3";
import dotenv from "dotenv";
dotenv.config();

var skt = DataSocket.getInstance(`${process.env.client_id}:${process.env.access_token}`,"./logs", true/*flag to enable disable logging*/)

skt.on("connect", function () {
    skt.subscribe(["NSE:SBIN-EQ"])
    //subscribing for market depth data if need of market depth comes as a diffrent tick
    // skt.subscribe(['NSE:IDEA-EQ', "NSE:SBIN-EQ"], true)
    //to start lite mode to get fewer data like ltp change
    skt.mode(skt.LiteMode)
    //to revert back to full mode
    // skt.mode(skt.FullMode) 
})

skt.on("message", function (message) {
    console.log({ "TEST": message })
})

skt.on("error", function (message) {
    console.log("erroris", message)
})

skt.on("close", function () {
    console.log("socket closed")
})
skt.connect()