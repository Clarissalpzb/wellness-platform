"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clientRegisterSchema, type ClientRegisterInput } from "@/lib/validations";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function JoinForm({ orgName, slug }: { orgName: string; slug: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientRegisterInput>({
    resolver: zodResolver(clientRegisterSchema),
    defaultValues: { slug },
  });

  async function onSubmit(data: ClientRegisterInput) {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Register the client
      const regRes = await fetch("/api/auth/register-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!regRes.ok) {
        const body = await regRes.json();
        setError(body.error || "Error al registrar");
        return;
      }

      // 2. Sign in with credentials
      const signInRes = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      if (!signInRes.ok) {
        setError("Cuenta creada, pero hubo un error al iniciar sesión. Intenta iniciar sesión manualmente.");
        return;
      }

      // 3. Redirect to client app
      window.location.href = "/app/reservar";
    } catch {
      setError("Error al crear la cuenta");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Únete a {orgName}</CardTitle>
        <CardDescription>
          Crea tu cuenta para reservar clases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-accent-rose-light text-accent-rose text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <input type="hidden" {...register("slug")} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                placeholder="María"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-sm text-accent-rose">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                placeholder="García"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-sm text-accent-rose">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-accent-rose">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+52 55 1234 5678"
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Fecha de nacimiento (opcional)</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register("dateOfBirth")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-accent-rose">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Cuenta
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-neutral-500">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-primary-600 hover:underline font-medium"
          >
            Iniciar Sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
