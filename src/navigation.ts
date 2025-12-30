import { getPermalink } from './utils/permalinks';

// 1. MENÚ CORPORATIVO (TuStock.app principal)
export const headerData = {
  links: [
    { text: 'Producto', href: '/product' },
    { text: 'Precios', href: '/pricing' },
    { text: 'Descargar', href: '/download' },
    { text: 'Sobre Nosotros', href: '/about' },
    { text: 'Contacto', href: '/contact' },
  ],
  actions: [], 
};

// 2. MENÚ DE LAS TIENDAS (frutpaco.tustock.app)
// Esta es la WHITELIST: Solo estas rutas funcionan en un subdominio
export const shopNavigation = {
  links: [
    { text: 'Catálogo', href: '/#catalogo' },
    { text: 'Ubicación', href: '/#ubicacion' },
  ],
  // Whitelist de rutas permitidas para el Middleware
  allowedPaths: [
    '/', 
    '/admin', 
    '/settings', 
    '/login', 
    '/api/login', 
    '/api/logout'
  ],
  actions: [
    { text: 'Acceso Dueño', href: '/admin', type: 'ghost', icon: 'tabler:lock' },
  ],
};

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
  footNote: `Hecho con ❤️ en Barcelona · TuStock © 2025.`,
};