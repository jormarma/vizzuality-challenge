import dotenv from "dotenv";
import { Collection, Db, MongoClient } from "mongodb";
import { StatusInfo, StatusRepo, UUID } from "../types/types";
import { logger } from "../logging/logging";

dotenv.config();

const DB_URL = process.env.DB_URL;
const DB_NAME = process.env.DB_NAME;

export class MongoStatusRepo implements StatusRepo<StatusInfo> {
    static #mongo: MongoStatusRepo;

    #status: Collection;

    static async getInstance(): Promise<MongoStatusRepo> {
        if (!MongoStatusRepo.#mongo) {
            const client = new MongoClient(DB_URL!);
            // TODO: try catch
            await client.connect();
            const db = client.db(DB_NAME);
            MongoStatusRepo.#mongo = new MongoStatusRepo(db);
        }

        return MongoStatusRepo.#mongo;
    }

    private constructor(private db: Db) {
        this.#status = this.db.collection("status");
    }

    async getStatus(id: UUID): Promise<StatusInfo | null> {
        try {
            const statusInfo = await this.#status.findOne<StatusInfo>({ id }, { projection: { _id: 0 } });
            return statusInfo ?? null;
        } catch (error) {
            logger.error("Error getting the status", {metadata: { error }});
            return null;
        }
    }

    async updateStatus(statusInfo: StatusInfo): Promise<void> {
        const { id } = statusInfo;
        const $set = { ...statusInfo };

        try {
            await this.#status.updateOne({ id }, { $set }, { upsert: true });
        } catch (error) {
            logger.error("Error updating the status", {metadata: { error }});
        }
    }
}
