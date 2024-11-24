// app.ts
import express, { NextFunction, Request, Response } from "express";
import { validate } from "express-validation";
import { downloadValidation, statusValidation } from "./api-schemas/apiSchemas";
import { Configuration } from "./config/config";
import { MongoStatusRepo } from "./db/MongoStatusRepo";
import { errorHandler } from "./error/errorHandler";
import { httpFileLogMiddleware, httpLogMiddleware, logger } from "./logging/logging";
import { AppService } from "./services/AppService";
import { StatusService } from "./services/StatusService";
import { MongoDataRepo } from "./db/MongoDataRepo";

const config = Configuration.getConfiguration();

/**
 * Asynchronously creates and initializes the main application service.
 *
 * @returns {Promise<AppService>} An instance of AppService with necessary dependencies.
 */
export const createApplication = async (): Promise<AppService> => {
    try {
        // Initialize MongoDB repositories
        const statusRepo = await MongoStatusRepo.getInstance();
        const dataRepo = await MongoDataRepo.getInstance();

        // Initialize services with their respective dependencies
        const statusService = new StatusService(statusRepo);
        return new AppService(statusService, dataRepo);
    } catch (error) {
        logger.error("Failed to create application", { metadata: { error } });
        throw error; // Rethrow to handle in the main function
    }
};

/**
 * Creates and returns the Express app.
 *
 * @param {AppService} appService - The main application service.
 * @returns {express.Application} The Express application.
 */
export const createExpressApp = (appService: AppService): express.Application => {
    // Initialize Express application
    const api = express();

    // Middleware to parse JSON bodies
    api.use(express.json());

    // Custom logging middlewares
    api.use(httpLogMiddleware);
    api.use(httpFileLogMiddleware);

    /**
     * Route: POST /url
     * Description: Enqueues a new URL for processing.
     * Validation: Ensures the request body adheres to the downloadValidation schema.
     */
    api.post("/url", validate(downloadValidation), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { url } = req.body;
            const response = await appService.enqueue(url);
            res.status(202).json(response); // 202 Accepted
        } catch (error) {
            next(error); // Pass errors to the error handler
        }
    });

    /**
     * Route: GET /url/:id
     * Description: Retrieves the status of a specific URL processing job.
     * Validation: Ensures the :id parameter adheres to the statusValidation schema.
     */
    api.get("/url/:id", validate(statusValidation), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const response = await appService.status(id);

            if (response === null) {
                res.status(404).json({ id, error: "Status not found" });
            } else {
                res.json(response);
            }
        } catch (error) {
            next(error);
        }
    });

    /**
     * Route: DELETE /url/:id
     * Description: Aborts a specific URL processing job.
     * Validation: Ensures the :id parameter adheres to the statusValidation schema.
     */
    api.delete("/url/:id", validate(statusValidation), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const response = await appService.abort(id);

            if (response === null) {
                res.status(404).json({ id, error: "Unable to abort successfully" });
            } else {
                res.json(response);
            }
        } catch (error) {
            next(error);
        }
    });

    // Global error handling middleware
    api.use(errorHandler);

    return api;
};

/**
 * The main function to set up and start the Express server.
 */
const main = async () => {
    try {
        logger.info("Configuration:", { metadata: { config } });

        // Create the main application service
        const appService = await createApplication();

        // Create the Express app
        const api = createExpressApp(appService);

        // Start the Express server
        api.listen(config.port, () => {
            logger.info(`Server started at: http://vizzuality-app:${config.port}`);
        });
    } catch (error) {
        logger.error("Failed to start the server", { metadata: { error } });
        process.exit(1); // Exit the process with failure
    }
};

// Start the server only if this module is the main module
if (require.main === module) {
    main();
}
