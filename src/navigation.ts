import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

// src/navigation.js

// 1. MENÚ SUPERIOR (Páginas Reales)
export const headerData = {
  links: [
    { text: 'Inicio', href: '/' },
    { text: 'Precios', href: '/pricing' },
    { text: 'Nosotros', href: '/about' },
    { text: 'Contacto', href: '/contact' },
    // { text: 'Blog', href: getBlogPermalink() },
  ],
  actions: [
    { text: 'Acceder', href: '/login', type: 'ghost' },
    { text: 'Crear Tienda', href: '/register', type: 'primary' },
  ],
};

// 2. MENÚ LATERAL (Anclas de la Landing) -> NUEVO
export const landingSections = [
  { text: 'Inicio', target: 'hero' },
  { text: 'Características', target: 'features' },
  { text: 'Ventajas', target: 'benefits' }, // Steps
  { text: 'Testimonios', target: 'testimonials' },
  { text: 'Precios', target: 'pricing' },
  { text: 'FAQ', target: 'faq' },
];

export const footerData = {
  links: [
    {
      title: 'Producto',
      links: [
        { text: 'Características', href: '#features' },
        { text: 'Precios', href: '#pricing' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { text: 'Sobre nosotros', href: '#' },
        { text: 'Contacto', href: '/contact' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Términos', href: '/terms' },
    { text: 'Privacidad', href: '/privacy' },
  ],
  socialLinks: [
    { ariaLabel: 'X', icon: 'tabler:brand-x', href: '#' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/marcelprats/tustock-landing' },
  ],
  footNote: `© ${new Date().getFullYear()} · TuStock.App · Gestión de inventario simplificada.`,
};
