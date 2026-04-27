import connectRedis from "./connectRedis.js";

const client = await connectRedis()

// type = ['INFO', "ERROR", "MESSAGE", "SIM"]
// add client id in message first if possible

export const saveLog = async (stgName, key, type, msg) => {
  const logQueue = "Logs";
  // console.log("msg",msg,type);
  let logMsg = {
    name: stgName || 'Unknown',
    key: key || 'Unknown',
    type: type,
    message: msg,
    time: new Date(),
  };

  client.lpush(logQueue, JSON.stringify(logMsg));
};