import { Server as HttpServer } from 'http';
import WebSocket from 'ws';
import { logger } from '../utils/logger';

/**
 * WebSocket server for real-time updates using native WebSocket
 */
class WebSocketService {
    private wss: WebSocket.Server | null = null;
    private connectedClients = new Map<string, WebSocket>();

    public init(server: HttpServer): void {
        this.wss = new WebSocket.Server({ 
            server,
            path: '/ws'
        });

        this.setupEventHandlers();
        logger.info('WebSocket server initialized');
    }

    private setupEventHandlers(): void {
        if (!this.wss) return;

        this.wss.on('connection', (ws: WebSocket) => {
            const clientId = this.generateClientId();
            this.connectedClients.set(clientId, ws);
            
            logger.debug(`Client connected: ${clientId}`);

            ws.on('message', (message: string) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleMessage(clientId, data);
                } catch (error) {
                    logger.error('Invalid WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                logger.debug(`Client disconnected: ${clientId}`);
                this.connectedClients.delete(clientId);
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
                this.connectedClients.delete(clientId);
            });
        });
    }

    private generateClientId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    private handleMessage(clientId: string, data: any): void {
        // Handle different message types
        switch (data.type) {
            case 'join_payment':
                // Join payment room logic would go here
                logger.debug(`Client ${clientId} joined payment room: ${data.paymentId}`);
                break;
            default:
                logger.debug(`Unhandled message type: ${data.type}`);
        }
    }

    public broadcastPaymentUpdate(paymentId: string, data: any): void {
        const message = JSON.stringify({
            type: 'payment_update',
            paymentId,
            data,
            timestamp: new Date().toISOString()
        });

        this.broadcast(message);
    }

    public broadcastYieldUpdate(userId: string, data: any): void {
        const message = JSON.stringify({
            type: 'yield_update',
            userId,
            data,
            timestamp: new Date().toISOString()
        });

        this.broadcast(message);
    }

    private broadcast(message: string): void {
        this.connectedClients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        });
    }

    public getConnectedClientsCount(): number {
        return this.connectedClients.size;
    }
}

export const websocketServer = new WebSocketService();