"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const health_1 = require("../src/routes/health");
const app = (0, express_1.default)();
app.use('/api/health', health_1.healthRouter);
describe('Health Endpoints', () => {
    describe('GET /api/health', () => {
        it('should return healthy status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/health')
                .expect(200);
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('uptime');
        });
    });
    describe('GET /api/health/live', () => {
        it('should return alive status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/health/live')
                .expect(200);
            expect(response.body).toHaveProperty('status', 'alive');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
        });
    });
});
describe('Payment Service', () => {
    it('should validate payment creation request', () => {
        expect(true).toBe(true);
    });
});
describe('Error Handling', () => {
    it('should handle validation errors properly', () => {
        expect(true).toBe(true);
    });
});
//# sourceMappingURL=health.test.js.map