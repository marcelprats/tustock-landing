import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import cloudflare from '@astrojs/cloudflare'; // Asegúrate de tener esto

import { readingTimeRemarkPlugin } from './src/utils/frontmatter.ts';

export default defineConfig({
  // 🔥 ESTO ES LA CLAVE: Activamos modo servidor para que funcionen login y DB
  output: 'server',
  
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),

  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
    icon({
      include: {
        tabler: ['*'],
        'flat-color-icons': [
          'template',
          'gallery',
          'approval',
          'document',
          'advertising',
          'currency-exchange',
          'voice-presentation',
          'business-contact',
          'database',
        ],
      },
    }),
  ],

  markdown: {
    remarkPlugins: [readingTimeRemarkPlugin],
  },

  vite: {
    resolve: {
      alias: {
        '~': '/src',
      },
    },
  },
});