import { getPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    { text: 'Producto', href: '/#features' },
    { text: 'Precios', href: '/#pricing' },
  ],
  actions: [
    { 
      text: 'Entrar', 
      href: '/login', 
      variant: 'tertiary', 
      attrs: { 'data-astro-reload': true } 
    },
    { 
      text: 'Empezar Gratis', 
      href: '/signup', 
      variant: 'primary', 
      attrs: { 'data-astro-reload': true } 
    },
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