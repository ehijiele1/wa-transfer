import { WhatsAppMessage } from '../types';
export declare class WhatsAppService {
    private socket;
    private supabase;
    private messageCallbacks;
    private reconnectAttempts;
    private maxReconnectAttempts;
    constructor();
    connect(): Promise<void>;
    private loadAuthState;
    private setupEventHandlers;
    private processMessage;
    private getMessageType;
    private extractMessageContent;
    private extractMetadata;
    private monitorGroups;
    private saveAuthState;
    onMessage(callback: (message: WhatsAppMessage) => void): void;
    disconnect(): Promise<void>;
}
export default WhatsAppService;
//# sourceMappingURL=whatsapp.d.ts.map