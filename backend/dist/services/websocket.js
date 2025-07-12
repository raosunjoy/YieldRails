"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketServer = void 0;
const ws_1 = __importDefault(require("ws"));
const logger_1 = require("../utils/logger");
class WebSocketService {
    constructor() {
        this.wss = null;
        this.connectedClients = new Map();
    }
    init(server) {
        this.wss = new ws_1.default.Server({
            server,
            path: '/ws'
        });
        this.setupEventHandlers();
        logger_1.logger.info('WebSocket server initialized');
    }
    setupEventHandlers() {
        if (!this.wss)
            return;
        this.wss.on('connection', (ws) => {
            const clientId = this.generateClientId();
            this.connectedClients.set(clientId, ws);
            logger_1.logger.debug(`Client connected: ${clientId}`);
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleMessage(clientId, data);
                }
                catch (error) {
                    logger_1.logger.error('Invalid WebSocket message:', error);
                }
            });
            ws.on('close', () => {
                logger_1.logger.debug(`Client disconnected: ${clientId}`);
                this.connectedClients.delete(clientId);
            });
            ws.on('error', (error) => {
                logger_1.logger.error('WebSocket error:', error);
                this.connectedClients.delete(clientId);
            });
        });
    }
    generateClientId() {
        return Math.random().toString(36).substr(2, 9);
    }
    handleMessage(clientId, data) {
        switch (data.type) {
            case 'join_payment':
                logger_1.logger.debug(`Client ${clientId} joined payment room: ${data.paymentId}`);
                break;
            default:
                logger_1.logger.debug(`Unhandled message type: ${data.type}`);
        }
    }
    broadcastPaymentUpdate(paymentId, data) {
        const message = JSON.stringify({
            type: 'payment_update',
            paymentId,
            data,
            timestamp: new Date().toISOString()
        });
        this.broadcast(message);
    }
    broadcastYieldUpdate(userId, data) {
        const message = JSON.stringify({
            type: 'yield_update',
            userId,
            data,
            timestamp: new Date().toISOString()
        });
        this.broadcast(message);
    }
    broadcast(message) {
        this.connectedClients.forEach((ws) => {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.send(message);
            }
        });
    }
    getConnectedClientsCount() {
        return this.connectedClients.size;
    }
}
exports.websocketServer = new WebSocketService();
//# sourceMappingURL=websocket.js.map