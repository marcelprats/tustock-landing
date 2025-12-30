/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite/client" />
/// <reference types="../vendor/integration/types.d.ts" />

declare namespace App {
  interface Locals {
    currentShop?: {
      name: string;
      email: string;
      plan: string;
      url: string;
      slug: string;    // <--- IMPORTANTE
      isStore: boolean; // <--- IMPORTANTE
    } | null;
    
    runtime: {
        env: {
            DB: D1Database; // <--- Base de datos D1
            TURSO_DB_URL: string;
            TURSO_AUTH_TOKEN: string;
            MASTER_KEY: string;
            TELEGRAM_TOKEN?: string;
            TELEGRAM_CHAT_ID?: string;
        };
        ctx: ExecutionContext;
    }
  }
}