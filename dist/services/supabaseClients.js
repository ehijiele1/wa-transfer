"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseClient = exports.Admin = void 0;
exports.getAnonClient = getAnonClient;
exports.getAdminClient = getAdminClient;
exports.adminOnly = adminOnly;
const config_1 = __importDefault(require("../config"));
const supabase_js_1 = require("@supabase/supabase-js");
Object.defineProperty(exports, "SupabaseClient", { enumerable: true, get: function () { return supabase_js_1.SupabaseClient; } });
exports.Admin = Symbol('Admin');
function getAnonClient() {
    return (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.key, {
        auth: {
            persistSession: false,
        },
    });
}
function getAdminClient() {
    return (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.serviceRoleKey, {
        auth: {
            persistSession: false,
        },
    });
}
function adminOnly(fn, operationName) {
    return fn();
}
//# sourceMappingURL=supabaseClients.js.map