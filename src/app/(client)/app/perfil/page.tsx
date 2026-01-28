"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera, Package, Calendar, Save } from "lucide-react";

const healthFlags = [
  { id: "pregnancy", label: "Embarazo", active: false },
  { id: "back_injury", label: "Lesión de espalda", active: true },
  { id: "knee_injury", label: "Lesión de rodilla", active: false },
  { id: "heart_condition", label: "Condición cardíaca", active: false },
  { id: "high_blood_pressure", label: "Presión alta", active: false },
  { id: "asthma", label: "Asma", active: false },
];

export default function PerfilPage() {
  const [flags, setFlags] = useState(healthFlags);

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Mi Perfil</h1>
        <p className="text-sm text-neutral-500">Administra tu información personal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xl">CL</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Cambiar foto
                </Button>
              </div>

              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input id="firstName" defaultValue="Clarissa" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input id="lastName" defaultValue="López" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="clarissa@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" type="tel" defaultValue="+52 55 1234 5678" />
                </div>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Banderas de Salud</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500 mb-4">
                Estas banderas son visibles para tus coaches para garantizar tu seguridad durante las clases.
              </p>
              <div className="space-y-3">
                {flags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between py-2">
                    <Label htmlFor={flag.id} className="cursor-pointer">{flag.label}</Label>
                    <Switch
                      id={flag.id}
                      checked={flag.active}
                      onCheckedChange={() => toggleFlag(flag.id)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mi Paquete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Membresía Mensual</p>
                  <p className="text-xs text-neutral-500">Vence: 15 Feb 2026</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Clases usadas</span>
                  <span className="font-medium">12 de Ilimitadas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Días restantes</span>
                  <span className="font-medium">18 días</span>
                </div>
              </div>
              <Separator className="my-4" />
              <Button variant="outline" className="w-full">Renovar Paquete</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Clases este mes</span>
                  <span className="font-bold text-lg">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Racha actual</span>
                  <span className="font-bold text-lg">5 días</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Clase favorita</span>
                  <Badge variant="success">Yoga Flow</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Miembro desde</span>
                  <span className="font-medium">Oct 2025</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif-email" className="text-sm cursor-pointer">Email</Label>
                  <Switch id="notif-email" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif-push" className="text-sm cursor-pointer">Push</Label>
                  <Switch id="notif-push" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif-whatsapp" className="text-sm cursor-pointer">WhatsApp</Label>
                  <Switch id="notif-whatsapp" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
