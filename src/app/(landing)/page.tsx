import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Calendar,
  BarChart3,
  Users,
  CreditCard,
  Megaphone,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Brain,
  TrendingUp,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Insights con IA",
    description:
      "Recibe recomendaciones inteligentes sobre horarios, retención de clientes y oportunidades de ingresos.",
    highlight: true,
  },
  {
    icon: Sparkles,
    title: "Consultas en Lenguaje Natural",
    description:
      "Pregunta cualquier cosa sobre tu negocio y obtén respuestas instantáneas con datos reales.",
    highlight: true,
  },
  {
    icon: Calendar,
    title: "Gestión de Clases",
    description:
      "Programa, modifica y gestiona todas tus clases con calendarios intuitivos y listas de espera automáticas.",
  },
  {
    icon: Users,
    title: "CRM Integrado",
    description:
      "Conoce a tus clientes: historial, preferencias, banderas de salud y patrones de asistencia.",
  },
  {
    icon: CreditCard,
    title: "Pagos con Stripe",
    description:
      "Vende paquetes y membresías online con procesamiento de pagos seguro y automatizado.",
  },
  {
    icon: Megaphone,
    title: "Campañas Marketing",
    description:
      "Envía campañas por email y WhatsApp segmentadas a tus clientes para maximizar retención.",
  },
  {
    icon: BarChart3,
    title: "Dashboards en Tiempo Real",
    description:
      "Visualiza métricas clave: ingresos, ocupación, retención y más, actualizadas al instante.",
  },
  {
    icon: Shield,
    title: "Multi-ubicación",
    description:
      "Gestiona múltiples sucursales desde una sola plataforma con datos consolidados.",
  },
];

const steps = [
  {
    number: "01",
    title: "Configura tu centro",
    description: "Agrega tus clases, horarios, coaches y paquetes en minutos.",
  },
  {
    number: "02",
    title: "Invita a tu equipo y clientes",
    description: "Tu equipo gestiona operaciones mientras tus clientes reservan desde la app.",
  },
  {
    number: "03",
    title: "Recibe insights inteligentes",
    description: "La IA analiza tus datos y te envía recomendaciones accionables diariamente.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Potenciado con Inteligencia Artificial
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 tracking-tight">
              Gestiona tu centro de bienestar con{" "}
              <span className="text-primary-500">inteligencia</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 max-w-2xl mx-auto">
              La plataforma todo-en-uno que combina gestión operativa con insights de IA
              para que tomes mejores decisiones y hagas crecer tu negocio.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/registro">
                  Comenzar Gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Ver Características</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-neutral-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary-500" />
                Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary-500" />
                14 días gratis
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary-500" />
                Soporte incluido
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900">
              Todo lo que necesitas para gestionar tu centro
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Desde la operación diaria hasta insights estratégicos con inteligencia artificial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`rounded-xl border p-6 transition-shadow hover:shadow-md ${
                  feature.highlight
                    ? "border-primary-200 bg-primary-50/50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${
                    feature.highlight
                      ? "bg-primary-500 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-neutral-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900">
              Comienza en 3 simples pasos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 text-primary-600 text-2xl font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="font-semibold text-neutral-900 text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing placeholder */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900">
              Planes simples y transparentes
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Elige el plan que mejor se adapte a tu centro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$999",
                period: "/mes",
                description: "Para centros pequeños",
                features: ["1 ubicación", "Hasta 100 clientes", "Gestión de clases", "Pagos online", "Soporte por email"],
              },
              {
                name: "Pro",
                price: "$2,499",
                period: "/mes",
                description: "Para centros en crecimiento",
                features: ["Hasta 3 ubicaciones", "Clientes ilimitados", "Insights con IA", "CRM y campañas", "Soporte prioritario"],
                popular: true,
              },
              {
                name: "Enterprise",
                price: "Contacto",
                period: "",
                description: "Para cadenas y franquicias",
                features: ["Ubicaciones ilimitadas", "API personalizada", "IA avanzada", "Manager dedicado", "SLA garantizado"],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-8 ${
                  plan.popular
                    ? "border-primary-500 ring-1 ring-primary-500 relative"
                    : "border-neutral-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Más popular
                  </div>
                )}
                <h3 className="font-semibold text-lg text-neutral-900">{plan.name}</h3>
                <p className="text-sm text-neutral-500 mt-1">{plan.description}</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-neutral-900">{plan.price}</span>
                  <span className="text-neutral-500">{plan.period}</span>
                </div>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href="/registro">Comenzar</Link>
                </Button>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckCircle2 className="h-4 w-4 text-primary-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Transforma la gestión de tu centro hoy
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Únete a los centros de bienestar que ya usan inteligencia artificial
            para tomar mejores decisiones.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/registro">
              Comenzar Gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
