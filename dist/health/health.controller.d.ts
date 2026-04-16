import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        database: "connected" | "disconnected";
        redis: "connected" | "disconnected";
        version: string;
    }>;
}
