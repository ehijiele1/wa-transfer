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
    publish: {
        description: string;
        usage: string;
        execute: (platform: string) => Promise<void>;
    };
    schedule: {
        description: string;
        usage: string;
        execute: (platform: string, date: string) => Promise<void>;
    };
    analytics: {
        description: string;
        usage: string;
        execute: (platform: string) => Promise<void>;
    };
    dashboard: {
        description: string;
        usage: string;
        execute: () => Promise<void>;
    };
    queue: {
        description: string;
        usage: string;
        execute: (action: string, platform: string) => Promise<void>;
    };
    'ab-test': {
        description: string;
        usage: string;
        execute: (action: string, testId: string) => Promise<void>;
    };
    'cross-platform': {
        description: string;
        usage: string;
        execute: (platforms: string) => Promise<void>;
    };
};
declare const args: string[];
declare const command: string | undefined;
//# sourceMappingURL=social-media-cli.d.ts.map