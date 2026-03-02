"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera, Package, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HealthFlag {
  id: string;
  label: string;
  active: boolean;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  initials: string;
  healthFlags: HealthFlag[];
  package: {
    name: string;
    expiresAt: string;
    classesUsed: number | string;
    classesTotal: number | string;
    daysRemaining: number;
  };
  stats: {
    classesThisMonth: number;
    currentStreak: number;
    favoriteClass: string;
    memberSince: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    whatsapp: boolean;
  };
}

// ---------------------------------------------------------------------------
// Default / mock data
// ---------------------------------------------------------------------------
const defaultHealthFlags: HealthFlag[] = [
  { id: "pregnancy", label: "Embarazo", active: false },
  { id: "back_injury", label: "Lesión de espalda", active: false },
  { id: "knee_injury", label: "Lesión de rodilla", active: false },
  { id: "heart_condition", label: "Condición cardíaca", active: false },
  { id: "high_blood_pressure", label: "Presión alta", active: false },
  { id: "asthma", label: "Asma", active: false },
];

const defaultProfile: ProfileData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  avatarUrl: "",
  initials: "",
  healthFlags: defaultHealthFlags,
  package: {
    name: "Sin paquete",
    expiresAt: "-",
    classesUsed: 0,
    classesTotal: 0,
    daysRemaining: 0,
  },
  stats: {
    classesThisMonth: 0,
    currentStreak: 0,
    favoriteClass: "-",
    memberSince: "-",
  },
  notifications: {
    email: true,
    push: true,
    whatsapp: false,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PerfilPage() {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [flags, setFlags] = useState<HealthFlag[]>(defaultHealthFlags);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  // Form fields
  const [firstName, setFirstName] = useState(defaultProfile.firstName);
  const [lastName, setLastName] = useState(defaultProfile.lastName);
  const [email, setEmail] = useState(defaultProfile.email);
  const [phone, setPhone] = useState(defaultProfile.phone);
  const [notifications, setNotifications] = useState(defaultProfile.notifications);

  // ---- Fetch profile on mount ----
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const merged: ProfileData = {
        firstName: data.firstName ?? data.first_name ?? defaultProfile.firstName,
        lastName: data.lastName ?? data.last_name ?? defaultProfile.lastName,
        email: data.email ?? defaultProfile.email,
        phone: data.phone ?? defaultProfile.phone,
        avatarUrl: data.avatarUrl ?? data.avatar_url ?? defaultProfile.avatarUrl,
        initials: data.initials ?? `${(data.firstName ?? data.first_name ?? "")[0] ?? ""}${(data.lastName ?? data.last_name ?? "")[0] ?? ""}`,
        healthFlags: Array.isArray(data.healthFlags) ? data.healthFlags : defaultProfile.healthFlags,
        package: data.package ?? defaultProfile.package,
        stats: data.stats ?? defaultProfile.stats,
        notifications: data.notifications ?? defaultProfile.notifications,
      };

      setProfile(merged);
      setFirstName(merged.firstName);
      setLastName(merged.lastName);
      setEmail(merged.email);
      setPhone(merged.phone);
      setFlags(merged.healthFlags);
      setNotifications(merged.notifications);
    } catch {
      // Keep defaults – already set in initial state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ---- Toggle health flag ----
  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  };

  // ---- Save profile ----
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("idle");
    setSaveMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          healthFlags: flags,
          notifications,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al guardar" }));
        throw new Error(err.error || "Error al guardar");
      }
      setSaveStatus("success");
      setSaveMessage("Cambios guardados exitosamente.");
    } catch (e: unknown) {
      setSaveStatus("error");
      setSaveMessage(e instanceof Error ? e.message : "Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
      // Clear success message after a few seconds
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        <span className="ml-2 text-sm text-neutral-500">Cargando perfil...</span>
      </div>
    );
  }

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
                  <AvatarImage src={profile.avatarUrl} />
                  <AvatarFallback className="text-xl">{profile.initials}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Cambiar foto
                </Button>
              </div>

              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                {/* Save feedback */}
                {saveStatus === "success" && (
                  <div className="flex items-center gap-2 bg-green-50 text-green-800 text-sm p-3 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{saveMessage}</span>
                  </div>
                )}
                {saveStatus === "error" && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-800 text-sm p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{saveMessage}</span>
                  </div>
                )}

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
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
                  <p className="font-medium">{profile.package.name}</p>
                  <p className="text-xs text-neutral-500">Vence: {profile.package.expiresAt}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Clases usadas</span>
                  <span className="font-medium">{profile.package.classesUsed} de {profile.package.classesTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Días restantes</span>
                  <span className="font-medium">{profile.package.daysRemaining} días</span>
                </div>
              </div>
              <Separator className="my-4" />
              <Link href="/app/reservar">
                <Button variant="outline" className="w-full">Renovar Paquete</Button>
              </Link>
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
                  <span className="font-bold text-lg">{profile.stats.classesThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Racha actual</span>
                  <span className="font-bold text-lg">{profile.stats.currentStreak} días</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Clase favorita</span>
                  <Badge variant="success">{profile.stats.favoriteClass}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Miembro desde</span>
                  <span className="font-medium">{profile.stats.memberSince}</span>
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
                  <Switch
                    id="notif-email"
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, email: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif-push" className="text-sm cursor-pointer">Push</Label>
                  <Switch
                    id="notif-push"
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, push: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif-whatsapp" className="text-sm cursor-pointer">WhatsApp</Label>
                  <Switch
                    id="notif-whatsapp"
                    checked={notifications.whatsapp}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, whatsapp: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
