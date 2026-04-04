"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Megaphone, Loader2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  success: "bg-green-50 text-green-700 border-green-200",
};

const TYPE_LABELS: Record<string, string> = {
  info: "Información",
  warning: "Aviso",
  success: "Éxito",
};

const emptyForm = { title: "", content: "", type: "info", endsAt: "" };

export default function AnunciosPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/announcements");
    if (res.ok) {
      const data = await res.json();
      setAnnouncements(data);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      endsAt: a.endsAt ? a.endsAt.split("T")[0] : "",
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      endsAt: form.endsAt || null,
    };
    if (editing) {
      await fetch(`/api/announcements/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function toggleActive(a: Announcement) {
    await fetch(`/api/announcements/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este anuncio?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Anuncios</h1>
          <p className="text-sm text-neutral-500">Comunica novedades a tus clientes</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo anuncio
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="mx-auto h-10 w-10 text-neutral-300 mb-3" />
          <p className="text-neutral-500">No hay anuncios activos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className={`border ${!a.isActive ? "opacity-50" : ""}`}>
              <CardContent className="py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-neutral-900 text-sm">{a.title}</span>
                    <Badge variant="outline" className={`text-xs ${TYPE_COLORS[a.type]}`}>
                      {TYPE_LABELS[a.type] ?? a.type}
                    </Badge>
                    {!a.isActive && (
                      <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600 line-clamp-2">{a.content}</p>
                  {a.endsAt && (
                    <p className="text-xs text-neutral-400 mt-1">
                      Expira: {new Date(a.endsAt).toLocaleDateString("es-MX")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(a)}>
                    {a.isActive ? "Desactivar" : "Activar"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar anuncio" : "Nuevo anuncio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Studio cerrado el 25 de diciembre"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mensaje</Label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Escribe el mensaje para tus clientes..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
                >
                  <option value="info">Información</option>
                  <option value="warning">Aviso</option>
                  <option value="success">Éxito</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Expira el (opcional)</Label>
                <Input
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.title || !form.content}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Guardar cambios" : "Publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
