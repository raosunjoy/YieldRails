"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceService = void 0;
const logger_1 = require("../utils/logger");
class ComplianceService {
    async checkMerchant(address) {
        logger_1.logger.info(`Checking merchant compliance: ${address}`);
    }
    async checkAddress(address) {
        logger_1.logger.info(`Checking address compliance: ${address}`);
    }
}
exports.ComplianceService = ComplianceService;
//# sourceMappingURL=ComplianceService.js.map