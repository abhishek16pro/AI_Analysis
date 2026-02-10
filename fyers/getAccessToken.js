import { fyersModel } from 'fyers-api-v3'
import dotenv from "dotenv";
dotenv.config();

var fyers = new fyersModel({ "path": "./logs", "enableLogging": true })

fyers.generate_access_token({"client_id":process.env.client_id,"secret_key":process.env.secret_key,"auth_code":process.env.auth_code}).then((response)=>{
    if(response.s=='ok'){
        console.log(response.access_token);
    }else{
        console.log("error generating access token",response)
    }
})