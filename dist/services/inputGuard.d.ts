import { WhatsAppMessage } from '../types';
export declare class InputGuard {
    private readonly MAX_TEXT_LENGTH;
    private readonly MAX_MEDIA_SIZE;
    private readonly CONTROL_CHARS_REGEX;
    private readonly MIN_VALID_CHARS;
    validateMessage(message: WhatsAppMessage): void;
    private extractTextContent;
    quarantine(reason: string, message: WhatsAppMessage): Promise<void>;
}
export declare function getInputGuard(): InputGuard;
//# sourceMappingURL=inputGuard.d.ts.map