import winston from "winston";
import fs from "fs";
import path from "path";

const isDev = process.argv.includes("--dev");

// IST time
const getISTTime = () => {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false
  });
};


const getCurrentDate = () => {
  const d = new Date();
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
};

// 👉 helper (for prod formatting)
const formatArgs = (args) => {
  return args.map(arg => {
    if (arg instanceof Error) return arg.stack;

    if (typeof arg === "object") {
      if (arg?._doc) return JSON.stringify(arg._doc, null, 2);
      if (typeof arg.toObject === "function") return JSON.stringify(arg.toObject(), null, 2);
      return JSON.stringify(arg, null, 2);
    }

    return arg;
  }).join(" ");
};

let logger;

if (isDev) {
  // ✅ DEV MODE → Winston with simple console
  const baseLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp({ format: getISTTime }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level.toUpperCase()}: ${message}${metaStr}`;
      })
    ),
    transports: [new winston.transports.Console()]
  });

  logger = {
    info: (message, meta = {}) => baseLogger.info(message, meta),
    error: (message, meta = {}) => baseLogger.error(message, meta),
    warn: (message, meta = {}) => baseLogger.warn(message, meta),
    child: (defaultMeta) => ({
      info: (message, meta = {}) => baseLogger.info(message, { ...defaultMeta, ...meta }),
      error: (message, meta = {}) => baseLogger.error(message, { ...defaultMeta, ...meta }),
      warn: (message, meta = {}) => baseLogger.warn(message, { ...defaultMeta, ...meta }),
    })
  };
} else {
  // ✅ PROD MODE → Winston with JSON file and console
  const logDir = "logs";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  const baseLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp({ format: getISTTime }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logDir, `app-${getCurrentDate()}.log`)
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: getISTTime }),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level.toUpperCase()}: ${message}${metaStr}`;
          })
        )
      })
    ]
  });

  logger = {
    info: (message, meta = {}) => baseLogger.info(message, meta),
    error: (message, meta = {}) => baseLogger.error(message, meta),
    warn: (message, meta = {}) => baseLogger.warn(message, meta),
    child: (defaultMeta) => baseLogger.child(defaultMeta)
  };
}

export default logger;