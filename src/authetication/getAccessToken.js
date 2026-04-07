import { fyersModel } from 'fyers-api-v3'
import connectRedis from '../utils/connectRedis.js';
import dotenv from "dotenv";
dotenv.config();

var fyers = new fyersModel({ "enableLogging": false })
const client = await connectRedis();

fyers.generate_access_token({ "client_id": process.env.client_id, "secret_key": process.env.secret_key, "auth_code": process.env.auth_code }).then(async (response) => {
    if (response.s == 'ok') {
        await client.set("FYERS_TOKEN", response.access_token);
        console.log(response.access_token);
    } else {
        console.log("error generating access token", response)
    }
})
