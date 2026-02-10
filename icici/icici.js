// var BreezeConnect = require('breezeconnect').BreezeConnect;
import { BreezeConnect } from 'breezeconnect';
import dotenv from "dotenv";
dotenv.config();


var appKey = `${process.env.appkey_icici}`
var appSecret = `${process.env.secret_key_icici}`
// console.log("appKey==>", appKey);
// console.log("appSecret==>", appSecret);

var breeze = new BreezeConnect({ "appKey": appKey });

//Generate Session
breeze.generateSession(appSecret, '43619128').then(function (resp) {
    apiCalls();
}).catch(function (err) {
    console.log(err)
});

function apiCalls() {
    // breeze.getFunds().then(function (resp) {
    //     console.log("Final Response");
    //     console.log(resp);
    // });

    // breeze.placeOrder(
    //     {
    //         stockCode: "BANBAR",
    //         exchangeCode: "NSE",
    //         product: "cash",
    //         action: "buy",
    //         orderType: "limit",
    //         quantity: "1",
    //         price: "260",
    //         validity: "day"
    //     }
    // )
    //     .then(function (resp) {
    //         console.log(resp);
    //     })


    // breeze.getOrderList(
    //     {
    //         exchangeCode: "NSE",
    //         fromDate: "2024-07-01T09:00:00.000Z",
    //         toDate: "2024-07-01T15:00:00.000Z"
    //     }
    // )
    //     .then(function (resp) {
    //         console.log(resp);
    //     })

    // breeze.placeOrder(
    //     {
    //         stockCode:"NIFTY",
    //         exchangeCode:"NFO",
    //         product:"options",
    //         action:"buy",
    //         orderType:"stoploss",
    //         stoploss:"6",
    //         quantity:"25",
    //         price:"7",
    //         validity:"day",
    //         validityDate:"2024-07-04T06:00:00.000Z",
    //         disclosedQuantity:"0",
    //         expiryDate:"2024-07-04T06:00:00.000Z",
    //         right:"call",
    //         strikePrice:"24700"
    //     }
    // )
    //     .then(function (resp) {
    //         console.log(resp);
    //     })

    // breeze.getNames({ exchangeCode: 'NFO', stockCode: 'BANKNIFTY' })
    //     .then(function (resp) {
    //         console.log(resp);
    //     })

    // breeze.getOrderList(
    //     {
    //         exchangeCode: "NSE",
    //         fromDate: "2024-07-01T10:00:00.000Z",
    //         toDate: "2024-07-03T20:00:00.000Z"
    //     }
    // )
    //     .then(function (resp) {
    //         console.log(resp);
    //     })

    // breeze.getOrderDetail(
    //     {
    //         exchangeCode:"NSE",
    //         orderId:"20240701N100044097"
    //     }
    // )
    // .then(function(resp){
    //     console.log(resp);
    // })

    breeze.placeOrder(
        {
            stockCode:"NIFTY",
            exchangeCode:"NFO",
            product:"options",
            action:"buy",
            orderType:"limit",
            stoploss:"",
            quantity:"25",
            price:"0.5",
            validity:"day",
            validityDate:"2024-07-04T06:00:00.000Z",
            disclosedQuantity:"0",
            expiryDate:"2024-07-04T06:00:00.000Z",
            right:"call",
            strikePrice:"24500"
        }
    )
    .then(function(resp){
        console.log(resp);
    })
    breeze.gethis
}

