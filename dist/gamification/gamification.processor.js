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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GamificationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_2 = require("@nestjs/bullmq");
const bullmq_3 = require("bullmq");
const gamification_service_1 = require("./gamification.service");
let GamificationProcessor = GamificationProcessor_1 = class GamificationProcessor extends bullmq_1.WorkerHost {
    constructor(gamificationService, gamificationQueue) {
        super();
        this.gamificationService = gamificationService;
        this.gamificationQueue = gamificationQueue;
        this.logger = new common_1.Logger(GamificationProcessor_1.name);
    }
    async scheduledMonthlyCalculation() {
        const now = new Date();
        let month = now.getMonth();
        let year = now.getFullYear();
        if (month === 0) {
            month = 12;
            year -= 1;
        }
        this.logger.log(`Scheduling monthly achievements for ${month}/${year}`);
        await this.gamificationQueue.add('calculate-monthly', { month, year });
    }
    async process(job) {
        if (job.name === 'calculate-monthly') {
            const { month, year } = job.data;
            this.logger.log(`Calculating monthly achievements for ${month}/${year}`);
            try {
                const result = await this.gamificationService.calculateMonthlyAchievements(month, year);
                this.logger.log(`Awarded ${result.awarded} achievements`);
                return result;
            }
            catch (err) {
                console.error(`[GamificationProcessor] Error processing job ${job.id}:`, err);
                throw err;
            }
        }
    }
};
exports.GamificationProcessor = GamificationProcessor;
__decorate([
    (0, schedule_1.Cron)('0 6 1 * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GamificationProcessor.prototype, "scheduledMonthlyCalculation", null);
exports.GamificationProcessor = GamificationProcessor = GamificationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('gamification'),
    __param(1, (0, bullmq_2.InjectQueue)('gamification')),
    __metadata("design:paramtypes", [gamification_service_1.GamificationService,
        bullmq_3.Queue])
], GamificationProcessor);
//# sourceMappingURL=gamification.processor.js.map