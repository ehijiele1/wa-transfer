"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthChecker = void 0;
class HealthChecker {
    startTime;
    constructor() {
        this.startTime = Date.now();
    }
    async checkHealth() {
        const dependencies = {
            whatsapp: await this.checkWhatsApp(),
            supabase: await this.checkSupabase(),
            ollama: await this.checkOllama(),
            redis: await this.checkRedis(),
        };
        const allUp = Object.values(dependencies).every(dep => dep.status === 'up');
        const anyDown = Object.values(dependencies).some(dep => dep.status === 'down');
        return {
            status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            dependencies,
        };
    }
    async checkWhatsApp() {
        try {
            return {
                status: 'up',
                lastChecked: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                status: 'down',
                lastChecked: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkSupabase() {
        const start = Date.now();
        try {
            const SupabaseService = (await Promise.resolve().then(() => __importStar(require('../services/supabase')))).default;
            const supabaseService = new SupabaseService();
            await supabaseService.getRecentMessages(1);
            return {
                status: 'up',
                latency: Date.now() - start,
                lastChecked: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                status: 'down',
                lastChecked: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkOllama() {
        const start = Date.now();
        try {
            const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
            const response = await fetch(`${baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return {
                status: 'up',
                latency: Date.now() - start,
                lastChecked: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                status: 'down',
                lastChecked: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    async checkRedis() {
        const start = Date.now();
        try {
            const { queueManager } = await Promise.resolve().then(() => __importStar(require('../queues/queueManager')));
            await queueManager.getQueueStats('health-check');
            return {
                status: 'up',
                latency: Date.now() - start,
                lastChecked: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                status: 'down',
                lastChecked: new Date().toISOString(),
                error: error.message,
            };
        }
    }
    getUptime() {
        return Date.now() - this.startTime;
    }
}
exports.healthChecker = new HealthChecker();
//# sourceMappingURL=health.js.map