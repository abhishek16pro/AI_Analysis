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
  // ✅ DEV MODE → pure console.log
  logger = {
    info: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
  };
} else {
  // ✅ PROD MODE → Winston + file

  const logDir = "logs";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  const baseLogger = winston.createLogger({
    level: "info",
    format: winston.format.printf(({ message }) => message),
    transports: [
      new winston.transports.File({
        filename: path.join(logDir, `app-${getCurrentDate()}.log`)
      }),
      new winston.transports.Console()
    ]
  });

  logger = {
    info: (...args) =>
      baseLogger.info(`${getISTTime()} ${formatArgs(args)}`),

    error: (...args) =>
      baseLogger.error(`${getISTTime()} ${formatArgs(args)}`),

    warn: (...args) =>
      baseLogger.warn(`${getISTTime()} ${formatArgs(args)}`),
  };
}

export default logger;