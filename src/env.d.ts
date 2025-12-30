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
      slug: string;
      isStore: boolean;
      web_plan: string; // <--- ¡AQUÍ ESTÁ LA CLAVE!
    } | null;
    
    runtime: {
        env: {
            DB: D1Database;
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