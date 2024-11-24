import { randomUUID } from "crypto";
import { Worker } from "node:worker_threads";
import { Configuration } from "../config/config";
import { DataRepo, UrlInfo as DownloadJob, InProgressWorker, Status, StatusInfo, TripDataRow, UUID } from "../types/types";
import { StatusService } from "./StatusService";
import os from "os";
import { logger } from "../logging/logging";

const config = Configuration.getConfiguration();

export class AppService {
    #pendingDownloads: DownloadJob[];
    #workersMap: Map<UUID, InProgressWorker>;
    #maxWorkers: number;

    constructor(
        private statusService: StatusService,
        private dataRepo: DataRepo<TripDataRow>,
    ) {
        this.#pendingDownloads = [];
        this.#workersMap = new Map();
        this.#maxWorkers = config.concurrentDownloads ?? os.cpus().length;
        setInterval(async () => {
            if (this.#pendingDownloads.length > 0 && this.#workersMap.size < this.#maxWorkers) {
                const job = this.#pendingDownloads.shift()!;
                try {
                    const result = await this.runDownload(job);
                    logger.info("Worker finished", { metadata: { result } });
                } catch (error) {
                    logger.error("Worker error", { metadata: { error } });
                }
            } else {
                const inProgress = [...this.#workersMap.values()].map(({ id, url }) => ({ id, url }));
                const info = { metadata: { inProgress, pending: this.#pendingDownloads } };
                if (this.#workersMap.size === this.#maxWorkers) {
                    logger.info("ALL WORKERS BUSY", info);
                } else {
                    logger.info("WORKERS INFO", info);
                }
            }
        }, config.downloadJobInterval);
    }

    private runDownload = async (workerData: DownloadJob) => {
        const { id, url } = workerData;
        const workers = this.#workersMap;
        return new Promise((resolve, reject) => {
            const worker = new Worker("./dist/worker/downloadWorker.js", { workerData });
            workers.set(id, { id, url, worker });

            worker.on("message", (msg: StatusInfo) => {
                const { status } = msg;

                if (status === Status.Aborted || status === Status.Finished) {
                    workers.delete(id);
                    resolve(msg);
                } else if (status === Status.Error) {
                    workers.delete(id);
                    reject(msg.error);
                } else if (status === Status.InProgress) {
                    logger.debug("WORKER STATUS:", JSON.stringify(msg));
                }
            });

            worker.on("error", (err) => {
                workers.delete(id);
                reject(err);
            });

            worker.on("exit", (code) => {
                if (code !== 0) {
                    workers.delete(id);
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
    };

    async enqueue(url: string) {
        // Generate a new ID for the job
        const id = randomUUID();

        const job: DownloadJob = { id, url };
        this.#pendingDownloads.push(job);
        await this.statusService.updateStatus(id, Status.Pending);

        // Return the generated id, and the position in the queue
        return { ...job, position: this.#pendingDownloads.length };
    }

    async status(id: UUID): Promise<StatusInfo | null> {
        return await this.statusService.getStatus(id);
    }

    async abort(id: UUID): Promise<StatusInfo | null> {
        const inProgressWorker = this.#workersMap.get(id);
        if (inProgressWorker) {
            inProgressWorker.worker.terminate();
            await this.statusService.updateStatus(id, Status.Aborted);
            if (config.deleteOnAbort) {
                await this.dataRepo.deleteAll(id);
            }
        }

        return await this.statusService.getStatus(id);
    }
}
