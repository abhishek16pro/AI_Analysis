import axios from 'axios';
import { saveLog } from './saveLogs.js';
import logger from './logger.js';
import connectRedis from './connectRedis.js';
import { tokenMapping } from './constant.js';

let redisClient;

// Initialize Redis client
async function initRedis() {
    if (!redisClient) {
        redisClient = await connectRedis();
    }
}

export async function addStrategy(strategy) {
    try {
        const token = await getAuthToken();
        logger.info("Adding strategy with payload:", { url: `${process.env.BASE_API_URL}/strategy/add` });
        let url = `${process.env.BASE_API_URL}/strategy/add`;
        let response = await axios.post(url, strategy, {
            headers: {
                Authorization: `${token}`
            }
        });
        console.log("Strategy added successfully:", response.data.data);
        // logger.info("Strategy added successfully:", response);
        return response.data.data._id;

    } catch (error) {
        logger.error("Error adding strategy:", error);
        await saveLog(strategy?.name || 'Unknown', 'addStrategy', "ERROR", `Error adding strategy: ${error.message}`);
        throw error;
    }
}

export function getStgNameByCounter(str) {
    const match = str.match(/_(\d+)$/);

    if (match) {
        const number = parseInt(match[1], 10);
        return str.replace(/_(\d+)$/, `_${number + 1}`);
    }

    return `${str}_1`;
}

export async function getStgName(name) {
    try {
        const token = await getAuthToken();
        const url = `${process.env.BASE_API_URL}/strategy/list`;

        logger.info("Fetching strategy list from API...");
        let response = await axios.get(url, {
            headers: {
                Authorization: `${token}`
            }
        });

        // Extract all strategy names from the list
        const strategyList = response.data.data || [];
        const existingNames = strategyList.map(stg => stg.name);

        logger.info("Existing strategies:", existingNames.length);

        // Check if the original name exists
        if (!existingNames.includes(name)) {
            logger.info(`✅ Strategy name "${name}" is available`);
            return name;
        }

        while (existingNames.includes(name)) {
            name = getStgNameByCounter(name);
        }

        logger.info(`✅ Strategy name "${name}" is available`);
        return name;

    } catch (error) {
        logger.error("Error fetching strategy name:", error.response ? error.response.data : error.message);
        await saveLog(name || 'Unknown', 'getStgName', "ERROR", `Error fetching strategy name: ${error.message}`);

        throw error;
    }

}

export async function triggerStg(id) {
    try {
        const token = await getAuthToken();
        logger.info("Triggering strategy with ID:", { id });
        let url = `${process.env.BASE_API_URL}/strategy/loadStrategy/${id}`;
        let response = await axios.post(url, {}, {
            headers: {
                Authorization: `${token}`
            }
        });
        // console.log("Strategy triggered successfully:", response.data.message);
        // logger.info("Strategy triggered successfully:", response);
        return response.data.message;
    } catch (error) {
        logger.error("Error triggering strategy:", error.response ? error.response.data : error.message);
        await saveLog('Unknown', 'triggerStg', "ERROR", `Error triggering strategy ${id}: ${error.message}`);
        throw error;
    }
}

// this function will return ["Running", "Profit", "Loss"] based on the strategy status
export async function getStgStatus(name) {
    try {
        await initRedis();
        let viewName = `VIEW:${name}_view`;
        logger.info("Fetching strategy status from Redis for key:", { viewName });
        let stg = await redisClient.get(`VIEW:${name}_view`);
        stg = JSON.parse(stg);
        if (stg.status === "Running") return "Running";
        else if (stg.status === "Completed") {
            if (stg.pnl > 0) return "Profit";
            else return "Loss";
        }
        return null
    } catch (error) {
        logger.error("Error fetching strategy status:", error.response ? error.response.data : error.message);
        await saveLog(name, 'getStgStatus', "ERROR", `Error fetching strategy status : ${error.message}`);
        throw error;
    }
}

export async function getUnderLying(index) {
    try {
        await initRedis();
        const underlyingJson = await redisClient.get(tokenMapping[index].toString());
        const underlyingParse = JSON.parse(underlyingJson);
        const underlyingValue = parseFloat(underlyingParse.Rate);
        return underlyingValue;

    } catch (error) {
        logger.error("Error fetching underlying price:", error.response ? error.response.data : error.message);
    }
}

async function getAuthToken() {
    try {
        // Initialize Redis if not already done
        await initRedis();

        const PORTAL_TOKEN_KEY = "PORTALTOKEN";
        const TOKEN_EXPIRY = 3600; // 1 hour in seconds

        // Step 1: Check if token exists in Redis
        logger.info("Checking for cached token in Redis...");
        const cachedToken = await redisClient.get(PORTAL_TOKEN_KEY);

        if (cachedToken) {
            logger.info("✅ Token found in Redis cache!");
            return cachedToken;
        }

        // Step 2: Token not in cache, generate new one
        logger.info("🟡 Token not in cache, generating new token...");
        let url = `${process.env.BASE_API_URL}/admin/login`;
        let payload = {
            email: process.env.Email,
            password: process.env.Password
        };
        logger.info("Requesting auth token with payload:", url, payload);

        let response = await axios.post(url, payload);
        const newToken = response.data.data;

        // Step 3: Save token to Redis with 1 hour expiry
        logger.info("💾 Saving token to Redis with 1 hour expiry...");
        await redisClient.setex(PORTAL_TOKEN_KEY, TOKEN_EXPIRY, newToken);
        logger.info("✅ Token saved to Redis successfully!");

        return newToken;

    } catch (error) {
        logger.error("Error requesting auth token:", error.response ? error.response.data : error.message);
        await saveLog(name, 'getAuthToken', "ERROR", `Error requesting auth token: ${error.message}`);
        throw error;
    }
}