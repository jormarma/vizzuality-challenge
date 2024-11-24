import { download } from "../../src/worker/downloadWorker";
import { StatusInfo, TripDataRow, UUID, Status, CsvAdapter, StatusRepo, DataRepo } from "../../src/types/types";
import { MessagePort } from "worker_threads";
import axios from "axios";
import { Readable } from "stream";

// Mock dependencies
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("download function", () => {
    let adapter: CsvAdapter<TripDataRow>;
    let statusRepo: StatusRepo<StatusInfo>;
    let dataRepo: DataRepo<TripDataRow>;
    let port: MessagePort;
    let id: UUID;
    let url: string;

    beforeEach(() => {
        // Initialize mocks
        adapter = {
            lineToObject: jest.fn((line: string) => {
                const [date, name, distanceStr, durationStr] = line.split(",");
                return {
                    date,
                    name,
                    distance: parseFloat(distanceStr),
                    duration: parseFloat(durationStr),
                };
            }),
        } as unknown as CsvAdapter<TripDataRow>;

        statusRepo = {
            updateStatus: jest.fn(),
        } as unknown as StatusRepo<StatusInfo>;

        dataRepo = {
            insertAll: jest.fn(),
        } as unknown as DataRepo<TripDataRow>;

        port = {
            postMessage: jest.fn(),
        } as unknown as MessagePort;

        id = "123e4567-e89b-12d3-a456-426614174000";
        url = "http://example.com/data.csv";
    });

    it("should process and insert data correctly", async () => {
        // Mock the Axios response stream
        const mockStream = new Readable({
            read() {
                // Header line + two data lines
                this.push("date,name,distance,duration\n");
                this.push("2023-01-01,John Doe,100.5,200.75\n");
                this.push("2023-01-02,Jane Smith,150.0,300.5\n");
                this.push(null); // End of stream
            },
        });

        mockedAxios.get.mockResolvedValue({
            data: mockStream,
            headers: {
                "content-length": "150",
            },
        });

        // Call the download function
        await download(adapter, statusRepo, dataRepo, id, url, port);

        // Assertions
        expect(mockedAxios.get).toHaveBeenCalledWith(url, { responseType: "stream" });
        expect(statusRepo.updateStatus).toHaveBeenCalledTimes(3); // InProgress, InProgress (after first batch), Finished
        expect(dataRepo.insertAll).toHaveBeenCalledTimes(1); // One batch
        expect(adapter.lineToObject).toHaveBeenCalledTimes(2); // Two data lines (header skipped)
    });

    it("should handle download errors gracefully", async () => {
        // Mock Axios to throw an error
        mockedAxios.get.mockRejectedValue(new Error("Network Error"));

        // Call the download function
        await download(adapter, statusRepo, dataRepo, id, url, port);

        // Assertions
        expect(statusRepo.updateStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                status: Status.Error,
                error: "Network Error",
            }),
        );
        expect(port.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                status: Status.Error,
                error: "Network Error",
            }),
        );
    });

    it("should handle stream errors gracefully", async () => {
        // Mock the Axios response stream with an error
        const mockStream = new Readable({
            read() {
                this.emit("error", new Error("Stream Failure"));
            },
        });

        mockedAxios.get.mockResolvedValue({
            data: mockStream,
            headers: {
                "content-length": "100",
            },
        });

        // Call the download function
        await download(adapter, statusRepo, dataRepo, id, url, port);

        // Assertions
        expect(statusRepo.updateStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                status: Status.Error,
                error: "Stream Failure",
            }),
        );
        expect(port.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                status: Status.Error,
                error: "Stream Failure",
            }),
        );
    });
});
