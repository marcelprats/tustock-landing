export const pricingData = {
  local: {
    title: "Pequeño Comercio",
    description: "Olvídate de servidores. Tu PC es el servidor y tu móvil el escáner.",
    plans: [
      {
        name: "Gratis",
        price: "0€",
        period: "/mes",
        description: "Para empezar hoy mismo.",
        features: ["1 Usuario", "100 Productos", "Subdominio Gratis"],
        cta: "Crear Cuenta",
        href: "/register",
        highlight: false
      },
      {
        name: "Pro",
        price: "29€",
        period: "/mes",
        description: "Sin límites.",
        features: ["Usuarios Ilimitados", "Productos Ilimitados", "IA Facturas Ilimitada"],
        cta: "Prueba 14 días gratis",
        href: "/register",
        highlight: true,
        badge: "POPULAR"
      }
    ]
  },
  enterprise: {
    title: "Gran Empresa",
    description: "Arquitectura Híbrida: Nodos Docker locales + Sincronización Nube.",
    plans: [
      {
        name: "Developer",
        price: "0€",
        period: "",
        description: "Sandbox para integración.",
        features: ["Sandbox API", "1 Nodo Local Docker"],
        cta: "Crear Token",
        href: "/register",
        highlight: false
      },
      {
        name: "Business",
        price: "99€",
        period: "/sede",
        description: "Para producción.",
        features: ["Nodos Docker Ilimitados", "Sync Multi-Sede", "SLA 99.9%"],
        cta: "Contactar",
        href: "mailto:sales@tustock.app",
        highlight: true
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "Logística masiva.",
        features: ["API Ilimitada", "Despliegue On-Premise Total", "Soporte 24/7"],
        cta: "Hablar",
        href: "mailto:partners@tustock.app",
        highlight: false
      }
    ]
  }
};
