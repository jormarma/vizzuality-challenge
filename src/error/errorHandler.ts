import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ValidationError } from "express-validation";

export const errorHandler: ErrorRequestHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        next(err);
    } else if (err instanceof ValidationError) {
        res.status(err.statusCode).json(err);
    } else {
        res.status(500).json({
            error: "Internal Server Error",
            message: err instanceof Error ? err.message : "Unknown error",
        });
    }
};
