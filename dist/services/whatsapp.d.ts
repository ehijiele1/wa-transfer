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
    private handleTriggerMessage;
    private processMessage;
    private getMessageType;
    private extractMessageContent;
    private extractMetadata;
    onMessage(callback: (message: WhatsAppMessage) => void): void;
    disconnect(): Promise<void>;
    getGroups(): Promise<Array<{
        name: string;
        id: string;
    }>>;
    isReady(): boolean;
}
export declare const whatsappService: WhatsAppService;
export default WhatsAppService;
//# sourceMappingURL=whatsapp.d.ts.map