"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, Users, Trophy, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Friend {
  id: string;
  name: string;
  avatar: string | null;
  classesThisMonth: number;
  streak: number;
  favoriteClass: string;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

// ---------------------------------------------------------------------------
// Mock data (fallback / default)
// ---------------------------------------------------------------------------
const mockFriends: Friend[] = [
  { id: "1", name: "Ana Martínez", avatar: null, classesThisMonth: 15, streak: 8, favoriteClass: "HIIT" },
  { id: "2", name: "Diego Torres", avatar: null, classesThisMonth: 10, streak: 3, favoriteClass: "Yoga" },
  { id: "3", name: "Valentina Ruiz", avatar: null, classesThisMonth: 8, streak: 5, favoriteClass: "Pilates" },
];

const mockActivity: ActivityItem[] = [
  { id: "1", user: "Ana Martínez", action: "completó", target: "HIIT Cardio", time: "Hace 2h" },
  { id: "2", user: "Diego Torres", action: "reservó", target: "Yoga Flow", time: "Hace 3h" },
  { id: "3", user: "Valentina Ruiz", action: "completó", target: "Pilates Mat", time: "Hace 5h" },
  { id: "4", user: "Ana Martínez", action: "alcanzó racha de", target: "8 días", time: "Ayer" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AmigosPage() {
  const [friends, setFriends] = useState<Friend[]>(mockFriends);
  const [activity, setActivity] = useState<ActivityItem[]>(mockActivity);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // ---- Fetch friends data (social API not yet available, falls back to mocks) ----
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [friendsRes, activityRes] = await Promise.all([
          fetch("/api/friends").catch(() => null),
          fetch("/api/activity").catch(() => null),
        ]);

        if (!cancelled) {
          if (friendsRes && friendsRes.ok) {
            const data = await friendsRes.json();
            if (Array.isArray(data) && data.length > 0) {
              setFriends(data);
            }
          }

          if (activityRes && activityRes.ok) {
            const data = await activityRes.json();
            if (Array.isArray(data) && data.length > 0) {
              setActivity(data);
            }
          }
        }
      } catch {
        // Keep mock data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ---- Filter friends by search ----
  const filteredFriends = searchQuery
    ? friends.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Amigos</h1>
            <p className="text-sm text-neutral-500">Conecta con otros miembros</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          <span className="ml-2 text-sm text-neutral-500">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Amigos</h1>
          <p className="text-sm text-neutral-500">Conecta con otros miembros</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar Amigo
        </Button>
      </div>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">Amigos ({friends.length})</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
          <TabsTrigger value="referrals">Referidos</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Buscar amigos..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredFriends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-neutral-500">
                {searchQuery
                  ? "No se encontraron amigos con ese nombre."
                  : "Aún no tienes amigos agregados."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map((friend) => (
                <Card key={friend.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-16 w-16 mb-3">
                        <AvatarImage src={friend.avatar || ""} />
                        <AvatarFallback className="text-lg">
                          {friend.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold">{friend.name}</h3>
                      <Badge variant="outline" className="mt-1">{friend.favoriteClass}</Badge>
                      <div className="flex items-center gap-4 mt-4 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {friend.classesThisMonth} clases
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-accent-amber" />
                          {friend.streak} días
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {activity.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
                <p className="text-neutral-500">No hay actividad reciente.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 pb-4 border-b border-neutral-100 last:border-0 last:pb-0"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {item.user.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{item.user}</span>{" "}
                          {item.action}{" "}
                          <span className="font-medium">{item.target}</span>
                        </p>
                        <p className="text-xs text-neutral-400">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <h3 className="font-semibold text-lg mb-2">Programa de Referidos</h3>
              <p className="text-sm text-neutral-500 mb-4 max-w-sm mx-auto">
                Invita a tus amigos y ambos reciben una clase gratis cuando se registren.
              </p>
              <Button>Compartir Enlace de Invitación</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
