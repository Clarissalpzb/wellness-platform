import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="bg-neutral-900 text-neutral-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-white font-semibold text-lg">Athletica</span>
            </div>
            <p className="text-sm">
              Plataforma inteligente para gestionar tu centro de bienestar.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Producto</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="hover:text-white transition-colors">Características</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition-colors">Precios</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Integraciones</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">Nosotros</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">Privacidad</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Términos</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-800 mt-12 pt-8 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} Athletica. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
