import redisConnect from "./redisConnect.js";
const client = redisConnect();

export const saveLog = async (name, type, msg) => {
    const logQueue = "Logs";
    let logMsg = {
        name: name,
        type: type,
        message: msg,
        time: new Date(),
    };

    client.lpush(logQueue, JSON.stringify(logMsg));
};