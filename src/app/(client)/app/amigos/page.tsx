"use client";

import { Search, UserPlus, Users, Trophy, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const friends = [
  { id: "1", name: "Ana Martínez", avatar: null, classesThisMonth: 15, streak: 8, favoriteClass: "HIIT" },
  { id: "2", name: "Diego Torres", avatar: null, classesThisMonth: 10, streak: 3, favoriteClass: "Yoga" },
  { id: "3", name: "Valentina Ruiz", avatar: null, classesThisMonth: 8, streak: 5, favoriteClass: "Pilates" },
];

const activity = [
  { id: "1", user: "Ana Martínez", action: "completó", target: "HIIT Cardio", time: "Hace 2h" },
  { id: "2", user: "Diego Torres", action: "reservó", target: "Yoga Flow", time: "Hace 3h" },
  { id: "3", user: "Valentina Ruiz", action: "completó", target: "Pilates Mat", time: "Hace 5h" },
  { id: "4", user: "Ana Martínez", action: "alcanzó racha de", target: "8 días", time: "Ayer" },
];

export default function AmigosPage() {
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
            <Input placeholder="Buscar amigos..." className="pl-9" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <Card key={friend.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-16 w-16 mb-3">
                      <AvatarImage src={friend.avatar || ""} />
                      <AvatarFallback className="text-lg">
                        {friend.name.split(" ").map(n => n[0]).join("")}
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
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {item.user.split(" ").map(n => n[0]).join("")}
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
