export const pricingData = {
  local: {
    title: "Pequeño Comercio",
    description: "Tu ordenador es el servidor. Sin costes de nube.",
    plans: [
      {
        name: "Gratis",
        price: "0€",
        period: "/mes",
        description: "Para validar tu idea o micro-negocios.",
        features: ["1 Usuario", "100 Productos", "Subdominio Gratis", "Soporte Comunitario"],
        cta: "Crear Cuenta",
        href: "/register",
        highlight: false
      },
      {
        name: "Pro",
        price: "29€",
        period: "/mes",
        description: "Gestión completa sin límites.",
        features: ["Usuarios Ilimitados", "Productos Ilimitados", "IA Facturas Ilimitada", "Alertas Stock Bajo"],
        cta: "Prueba 14 días gratis",
        href: "/register",
        highlight: true,
        badge: "POPULAR"
      }
    ]
  },
  enterprise: {
    title: "Gran Empresa",
    description: "Arquitectura Híbrida Distribuida (Docker + Nube).",
    plans: [
      {
        name: "Developer",
        price: "0€",
        period: "",
        description: "Entorno Sandbox para IT.",
        features: ["Sandbox API", "1 Nodo Local Docker", "Documentación Técnica"],
        cta: "Crear Token",
        href: "/register",
        highlight: false
      },
      {
        name: "Business",
        price: "99€",
        period: "/sede",
        description: "Para naves logísticas activas.",
        features: ["Nodos Docker Ilimitados", "Sync Multi-Sede", "SLA 99.9%", "Soporte Prioritario"],
        cta: "Contactar",
        href: "mailto:sales@tustock.app",
        highlight: true
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "Logística masiva global.",
        features: ["API Ilimitada", "Despliegue 100% On-Premise", "Ingeniero Dedicado", "SSO / SAML"],
        cta: "Hablar",
        href: "mailto:partners@tustock.app",
        highlight: false
      }
    ]
  }
};
