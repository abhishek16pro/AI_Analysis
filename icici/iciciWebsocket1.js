import { BreezeConnect } from 'breezeconnect';
import dotenv from "dotenv";
dotenv.config();

var appKey = `${process.env.appkey_icici}`
var appSecret = `${process.env.secret_key_icici}`
var breeze = new BreezeConnect({ "appKey": appKey });

//Generate Session
breeze.generateSession(appSecret, '43489540').then((res) => {
    console.log("res");
    //Connect to websocket(it will connect to rate refresh server)
    breeze.wsConnect();

    //Callback to receive ticks.
    function onTicks(ticks) {
        console.log(ticks);
    }

    //Assign the callbacks
    breeze.onTicks = onTicks;



    // breeze.subscribeFeeds(
    //     {
    //         exchangeCode: "NFO",
    //         stockCode: "NIFTY",
    //         productType: "options",
    //         expiryDate: "04-Jul-2024",
    //         right: "Call",
    //         strikePrice: "24000",
    //         // getExchangeQuotes: true,
    //         getMarketDepth: true
    //     }
    // ).then(function (resp) { console.log(resp) });

    breeze.subscribeFeeds({ getOrderNotification: true }).then(
        function (resp) {
            console.log(resp);
        }
    )

})