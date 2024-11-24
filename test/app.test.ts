// app.test.ts
import request from "supertest";
import { createExpressApp } from "../src/app"; // Adjust the path as necessary
import { AppService } from "../src/services/AppService";
import { Application } from "express";
import { Status, UUID } from "../src/types/types";

describe("API Endpoints", () => {
    let appService: jest.Mocked<AppService>;
    let app: Application;
    let id: UUID;
    let invalidId: UUID;

    beforeEach(() => {
        // Create a mock AppService
        appService = {
            enqueue: jest.fn(),
            status: jest.fn(),
            abort: jest.fn(),
        } as unknown as jest.Mocked<AppService>;

        // Create the Express app with the mock AppService
        app = createExpressApp(appService);
        id = "b116682c-60a0-4e7c-b68d-9f3dc4b2034c";
        invalidId = "b116682c-60a0-4e7c-b68d-9f3dc4b2034d";
    });

    describe("POST /url", () => {
        it("should enqueue a URL and return 202", async () => {
            const mockResponse = { id, status: Status.Pending, position: 1 } as any;
            appService.enqueue.mockResolvedValue(mockResponse);

            const res = await request(app).post("/url").send({ url: "http://example.com" });

            expect(res.statusCode).toEqual(202);
            expect(res.body).toEqual(mockResponse);
            expect(appService.enqueue).toHaveBeenCalledWith("http://example.com");
        });

        it("should return validation error for invalid URL", async () => {
            const res = await request(app).post("/url").send({ url: "invalid_url" });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty("message");
        });

        it("should handle errors thrown by enqueue", async () => {
            appService.enqueue.mockRejectedValue(new Error("Enqueue failed"));

            const res = await request(app).post("/url").send({ url: "http://example.com" });

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty("message", "Enqueue failed");
        });
    });

    describe("GET /url/:id", () => {
        it("should return status for valid id", async () => {
            const mockResponse = { id, status: Status.InProgress, position: 1 } as any;
            appService.status.mockResolvedValue(mockResponse);

            const res = await request(app).get(`/url/${id}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockResponse);
            expect(appService.status).toHaveBeenCalledWith(id);
        });

        it("should return 404 if status not found", async () => {
            appService.status.mockResolvedValue(null);

            const res = await request(app).get(`/url/${id}`);

            expect(res.statusCode).toEqual(404);
            expect(res.body).toEqual({ id, error: "Status not found" });
        });

        it("should return validation error for invalid id", async () => {
            const res = await request(app).get("/url/invalid_id");

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty("message");
        });

        it("should handle errors thrown by status", async () => {
            appService.status.mockRejectedValue(new Error("Status failed"));

            const res = await request(app).get(`/url/${id}`);

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty("message", "Status failed");
        });
    });

    describe("DELETE /url/:id", () => {
        it("should abort job for valid id", async () => {
            const mockResponse = { id, status: "aborted", position: 1 } as any;
            appService.abort.mockResolvedValue(mockResponse);

            const res = await request(app).delete(`/url/${id}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockResponse);
            expect(appService.abort).toHaveBeenCalledWith(id);
        });

        it("should return 404 if unable to abort", async () => {
            appService.abort.mockResolvedValue(null);

            const res = await request(app).delete(`/url/${id}`);

            expect(res.statusCode).toEqual(404);
            expect(res.body).toEqual({ id, error: "Unable to abort successfully" });
        });

        it("should return validation error for invalid id", async () => {
            const res = await request(app).delete(`/url/invalid_id`);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty("message");
        });

        it("should handle errors thrown by abort", async () => {
            appService.abort.mockRejectedValue(new Error("Abort failed"));

            const res = await request(app).delete(`/url/${id}`);

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty("message", "Abort failed");
        });
    });
});
