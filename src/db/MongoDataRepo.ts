import dotenv from "dotenv";
import { Collection, Db, MongoClient } from "mongodb";
import { DataRepo, TripDataRow, UUID } from "../types/types";
import { logger } from "../logging/logging";

dotenv.config();

const DB_URL = process.env.DB_URL;
const DB_NAME = process.env.DB_NAME;

export class MongoDataRepo implements DataRepo<TripDataRow> {
    static #mongo: MongoDataRepo;

    #data: Collection;

    static async getInstance(): Promise<MongoDataRepo> {
        if (!MongoDataRepo.#mongo) {
            const client = new MongoClient(DB_URL!);
            await client.connect();
            const db = client.db(DB_NAME);
            MongoDataRepo.#mongo = new MongoDataRepo(db);
        }

        return MongoDataRepo.#mongo;
    }

    private constructor(private db: Db) {
        this.#data = this.db.collection("data");
    }

    async insertAll(id: UUID, docs: TripDataRow[]): Promise<void> {
        try {
            await this.#data.insertMany(docs.map((doc) => ({ ...doc, id })));
        } catch (error) {
            logger.error("Error inserting data", { metadata: { error } });
        }
    }

    async deleteAll(id: UUID): Promise<void> {
        try {
            await this.#data.deleteMany({ id });
        } catch (error) {
            logger.error("Error removing data", { metadata: { error } });
        }
    }
}
