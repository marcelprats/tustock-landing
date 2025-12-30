/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite/client" />
/// <reference types="../vendor/integration/types.d.ts" />

// AÑADE ESTO AL FINAL:
declare namespace App {
  interface Locals {
    currentShop?: {
      name: string;
      email: string;
      plan: string;
      url: string;
    } | null;
    
    // Necesario para Cloudflare Runtime
    runtime?: {
        env: {
            TURSO_DB_URL: string;
            TURSO_AUTH_TOKEN: string;
            MASTER_KEY: string;
        }
    }
  }
}