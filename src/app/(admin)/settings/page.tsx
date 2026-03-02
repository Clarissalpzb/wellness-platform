"use client";

import { useState, useEffect } from "react";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  settings: Record<string, unknown>;
}

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch("/api/organization");
        if (res.ok) {
          const data = await res.json();
          setOrg(data);
          setName(data.name);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrg(updated);
        setSuccessMsg("Cambios guardados correctamente");
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Error al guardar los cambios");
      }
    } catch {
      setErrorMsg("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Configuración</h1>
        <p className="text-sm text-neutral-500">Ajustes de tu organización</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Organización</CardTitle>
              <CardDescription>Datos generales de tu centro</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {errorMsg && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {successMsg}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="orgName">Nombre de la organización</Label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi Centro"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgSlug">Slug (URL)</Label>
              <Input
                id="orgSlug"
                value={org?.slug || ""}
                disabled
                className="bg-neutral-50"
              />
              <p className="text-xs text-neutral-400">El slug no puede modificarse</p>
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
