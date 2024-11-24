import axios, { AxiosInstance } from "axios";
import { Readable } from "node:stream";
import { MessagePort, parentPort, workerData } from "node:worker_threads";
import { TripDataCsvAdapter } from "../adapter/TripDataCsvAdapter";
import { MongoDataRepo } from "../db/MongoDataRepo";
import { MongoStatusRepo } from "../db/MongoStatusRepo";
import { CsvAdapter, DataRepo, Status, StatusInfo, StatusRepo, TripDataRow, UUID } from "../types/types";
import { Configuration } from "../config/config";
import { logger } from "../logging/logging";

/**
 * Configuration settings for the application.
 */
const config = Configuration.getConfiguration();

/**
 * Factory function to create an updateStatus function with pre-bound parameters.
 * This function updates the status in the repository and communicates the status via the MessagePort.
 *
 * @param id - Unique identifier for the download job.
 * @param url - The URL being downloaded.
 * @param startTime - Timestamp when the download started.
 * @param statusRepo - Repository for updating status information.
 * @param port - MessagePort for communicating status updates to the main thread.
 * @returns An async function to update the status.
 */
export const updateStatusFactory = (id: UUID, url: string, startTime: number, statusRepo: StatusRepo<StatusInfo>, port: MessagePort) => {
    return async (info: Partial<StatusInfo>) => {
        const { status, percentage } = info;
        const duration = Date.now() - startTime;
        const statusInfo = {
            ...info,
            id,
            url,
            duration,
        } as StatusInfo;

        // Calculate ETA if the status is InProgress and percentage is provided
        if (status === Status.InProgress && percentage !== undefined) {
            const millis = Math.round((duration * 100) / percentage);
            statusInfo.eta = new Date(Date.now() + millis);
        } else {
            statusInfo.eta = new Date();
        }

        try {
            // Update the status in the repository
            await statusRepo.updateStatus(statusInfo);
            // Communicate the updated status back to the main thread
            port.postMessage(statusInfo);
        } catch (error) {
            logger.error("Failed to update status", { metadata: { error } });
        }
    };
};

/**
 * Downloads a CSV file from a given URL, processes its content, and updates the status.
 *
 * @param adapter - Adapter to convert CSV lines to TripDataRow objects.
 * @param statusRepo - Repository to update status information.
 * @param dataRepo - Repository to insert TripDataRow data into the database.
 * @param id - Unique identifier for the download job.
 * @param url - The URL to download the CSV file from.
 * @param port - MessagePort for communicating status updates to the main thread.
 * @param axiosInstance - (Optional) Axios instance for making HTTP requests. Useful for testing.
 */
export const download = async (
    adapter: CsvAdapter<TripDataRow>,
    statusRepo: StatusRepo<StatusInfo>,
    dataRepo: DataRepo<TripDataRow>,
    id: UUID,
    url: string,
    port: MessagePort,
    axiosInstance: AxiosInstance = axios,
) => {
    const startTime = Date.now();

    port.postMessage({ id, url, message: "DOWNLOAD STARTED" });

    const updateStatus = updateStatusFactory(id, url, startTime, statusRepo, port);

    let docs: TripDataRow[] = [];
    let records = 0;
    let dataProcessed = 0;
    let remainingText = "";
    let isFirstLine = true; // Flag to identify the header line

    try {
        const response = await axiosInstance.get(url, { responseType: "stream" });

        const contentLength = parseInt(response.headers["content-length"] || "0", 10);
        if (isNaN(contentLength) || contentLength <= 0) {
            throw new Error("Invalid content length");
        }

        await updateStatus({ status: Status.InProgress, percentage: 0, records });

        const readable: Readable = response.data;

        readable.on("end", async () => {
            logger.info("Download completed", { metadata: { id } });
            await updateStatus({ status: Status.Finished, percentage: 100, records });
        });

        readable.on("error", async (error: Error) => {
            logger.error("Stream error in job", { metadata: { id, error } });
            readable.destroy();
            await updateStatus({
                status: Status.Error,
                percentage: (dataProcessed / contentLength) * 100,
                records,
                error: error.message,
            });
        });

        for await (const chunk of readable) {
            dataProcessed += chunk.length;

            const data = remainingText + chunk.toString("utf-8");
            const lastNewlineIndex = data.lastIndexOf("\n");

            if (lastNewlineIndex === -1) {
                remainingText = data;
                continue;
            }

            const completeData = data.slice(0, lastNewlineIndex);
            remainingText = data.slice(lastNewlineIndex + 1);

            const lines = completeData.split("\n");

            for (const line of lines) {
                if (isFirstLine) {
                    // Skip the header line
                    isFirstLine = false;
                    continue;
                }

                if (line.trim() === "") continue; // Skip empty lines

                records += 1;
                const doc = adapter.lineToObject(line);

                docs.push(doc);

                if (docs.length >= config.batchSize) {
                    const percentage = (dataProcessed / contentLength) * 100;
                    try {
                        await dataRepo.insertAll(id, docs);
                        await updateStatus({ status: Status.InProgress, percentage, records });
                        docs = [];
                    } catch (error) {
                        logger.error("Error inserting documents:", { metadata: { error } });
                    }
                }
            }
        }

        if (docs.length > 0) {
            const percentage = (dataProcessed / contentLength) * 100;
            try {
                await dataRepo.insertAll(id, docs);
                await updateStatus({ status: Status.Finished, percentage, records });
                port.postMessage({ id, url, message: "DOWNLOAD FINISHED" });
            } catch (error) {
                logger.error("Error inserting remaining documents", { metadata: { error } });
                await updateStatus({ status: Status.Error, error: (error as Error).message });
                port.postMessage({ id, url, message: "ERROR DOWNLOADING" });
            }
        }
    } catch (error) {
        logger.error("Error downloading file", { metadata: { id, error } });
        try {
            await updateStatus({ status: Status.Error, error: (error as Error).message });
        } catch (err) {
            logger.error("Error updating the status after download failure", { error: err });
        }
        port.postMessage({ id, url, message: "ERROR DOWNLOADING" });
    }
};

/**
 * Initializes and starts the download worker.
 * Sets up necessary adapters and repositories, then starts the download process.
 */
export const downloadWorker = async () => {
    try {
        // Initialize the CSV adapter
        const adapter = new TripDataCsvAdapter();

        // Initialize repositories
        const statusRepo = await MongoStatusRepo.getInstance();
        const dataRepo = await MongoDataRepo.getInstance();

        // Extract worker data
        const { id, url }: { id: UUID; url: string } = workerData;
        const port = parentPort;

        if (!port) {
            throw new Error(`Error communicating worker ${id} with main thread`);
        }

        // Start the download process
        await download(adapter, statusRepo, dataRepo, id, url, port);
    } catch (error) {
        logger.error("Failed to initialize download worker", { metadata: { error } });
        process.exit(1); // Exit the worker process with failure
    }
};

// If this file is being run as a worker thread, start the worker
if (parentPort) {
    downloadWorker();
}
