import { Worker } from "worker_threads";

export type UUID = string;

export interface UrlInfo {
    id: UUID;
    url: string;
}

export enum Status {
    Pending = "Pending",
    InProgress = "InProgress",
    Error = "Error",
    Finished = "Finished",
    Aborted = "Aborted",
}

export interface StatusInfo {
    id: string;
    status: Status;
    url?: string;
    percentage?: number;
    records?: number;
    duration?: number;
    eta?: Date;
    error?: string;
}

export interface TripDataRow {
    hvfhs_license_num: string | null;
    dispatching_base_num: string | null;
    originating_base_num: string | null;
    request_datetime: Date | null;
    on_scene_datetime: Date | null;
    pickup_datetime: Date | null;
    dropoff_datetime: Date | null;
    PULocationID: number | null;
    DOLocationID: number | null;
    trip_miles: number | null;
    trip_time: number | null;
    base_passenger_fare: number | null;
    tolls: number | null;
    bcf: number | null;
    sales_tax: number | null;
    congestion_surcharge: number | null;
    airport_fee: number | null;
    tips: number | null;
    driver_pay: number | null;
    shared_request_flag: boolean;
    shared_match_flag: boolean;
    access_a_ride_flag: boolean;
    wav_request_flag: boolean;
    wav_match_flag: boolean;
}

export interface CsvAdapter<T> {
    lineToObject(line: string): T;
}

export interface DataRepo<TYPE> {
    insertAll(id: UUID, docs: TYPE[]): Promise<void>;
    deleteAll(id: UUID): Promise<void>;
}

export interface StatusRepo<STATUSINFO> {
    updateStatus(statusInfo: STATUSINFO): Promise<void>;
    getStatus(id: UUID): Promise<STATUSINFO | null>;
}

export type InProgressWorker = {
    id: UUID;
    url: string;
    worker: Worker;
};
