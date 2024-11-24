import morgan from "morgan";
import { createStream } from "rotating-file-stream";
import { Configuration } from "../config/config";

import winston from "winston";
import os from "os";
import DailyRotateFile from "winston-daily-rotate-file";

const hostname = os.hostname(); // Get the hostname of the machine

const customMetadata = {
    app: "vizzuality", // Example metadata field
    environment: process.env.NODE_ENV || "development",
};

export const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }), // Add a timestamp to each log
        winston.format.printf((info) => {
            return `${info.timestamp} [${hostname}] ${info.level}: ${info.message} ${JSON.stringify({ ...customMetadata, ...(info.metadata as object) })}`;
        }),
    ),
    transports: [
        // Write all logs with level `error` or higher to `error.log`
        new winston.transports.File({ filename: "error.log", level: "error", dirname: "logs" }),

        // Write all logs to `app.log`, rotating daily
        new DailyRotateFile({ filename: "app.log", dirname: "logs" }),
    ],
});

if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf((info) => {
                    return `${info.timestamp} [${hostname}] ${info.level}: ${info.message} ${JSON.stringify({ ...customMetadata, ...(info.metadata as object) }, null, 2)}`;
                }),
            ),
        }),
    );
}

const config = Configuration.getConfiguration();

const logFileStream = createStream(config.httpLogFile, {
    interval: config.httpLogFileInterval,
    path: config.httpLogFileDirectory,
});

export const httpLogMiddleware = morgan("dev");
export const httpFileLogMiddleware = morgan("common", { stream: logFileStream });
