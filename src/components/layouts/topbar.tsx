"use client";

import { Bell, Menu, Lightbulb, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/stores/ui-store";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Topbar() {
  const { toggleSidebar, toggleInsightPanel } = useUIStore();
  const { data: session } = useSession();

  const userName = session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden sm:flex items-center gap-2 bg-neutral-100 rounded-lg px-3 py-2 w-64">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent text-sm outline-none w-full placeholder:text-neutral-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleInsightPanel}
          className="relative"
        >
          <Lightbulb className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image || ""} alt={userName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-neutral-500">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Mi Perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Configuración</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-accent-rose"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
