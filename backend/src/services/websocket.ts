import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

/**
 * WebSocket server for real-time updates
 */
class WebSocketService {
    private io: SocketIOServer | null = null;

    public init(server: HttpServer): void {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: "*", // Configure properly for production
                methods: ["GET", "POST"]
            }
        });

        this.setupEventHandlers();
        logger.info('WebSocket server initialized');
    }

    private setupEventHandlers(): void {
        if (!this.io) return;

        this.io.on('connection', (socket) => {
            logger.debug(`Client connected: ${socket.id}`);

            socket.on('join_payment', (paymentId: string) => {
                socket.join(`payment:${paymentId}`);
                logger.debug(`Client ${socket.id} joined payment room: ${paymentId}`);
            });

            socket.on('disconnect', () => {
                logger.debug(`Client disconnected: ${socket.id}`);
            });
        });
    }

    public broadcastPaymentUpdate(paymentId: string, data: any): void {
        if (this.io) {
            this.io.to(`payment:${paymentId}`).emit('payment_update', data);
        }
    }

    // TODO: Add more real-time event methods
}

export const websocketServer = new WebSocketService();