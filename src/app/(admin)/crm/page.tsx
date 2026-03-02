"use client";

import { useState, useEffect } from "react";
import { Plus, Mail, MessageCircle, BarChart3, MoreHorizontal, Eye, Copy, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  SENDING: "Enviando",
  SENT: "Enviada",
  FAILED: "Fallida",
};

const statusVariant: Record<string, "secondary" | "info" | "warning" | "success" | "destructive"> = {
  DRAFT: "secondary",
  SCHEDULED: "info",
  SENDING: "warning",
  SENT: "success",
  FAILED: "destructive",
};

export default function CRMPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  // Form state for select
  const [formChannel, setFormChannel] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const json = await res.json();
        setCampaigns(json);
      } else {
        setCampaigns([]);
      }
    } catch (e) {
      console.error(e);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      channel: formChannel,
      subject: formData.get("subject") as string,
      content: formData.get("content") as string,
    };
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowCreate(false);
      setFormChannel("");
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      setFormError(err.error || "Error al guardar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta campaña?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    fetchData();
  };

  // Compute stats from real data
  const emailCount = campaigns.filter((c) => c.channel === "EMAIL").length;
  const whatsappCount = campaigns.filter((c) => c.channel === "WHATSAPP").length;

  const sentCampaigns = campaigns.filter(
    (c) => c.analytics?.sent && c.analytics.sent > 0
  );
  const avgOpenRate =
    sentCampaigns.length > 0
      ? Math.round(
          sentCampaigns.reduce(
            (sum, c) => sum + (c.analytics.opened / c.analytics.sent) * 100,
            0
          ) / sentCampaigns.length
        )
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">CRM & Campañas</h1>
          <p className="text-sm text-neutral-500">Gestiona segmentos y campañas de marketing</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Campaña
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent-blue-light text-accent-blue flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{emailCount}</p>
                <p className="text-sm text-neutral-500">Campañas email</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{whatsappCount}</p>
                <p className="text-sm text-neutral-500">Campañas WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent-amber-light text-accent-amber flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgOpenRate}%</p>
                <p className="text-sm text-neutral-500">Tasa de apertura</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns">
          {campaigns.length === 0 && !loading ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No hay campañas aún</p>
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Enviados</TableHead>
                    <TableHead>Abiertos</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const sent = campaign.analytics?.sent ?? 0;
                    const opened = campaign.analytics?.opened ?? 0;
                    const clicked = campaign.analytics?.clicked ?? 0;

                    return (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {campaign.channel === "EMAIL" ? (
                              <Mail className="h-3 w-3 mr-1" />
                            ) : (
                              <MessageCircle className="h-3 w-3 mr-1" />
                            )}
                            {campaign.channel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[campaign.status] || "secondary"}>
                            {statusLabels[campaign.status] || campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{sent}</TableCell>
                        <TableCell>
                          {opened > 0 && sent > 0
                            ? `${opened} (${Math.round((opened / sent) * 100)}%)`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {clicked > 0 && sent > 0
                            ? `${clicked} (${Math.round((clicked / sent) * 100)}%)`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" /> Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-accent-rose"
                                onClick={() => handleDelete(campaign.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="segments">
          <div className="mt-4 text-center py-12 text-neutral-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p className="font-medium">Constructor de Segmentos</p>
            <p className="text-sm mt-1">Próximamente: crea segmentos basados en comportamiento</p>
          </div>
        </TabsContent>
        <TabsContent value="templates">
          <div className="mt-4 text-center py-12 text-neutral-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p className="font-medium">Plantillas de Email</p>
            <p className="text-sm mt-1">Próximamente: diseña plantillas reutilizables</p>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setFormChannel(""); setFormError(null); } else { setShowCreate(true); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Campaña</DialogTitle>
            <DialogDescription>Crea una nueva campaña de marketing</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" placeholder="Ej: Bienvenida Enero" required />
            </div>
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={formChannel} onValueChange={setFormChannel}>
                <SelectTrigger><SelectValue placeholder="Seleccionar canal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto</Label>
              <Input id="subject" name="subject" placeholder="Asunto del mensaje" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Contenido</Label>
              <Textarea id="content" name="content" placeholder="Escribe el contenido de la campaña..." rows={4} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setFormChannel(""); }}>
                Cancelar
              </Button>
              <Button type="submit">Crear Campaña</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
