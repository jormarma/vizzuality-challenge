import dotenv from "dotenv";
import { cpus } from "os";

export interface ConfigurationType {
    // Number of lines to insert in the DB in batch (default: `10_000`)
    batchSize: number;

    // Port of the application (default: `3000`)
    port: number;

    // Port of the external application (default: `3001`)
    portExternal: number;

    // Download jobs queue polling interval (default: `1000` milliseconds)
    downloadJobInterval: number;

    // Database url (default: `"mongodb://localhost:27017"`)
    dbUrl: string;

    // Database name (default: `"vizzuality"`)
    dbName: string;

    // https://www.npmjs.com/package/rotating-file-stream#interval
    // Log file name (default: `"http-log.file"`)
    httpLogFile: string;

    // Log file directory (default: `join(process.cwd(), "logs")`)
    httpLogFileDirectory: string;

    // Time window before splitting the log file (default: `"1d"`, (one day))
    httpLogFileInterval: string;

    // Number of possible concurrentdownloads (default: `os.cpus().length`)
    concurrentDownloads: number;

    // Delete the inserted records on abort (default: `false`)
    deleteOnAbort: boolean;
}

export class Configuration {
    static configuration: ConfigurationType;

    static getConfiguration = () => {
        if (!Configuration.configuration) {
            dotenv.config();
            Configuration.configuration = {
                batchSize: process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE, 10) : 1_000,
                port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3_000,
                portExternal: process.env.PORT_EXTERNAL ? parseInt(process.env.PORT_EXTERNAL, 10) : 3_001,
                downloadJobInterval: process.env.DOWNLOAD_JOB_INTERVAL ? parseInt(process.env.DOWNLOAD_JOB_INTERVAL, 10) : 1_000,
                dbUrl: process.env.DB_URL || "mongodb://localhost:27017",
                dbName: process.env.DB_NAME || "vizzuality",
                httpLogFile: process.env.HTTP_LOG_FILE || "http-log.file",
                httpLogFileInterval: process.env.HTTP_LOG_FILE_INTERVAL || "1d",
                httpLogFileDirectory: process.env.HTTP_LOG_FILE_DIRECTORY || "logs",
                concurrentDownloads: process.env.CONCURRENT_DOWNLOADS ? parseInt(process.env.CONCURRENT_DOWNLOADS, 10) : cpus().length,
                deleteOnAbort: process.env.DELETE_ON_ABORT
                    ? ["true", "yes"].includes(process.env.DELETE_ON_ABORT.toLowerCase().trim())
                    : false,
            };
        }

        return Configuration.configuration;
    };
}
