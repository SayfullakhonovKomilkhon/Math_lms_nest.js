"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const prisma_service_1 = require("../prisma/prisma.service");
let HealthService = class HealthService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.redis = new ioredis_1.default({
            host: this.configService.get('REDIS_HOST') || 'localhost',
            port: parseInt(this.configService.get('REDIS_PORT') || '6379', 10),
            password: this.configService.get('REDIS_PASSWORD') || undefined,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
        });
    }
    async getStatus() {
        let database = 'disconnected';
        let redis = 'disconnected';
        try {
            await this.prisma.$queryRawUnsafe('SELECT 1');
            database = 'connected';
        }
        catch {
            database = 'disconnected';
        }
        try {
            if (this.redis.status === 'wait') {
                await this.redis.connect();
            }
            await this.redis.ping();
            redis = 'connected';
        }
        catch {
            redis = 'disconnected';
        }
        return {
            status: database === 'connected' && redis === 'connected' ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            database,
            redis,
            version: '1.0.0',
        };
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], HealthService);
//# sourceMappingURL=health.service.js.map