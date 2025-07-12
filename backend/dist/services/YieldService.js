"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YieldService = void 0;
const logger_1 = require("../utils/logger");
class YieldService {
    async startYieldGeneration(paymentId, params) {
        logger_1.logger.info(`Starting yield generation for payment: ${paymentId}`);
    }
    async calculateFinalYield(paymentId) {
        logger_1.logger.info(`Calculating final yield for payment: ${paymentId}`);
        return '0';
    }
}
exports.YieldService = YieldService;
//# sourceMappingURL=YieldService.js.map