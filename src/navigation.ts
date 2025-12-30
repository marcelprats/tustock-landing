import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

// 1. MENÚ SUPERIOR (Navegación entre páginas globales)
export const headerData = {
  links: [
    { text: 'Producto', href: '#features' }, // Ancla suave
    { text: 'Precios', href: '/pricing' },   // Página real
    { text: 'Sobre Nosotros', href: '/about' },
    { text: 'Contacto', href: '/contact' },
  ],
  // Los botones de acción (Login/Register) los gestionaremos dinámicamente en el Header.astro
  actions: [], 
};

// 2. MENÚ LATERAL FLOTANTE (Secciones de la Landing)
export const landingSections = [
  { text: 'Inicio', target: 'hero' },
  { text: 'Funcionalidades', target: 'features' },
  { text: 'IA Core', target: 'ai-core' },
  { text: 'Pasos', target: 'steps' },
  { text: 'Precios', target: 'pricing' },
  { text: 'FAQ', target: 'faq' },
];

export const footerData = {
  links: [
    {
      title: 'Producto',
      links: [
        { text: 'Características', href: '#' },
        { text: 'Seguridad', href: '#' },
        { text: 'Enterprise', href: '#' },
      ],
    },
    {
      title: 'Recursos',
      links: [
        { text: 'Documentación', href: '#' },
        { text: 'API', href: '#' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Términos', href: getPermalink('/terms') },
    { text: 'Privacidad', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'X', icon: 'tabler:brand-x', href: '#' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
  ],
  footNote: `
    Hecho con ❤️ en Barcelona · Todos los derechos reservados TuStock © 2024.
  `,
};