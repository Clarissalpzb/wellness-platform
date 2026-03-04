"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";

const schema = z
  .object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type InviteInput = z.infer<typeof schema>;

function InvitacionForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteInput>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-accent-rose mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Enlace inválido</h2>
          <p className="text-sm text-neutral-500 mb-6">
            Este enlace de invitación no es válido. Solicita una nueva invitación a tu administrador.
          </p>
          <Button variant="outline" asChild>
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ir al Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Contraseña creada</h2>
          <p className="text-sm text-neutral-500 mb-6">
            Tu contraseña ha sido configurada exitosamente. Ya puedes iniciar sesión.
          </p>
          <Button asChild>
            <Link href="/login">Ir al Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(data: InviteInput) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Error al crear la contraseña");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crear Contraseña</CardTitle>
        <CardDescription>Configura tu contraseña para acceder a la plataforma</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" placeholder="Mínimo 6 caracteres" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-accent-rose">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input id="confirmPassword" type="password" placeholder="Repite tu contraseña" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p className="text-sm text-accent-rose">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function InvitacionPage() {
  return (
    <Suspense>
      <InvitacionForm />
    </Suspense>
  );
}
