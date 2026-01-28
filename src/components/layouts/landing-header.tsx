"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-lg text-neutral-900">Wellness</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
              Características
            </Link>
            <Link href="#how-it-works" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
              Cómo funciona
            </Link>
            <Link href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
              Precios
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/registro">Comenzar Gratis</Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-neutral-100">
            <nav className="flex flex-col gap-3">
              <Link href="#features" className="text-sm text-neutral-600 px-2 py-1" onClick={() => setMobileOpen(false)}>
                Características
              </Link>
              <Link href="#how-it-works" className="text-sm text-neutral-600 px-2 py-1" onClick={() => setMobileOpen(false)}>
                Cómo funciona
              </Link>
              <Link href="#pricing" className="text-sm text-neutral-600 px-2 py-1" onClick={() => setMobileOpen(false)}>
                Precios
              </Link>
              <div className="flex flex-col gap-2 pt-3 border-t border-neutral-100">
                <Button variant="outline" asChild>
                  <Link href="/login">Iniciar Sesión</Link>
                </Button>
                <Button asChild>
                  <Link href="/registro">Comenzar Gratis</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
