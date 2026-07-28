import { WhatsAppMessage } from '../types';
export declare class WhatsAppService {
    private client;
    private messageCallbacks;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private retryDelayMs;
    private readyTime;
    private tableMissingLogged;
    constructor();
    connect(): Promise<void>;
    private setupEventHandlers;
    private processMessage;
    private getMessageType;
    private extractMessageContent;
    private extractMetadata;
    onMessage(callback: (message: WhatsAppMessage) => void): void;
    disconnect(): Promise<void>;
}
export default WhatsAppService;
//# sourceMappingURL=whatsapp.d.ts.map