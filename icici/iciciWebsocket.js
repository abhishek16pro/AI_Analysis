import { BreezeConnect } from 'breezeconnect';
import dotenv from "dotenv";
dotenv.config();

var appKey = `${process.env.appkey_icici}`
var appSecret = `${process.env.secret_key_icici}`
var breeze = new BreezeConnect({ "appKey": appKey });

//Generate Session
breeze.generateSession(appSecret, process.env.session_icici).then((res) => {
    console.log("res");
    //Connect to websocket(it will connect to rate refresh server)
    breeze.wsConnect();

    //Callback to receive ticks.
    function onTicks(ticks) {
        console.log(ticks);
    }

    //Assign the callbacks
    breeze.onTicks = onTicks;

    // subscribe to i_click_2_gain strategy stream
    // breeze.subscribeFeeds({ stockToken: "i_click_2_gain" })
    //     .then(
    //         function (resp) {
    //             console.log(resp);
    //         }
    //     )

    // subscribe stocks feeds by stock-token
    breeze.subscribeFeeds({ stockToken: "4.1!49580" })
        .then(
            function (resp) {
                console.log(resp);
            }
        )

    // breeze.subscribeFeeds(
    //     {
    //         exchangeCode: "NFO",
    //         stockCode: "CNXBAN",
    //         productType: "options",
    //         expiryDate: "01-Jun-2024",
    //         strikePrice: "53000",
    //         right: "Call",
    //         getExchangeQuotes: true,
    //         getMarketDepth: true
    //     }
    // ).then(function (resp) { console.log(resp) });

})