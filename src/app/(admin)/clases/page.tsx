"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, Pencil, Trash2, Calendar, Clock, X, ImagePlus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function ClasesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState("");

  const [formError, setFormError] = useState<string | null>(null);

  // Form state for selects (not captured by FormData)
  const [formLevel, setFormLevel] = useState("");
  const [formColor, setFormColor] = useState("#3b82f6");

  const COLOR_PRESETS = [
    "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  ];

  // Banner image state
  const [formImage, setFormImage] = useState<string | null>(null);

  // Coach/instructor state
  const [coaches, setCoaches] = useState<any[]>([]);

  // Replicate week state
  const [showReplicate, setShowReplicate] = useState(false);
  const [replicateDate, setReplicateDate] = useState("");
  const [replicating, setReplicating] = useState(false);
  const [replicateMsg, setReplicateMsg] = useState<string | null>(null);

  // Schedule management state
  const [scheduleClass, setScheduleClass] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleLocation, setScheduleLocation] = useState("");
  const [scheduleSpace, setScheduleSpace] = useState("");
  const [scheduleCoach, setScheduleCoach] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const json = await res.json();
        setClasses(json);
      } else {
        setClasses([]);
      }
    } catch (e) {
      console.error(e);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetch("/api/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then((locs: any[]) => {
        setLocations(locs);
        if (locs.length === 1) setScheduleLocation(locs[0].id);
      })
      .catch(() => setLocations([]));
    fetch("/api/staff")
      .then((r) => (r.ok ? r.json() : []))
      .then((staff: any[]) => setCoaches(staff.filter((s: any) => s.coachProfile)))
      .catch(() => setCoaches([]));
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const duration = Number(formData.get("duration"));
    const body: any = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      duration,
      maxCapacity: Number(formData.get("maxCapacity")),
      category: (formData.get("category") as string)?.trim() || undefined,
      level: formLevel || undefined,
      color: formColor,
      waitlistMax: Number(formData.get("waitlistMax")) || 0,
    };
    if (formImage) body.imageUrl = formImage;
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setFormError(err.error || "Error al guardar");
      return;
    }

    const newClass = await res.json();

    // Create schedules if any days were selected
    if (scheduleDays.length > 0 && scheduleStart && scheduleLocation) {
      const endTime = computeEndTime(scheduleStart, duration);
      for (const day of scheduleDays) {
        const schedRes = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: newClass.id,
            dayOfWeek: day,
            startTime: scheduleStart,
            endTime,
            locationId: scheduleLocation,
            spaceId: scheduleSpace || undefined,
            coachProfileId: scheduleCoach || undefined,
            isRecurring: true,
          }),
        });
        if (!schedRes.ok) {
          const err = await schedRes.json().catch(() => ({}));
          setFormError(err.error || "Error al agregar horario");
          fetchData();
          return;
        }
      }
    }

    closeDialog();
    fetchData();
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const body: any = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      duration: Number(formData.get("duration")),
      maxCapacity: Number(formData.get("maxCapacity")),
      category: (formData.get("category") as string)?.trim() || editItem.category || undefined,
      level: formLevel || editItem.level || undefined,
      color: formColor || editItem.color,
      waitlistMax: Number(formData.get("waitlistMax")) || 0,
    };
    if (formImage) body.imageUrl = formImage;
    else if (formImage === null && editItem.imageUrl) body.imageUrl = editItem.imageUrl;
    const res = await fetch(`/api/classes/${editItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setFormError(err.error || "Error al guardar");
      return;
    }

    // Create schedules if any days were selected
    if (scheduleDays.length > 0 && scheduleStart && scheduleLocation) {
      const duration = Number(formData.get("duration"));
      const endTime = computeEndTime(scheduleStart, duration);
      for (const day of scheduleDays) {
        const schedRes = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: editItem.id,
            dayOfWeek: day,
            startTime: scheduleStart,
            endTime,
            locationId: scheduleLocation,
            spaceId: scheduleSpace || undefined,
            coachProfileId: scheduleCoach || undefined,
            isRecurring: true,
          }),
        });
        if (!schedRes.ok) {
          const err = await schedRes.json().catch(() => ({}));
          setFormError(err.error || "Error al agregar horario");
          fetchData();
          return;
        }
      }
    }

    setEditItem(null);
    setFormLevel("");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta clase?")) return;
    await fetch(`/api/classes/${id}`, { method: "DELETE" });
    fetchData();
  };

  const openEdit = (cls: any) => {
    setFormLevel(cls.level || "");
    setFormColor(cls.color || "#3b82f6");
    setFormImage(cls.imageUrl || null);
    resetScheduleForm();
    setEditItem(cls);
  };

  const closeDialog = () => {
    setShowCreate(false);
    setEditItem(null);
    setFormLevel("");
    setFormColor("#3b82f6");
    setFormImage(null);
    setFormError(null);
    resetScheduleForm();
  };

  const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const resetScheduleForm = () => {
    setScheduleDays([]);
    setScheduleStart("");
    setScheduleLocation(locations.length === 1 ? locations[0].id : "");
    setScheduleSpace("");
    setScheduleCoach("");
    setScheduleError(null);
  };

  const toggleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const computeEndTime = (start: string, durationMin: number): string => {
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + durationMin;
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  };

  const openScheduleDialog = (cls: any) => {
    resetScheduleForm();
    setScheduleClass(cls);
  };

  const closeScheduleDialog = () => {
    setScheduleClass(null);
    resetScheduleForm();
  };

  const handleAddSchedule = async (targetClass: any) => {
    setScheduleError(null);
    if (!targetClass || scheduleDays.length === 0) return;

    const endTime = computeEndTime(scheduleStart, targetClass.duration);

    for (const day of scheduleDays) {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: targetClass.id,
          dayOfWeek: day,
          startTime: scheduleStart,
          endTime,
          locationId: scheduleLocation,
          spaceId: scheduleSpace || undefined,
          coachProfileId: scheduleCoach || undefined,
          isRecurring: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setScheduleError(err.error || "Error al agregar horario");
        return;
      }
    }

    resetScheduleForm();
    await fetchData();
    const updated = (await fetch("/api/classes").then((r) => r.json())) as any[];
    const fresh = updated.find((c: any) => c.id === targetClass.id);
    if (fresh) {
      if (scheduleClass) setScheduleClass(fresh);
      if (editItem) setEditItem(fresh);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string, targetClass: any) => {
    const res = await fetch(`/api/schedule/${scheduleId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchData();
      const updated = (await fetch("/api/classes").then((r) => r.json())) as any[];
      const fresh = updated.find((c: any) => c.id === targetClass?.id);
      if (fresh) {
        if (scheduleClass) setScheduleClass(fresh);
        if (editItem) setEditItem(fresh);
      }
    }
  };

  const handleReplicate = async () => {
    if (!replicateDate) return;
    setReplicating(true);
    setReplicateMsg(null);
    try {
      const res = await fetch("/api/schedule/replicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWeekStart: replicateDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplicateMsg(data.message || `Se crearon ${data.created} horarios`);
      } else {
        setReplicateMsg(data.error || "Error al replicar");
      }
    } catch {
      setReplicateMsg("Error de conexión");
    } finally {
      setReplicating(false);
    }
  };

  const selectedLocation = locations.find((l: any) => l.id === scheduleLocation);
  const filteredSpaces = selectedLocation?.spaces ?? [];

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const dialogOpen = showCreate || editItem !== null;
  const isEditing = editItem !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Clases</h1>
          <p className="text-sm text-neutral-500">Gestiona las clases de tu centro</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setShowReplicate(true); setReplicateMsg(null); setReplicateDate(""); }}>
            <Copy className="mr-2 h-4 w-4" />
            Replicar Semana
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Clase
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Buscar clases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {classes.length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500">
          <p>No hay clases aún</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cls) => (
          <Card key={cls.id} className="relative overflow-hidden">
            {cls.imageUrl && (
              <div className="h-32 w-full">
                <img src={cls.imageUrl} alt={cls.name} className="h-full w-full object-cover" />
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: cls.color }}
                  >
                    {cls.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{cls.name}</CardTitle>
                    <p className="text-sm text-neutral-500">{cls.category}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(cls)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openScheduleDialog(cls)}>
                      <Calendar className="mr-2 h-4 w-4" /> Horarios
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-accent-rose" onClick={() => handleDelete(cls.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span>{cls.duration} min</span>
                <span>Cap. {cls.maxCapacity}</span>
                <Badge variant={cls.isActive ? "success" : "secondary"}>
                  {cls.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>
              {cls.schedules?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {cls.schedules.slice(0, 3).map((s: any) => {
                    const coachName = s.coachProfile?.user
                      ? `${s.coachProfile.user.firstName} ${s.coachProfile.user.lastName}`
                      : null;
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-xs text-neutral-500">
                        <Clock className="h-3 w-3 text-neutral-400 shrink-0" />
                        <span className="font-medium text-neutral-600">{DAY_NAMES[s.dayOfWeek]?.slice(0, 3)}</span>
                        <span>{s.startTime} – {s.endTime}</span>
                        {coachName && <span className="text-neutral-400">· {coachName}</span>}
                      </div>
                    );
                  })}
                  {cls.schedules.length > 3 && (
                    <p className="text-xs text-neutral-400">+{cls.schedules.length - 3} más</p>
                  )}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline">{cls.level}</Badge>
                <span className="text-xs text-neutral-400">
                  {cls.schedules?.length ?? 0} horarios
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Clase" : "Nueva Clase"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifica los datos de la clase" : "Crea una nueva clase para tu centro"}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={isEditing ? handleEdit : handleCreate}>
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" placeholder="Ej: Yoga Flow" defaultValue={editItem?.name || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" placeholder="Describe la clase..." defaultValue={editItem?.description || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duración (min)</Label>
                <Input id="duration" name="duration" type="number" placeholder="60" defaultValue={editItem?.duration || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCapacity">Capacidad</Label>
                <Input id="maxCapacity" name="maxCapacity" type="number" placeholder="20" defaultValue={editItem?.maxCapacity || ""} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  name="category"
                  list="category-suggestions"
                  placeholder="Ej: Reformer, Barre, Yoga..."
                  defaultValue={editItem?.category || ""}
                />
                <datalist id="category-suggestions">
                  <option value="Reformer" />
                  <option value="Barre" />
                  <option value="Yoga" />
                  <option value="Cycling" />
                  <option value="Pilates" />
                  <option value="Fuerza" />
                  <option value="Cardio" />
                  <option value="Mindfulness" />
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select value={formLevel} onValueChange={setFormLevel}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Principiante">Principiante</SelectItem>
                    <SelectItem value="Intermedio">Intermedio</SelectItem>
                    <SelectItem value="Avanzado">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      formColor === c ? "border-neutral-900 scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waitlistMax">Lista de espera</Label>
              <Input id="waitlistMax" name="waitlistMax" type="number" placeholder="0" defaultValue={editItem?.waitlistMax ?? 0} />
            </div>
            {/* Banner image */}
            <div className="space-y-2">
              <Label>Imagen de portada</Label>
              {formImage && (
                <div className="relative">
                  <img src={formImage} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => setFormImage(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-600 hover:text-neutral-900 border border-dashed rounded-lg p-3 justify-center transition-colors">
                <ImagePlus className="h-4 w-4" />
                {formImage ? "Cambiar imagen" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => setFormImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>

            {/* Schedule section */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Horarios
              </h4>

              {/* Existing schedules (edit mode) */}
              {isEditing && editItem?.schedules?.length > 0 && (
                <div className="space-y-2">
                  {editItem.schedules.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="font-medium">{DAY_NAMES[s.dayOfWeek]}</span>
                        <span className="text-neutral-500">{s.startTime} – {s.endTime}</span>
                        {s.location && <Badge variant="outline" className="text-xs">{s.location.name}</Badge>}
                        {s.coachProfile?.user && (
                          <span className="text-xs text-neutral-500">{s.coachProfile.user.firstName} {s.coachProfile.user.lastName}</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-neutral-400 hover:text-red-500"
                        onClick={() => handleDeleteSchedule(s.id, editItem)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {scheduleError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                  {scheduleError}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Días</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        scheduleDays.includes(i)
                          ? "bg-primary-600 text-white border-primary-600"
                          : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Hora inicio</Label>
                  <Input
                    type="time"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ubicación</Label>
                  <Select value={scheduleLocation} onValueChange={(v) => { setScheduleLocation(v); setScheduleSpace(""); }}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((loc: any) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Salón</Label>
                  <Select value={scheduleSpace} onValueChange={setScheduleSpace} disabled={filteredSpaces.length === 0}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {filteredSpaces.map((sp: any) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Instructor</Label>
                  <Select value={scheduleCoach} onValueChange={setScheduleCoach}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {coaches.map((c: any) => (
                        <SelectItem key={c.coachProfile.id} value={c.coachProfile.id}>
                          {c.firstName} {c.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleAddSchedule(editItem)}
                  disabled={scheduleDays.length === 0 || !scheduleStart || !scheduleLocation}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Agregar Horario
                </Button>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit">{isEditing ? "Guardar Cambios" : "Crear Clase"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Replicate week dialog */}
      <Dialog open={showReplicate} onOpenChange={(open) => { if (!open) setShowReplicate(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Replicar Semana</DialogTitle>
            <DialogDescription>
              Copia todos los horarios recurrentes a una semana específica
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lunes de la semana objetivo</Label>
              <Input
                type="date"
                value={replicateDate}
                onChange={(e) => setReplicateDate(e.target.value)}
              />
              <p className="text-xs text-neutral-400">Selecciona el lunes de la semana donde quieres replicar los horarios</p>
            </div>
            {replicateMsg && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                {replicateMsg}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplicate(false)}>Cancelar</Button>
            <Button onClick={handleReplicate} disabled={!replicateDate || replicating}>
              {replicating ? "Replicando..." : "Replicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule management dialog */}
      <Dialog open={scheduleClass !== null} onOpenChange={(open) => { if (!open) closeScheduleDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Horarios — {scheduleClass?.name}</DialogTitle>
            <DialogDescription>
              Gestiona los horarios recurrentes de esta clase
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing schedules */}
            {scheduleClass?.schedules?.length > 0 ? (
              <div className="space-y-2">
                {scheduleClass.schedules.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-neutral-400" />
                      <span className="font-medium">{DAY_NAMES[s.dayOfWeek]}</span>
                      <span className="text-neutral-500">
                        {s.startTime} – {s.endTime}
                      </span>
                      {s.location && (
                        <Badge variant="outline">{s.location.name}</Badge>
                      )}
                      {s.space && (
                        <span className="text-xs text-neutral-400">{s.space.name}</span>
                      )}
                      {s.coachProfile?.user && (
                        <span className="text-xs text-neutral-500">{s.coachProfile.user.firstName} {s.coachProfile.user.lastName}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-neutral-400 hover:text-red-500"
                      onClick={() => handleDeleteSchedule(s.id, scheduleClass)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 text-center py-3">
                No hay horarios configurados
              </p>
            )}

            {/* Add schedule form */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">Agregar Horario</h4>
              {scheduleError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {scheduleError}
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Días</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        scheduleDays.includes(i)
                          ? "bg-primary-600 text-white border-primary-600"
                          : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora de inicio</Label>
                <Input
                  type="time"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  className="w-40"
                />
                {scheduleStart && scheduleClass?.duration && (
                  <p className="text-xs text-neutral-400">
                    Fin: {computeEndTime(scheduleStart, scheduleClass.duration)} ({scheduleClass.duration} min)
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ubicación</Label>
                  <Select value={scheduleLocation} onValueChange={(v) => { setScheduleLocation(v); setScheduleSpace(""); }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((loc: any) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Salón (opcional)</Label>
                  <Select value={scheduleSpace} onValueChange={setScheduleSpace} disabled={filteredSpaces.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {filteredSpaces.map((sp: any) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Instructor (opcional)</Label>
                <Select value={scheduleCoach} onValueChange={setScheduleCoach}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {coaches.map((c: any) => (
                      <SelectItem key={c.coachProfile.id} value={c.coachProfile.id}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => handleAddSchedule(scheduleClass)}
                disabled={scheduleDays.length === 0 || !scheduleStart || !scheduleLocation}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Horario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
