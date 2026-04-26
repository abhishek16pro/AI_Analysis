import Log from "../../models/log.js";

// type = ['INFO', "ERROR", "MESSAGE", "SIM"]

export const saveLog = async (stgName, key, type, msg) => {
    try {
        const logMsg = {
            name: stgName || 'Unknown',
            key: key || 'Unknown',
            type: type,
            message: msg,
            time: new Date(),
        };

        await Log.create(logMsg);
    } catch (error) {
        console.error("Error saving log to DB:", error);
    }
};