import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    { text: 'Producto', href: '#features' },
    { text: 'Cómo funciona', href: '#steps' },
    { text: 'Precios', href: '#pricing' },
    { text: 'FAQ', href: '#faq' },
  ],
  actions: [
    { text: 'Acceder', href: '/login', type: 'ghost' },
    { text: 'Crear Tienda', href: '/register', type: 'primary' },
  ],
};

// Menú lateral flotante
export const landingSections = [
  { text: 'Inicio', target: 'hero' },
  { text: 'Características', target: 'features' },
  { text: 'Beneficios', target: 'content' },
  { text: 'Pasos', target: 'steps' },
  { text: 'Testimonios', target: 'testimonials' },
  { text: 'Precios', target: 'pricing' },
  { text: 'Preguntas', target: 'faq' },
];

export const footerData = {
  links: [
    {
      title: 'Producto',
      links: [
        { text: 'Características', href: '#' },
        { text: 'Seguridad', href: '#' },
        { text: 'Team', href: '#' },
        { text: 'Enterprise', href: '#' },
      ],
    },
    {
      title: 'Soporte',
      links: [
        { text: 'Documentación', href: '#' },
        { text: 'Comunidad', href: '#' },
        { text: 'Recursos', href: '#' },
      ],
    },
    {
      title: 'Compañía',
      links: [
        { text: 'Sobre nosotros', href: '#' },
        { text: 'Blog', href: '#' },
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
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: '#' },
  ],
  footNote: `
    <span class="w-5 h-5 md:w-6 md:h-6 md:-mt-0.5 bg-cover mr-1.5 rtl:mr-0 rtl:ml-1.5 float-left rtl:float-right rounded-sm bg-[url(https://onwidget.com/favicon/favicon-32x32.png)]"></span>
    Hecho con ❤️ por <a class="text-blue-600 hover:underline dark:text-gray-200" href="https://tustock.app/"> TuStock</a> · Todos los derechos reservados.
  `,
};