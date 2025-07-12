"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const logger_1 = require("../utils/logger");
class NotificationService {
    async sendPaymentCreated(payment, customerEmail) {
        logger_1.logger.info(`Sending payment created notification: ${payment.id}`);
    }
    async sendPaymentStatusUpdate(payment) {
        logger_1.logger.info(`Sending payment status update: ${payment.id} -> ${payment.status}`);
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map