"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

type RecoverInput = z.infer<typeof schema>;

export default function RecoverPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoverInput>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: RecoverInput) {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Error al enviar el correo. Intenta de nuevo.");
        return;
      }
      setSent(true);
    } catch {
      setServerError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Revisa tu email</h2>
          <p className="text-sm text-neutral-500 mb-6">
            Si existe una cuenta con ese email, recibirás instrucciones para restablecer tu contraseña.
          </p>
          <Button variant="outline" asChild>
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al login
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
        <CardDescription>Te enviaremos un enlace para restablecer tu contraseña</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="tu@email.com" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-accent-rose">{errors.email.message}</p>
            )}
          </div>
          {serverError && (
            <p className="text-sm text-accent-rose bg-accent-rose-light px-3 py-2 rounded-lg">{serverError}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Instrucciones
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Volver al login
        </Link>
      </CardFooter>
    </Card>
  );
}
