/// <reference types="node" />
import { Server as HttpServer } from 'http';
declare class WebSocketService {
    private wss;
    private connectedClients;
    init(server: HttpServer): void;
    private setupEventHandlers;
    private generateClientId;
    private handleMessage;
    broadcastPaymentUpdate(paymentId: string, data: any): void;
    broadcastYieldUpdate(userId: string, data: any): void;
    private broadcast;
    getConnectedClientsCount(): number;
}
export declare const websocketServer: WebSocketService;
export {};
//# sourceMappingURL=websocket.d.ts.map