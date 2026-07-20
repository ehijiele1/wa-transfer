#!/usr/bin/env node
declare const WhatsAppMonitoringApp: any;
declare const config: any;
declare const app: any;
declare const commands: {
    help: {
        description: string;
        usage: string;
        execute: () => void;
    };
    generate: {
        description: string;
        usage: string;
        execute: (propertyId: any) => Promise<void>;
    };
    publish: {
        description: string;
        usage: string;
        execute: (carouselId: any) => Promise<void>;
    };
    analytics: {
        description: string;
        usage: string;
        execute: () => Promise<void>;
    };
    'batch-publish': {
        description: string;
        usage: string;
        execute: () => Promise<void>;
    };
    list: {
        description: string;
        usage: string;
        execute: () => Promise<void>;
    };
    schedule: {
        description: string;
        usage: string;
        execute: (carouselId: any, date: any) => Promise<void>;
    };
};
declare const args: string[];
declare const command: string | undefined;
//# sourceMappingURL=instagram-cli.d.ts.map