import { Status, StatusInfo, StatusRepo, UUID } from "../types/types";

export class StatusService {
    constructor(private statusRepo: StatusRepo<StatusInfo>) {}

    async getStatus(id: UUID): Promise<StatusInfo | null> {
        const statusInfo = await this.statusRepo.getStatus(id);
        return statusInfo ? statusInfo : null;
    }

    async updateStatus(id: UUID, status: Status, percentage?: number): Promise<void> {
        const statusInfo: StatusInfo = { id, status };
        if (percentage) {
            statusInfo.percentage = percentage;
        }
        if (status === Status.Aborted) {
            statusInfo.eta = new Date();
        }
        await this.statusRepo.updateStatus(statusInfo);
    }
}
