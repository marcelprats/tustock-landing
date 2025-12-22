import { getPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Producto',
      href: getPermalink('/#features'),
    },
    {
      text: 'Precios',
      href: getPermalink('/#pricing'),
    },
  ],
  actions: [
    { 
      text: 'Entrar', 
      href: getPermalink('/login'), 
      variant: 'tertiary' 
    },
    { 
      text: 'Empezar Gratis', 
      href: getPermalink('/signup'), 
      variant: 'primary' 
    },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Producto',
      links: [
        { text: 'Características', href: '#' },
        { text: 'Precios', href: getPermalink('/#pricing') },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { text: 'Sobre nosotros', href: '#' },
        { text: 'Contacto', href: getPermalink('/contact') },
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
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/tu-usuario/tustock' },
  ],
  footNote: `
    © ${new Date().getFullYear()} · TuStock.App · Gestión de inventario simplificada.
  `,
};