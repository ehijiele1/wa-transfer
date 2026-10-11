import { WhatsAppMessage } from '../types';
export declare class WhatsAppService {
    private client;
    private messageCallbacks;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private retryDelayMs;
    private readyTime;
    private tableMissingLogged;
    private authenticated;
    private pairingTimer;
    private lastCodeAt;
    private pairingNumber;
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
    isAuthenticated(): boolean;
    getPairingStatus(): {
        authenticated: boolean;
        ready: boolean;
        pairingNumberSet: boolean;
        lastCodeAt: number;
        lastCodeAgeSec: number | null;
    };
    private fetchAndStorePairingCode;
    requestPairingCodeNow(): Promise<{
        code: string | null;
        authenticated: boolean;
        ready: boolean;
    }>;
}
export declare const whatsappService: WhatsAppService;
export default WhatsAppService;
//# sourceMappingURL=whatsapp.d.ts.map