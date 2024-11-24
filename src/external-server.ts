import express, { Request, Response } from "express";
import fs from "fs";
import { join } from "path";
import { logger } from "./logging/logging";

const port = process.env.PORT_EXTERNAL ?? 3001;

const app = express();

app.get("/files/:file", (req: Request, res: Response) => {
    const file = req.params.file;
    const filePath = join(process.cwd(), "csvs", file);
    const size = fs.statSync(filePath).size;

    res.writeHead(200, {
        "Content-Length": size,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file}"`,
    });

    try {
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        logger.error("Error creating read stream", {metadata: {error}});
    }
});

app.listen(port, () => logger.info(`http://localhost:${port}/files/:file`));
