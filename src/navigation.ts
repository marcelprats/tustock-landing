import { getPermalink } from './utils/permalinks';

// src/navigation.js

export const headerData = {
  links: [
    { text: 'Inicio', href: '/' },
    { text: 'Características', href: '/#features' }, // El ancla que añadiremos abajo
    { text: 'Precios', href: '/#pricing' },          // El ancla de precios
    { text: 'Contacto', href: 'mailto:hola@tustock.app' },
  ],
};

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
