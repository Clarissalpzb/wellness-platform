"use client";

import {
  ChevronRight, Clock, User, Users, MapPin, CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { durationMinutes, formatTime12h } from "@/lib/booking/helpers";
import type { ScheduleItem } from "@/lib/booking/types";

interface ClassCardProps {
  classItem: ScheduleItem;
  variant: "browse" | "compact";
  isBooked?: boolean;
  studioName?: string;
  studioColor?: string;
  showStudioBadge?: boolean;
  onClick: () => void;
}

export function ClassCard({
  classItem: cls,
  variant,
  isBooked = false,
  studioName,
  studioColor,
  showStudioBadge = false,
  onClick,
}: ClassCardProps) {
  const full = cls.enrolled >= cls.capacity;
  const spotsLeft = cls.capacity - cls.enrolled;

  if (variant === "compact") {
    return (
      <Card
        className={cn("cursor-pointer transition-shadow hover:shadow-md overflow-hidden", full && !isBooked && "opacity-75")}
        onClick={onClick}
      >
        {isBooked && (
          <div className="flex items-center gap-1.5 bg-primary-50 px-4 py-1.5 border-b border-primary-100">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary-600" />
            <span className="text-xs font-medium text-primary-700">Reservada</span>
          </div>
        )}
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="text-center min-w-[50px]">
              <p className="text-sm font-bold text-neutral-900">{formatTime12h(cls.time)}</p>
            </div>
            <div className="h-12 w-1 rounded-full" style={{ backgroundColor: cls.color }} />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-neutral-900">{cls.name}</h4>
              <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {durationMinutes(cls.time, cls.endTime)} min
                </span>
                {cls.coach && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {cls.coach}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              {isBooked ? (
                <span className="text-xs text-primary-600 font-medium">Reservada</span>
              ) : full ? (
                <span className="text-xs text-amber-600 font-medium">Lleno</span>
              ) : (
                <div className="flex items-center gap-1 text-xs text-neutral-400">
                  <Users className="h-3 w-3" />
                  {spotsLeft}
                </div>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-300 shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // browse variant
  return (
    <Card
      className={cn("cursor-pointer transition-shadow hover:shadow-md overflow-hidden", full && !isBooked && "opacity-75")}
      onClick={onClick}
    >
      {isBooked && (
        <div className="flex items-center gap-1.5 bg-primary-50 px-4 py-1.5 border-b border-primary-100">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary-600" />
          <span className="text-xs font-medium text-primary-700">Reservada</span>
        </div>
      )}
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="text-center min-w-[50px]">
            <p className="text-sm font-bold text-neutral-900">{cls.time}</p>
            <p className="text-xs text-neutral-400">{cls.endTime}</p>
          </div>
          <div className="h-12 w-1 rounded-full" style={{ backgroundColor: cls.color }} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{cls.name}</h3>
              <Badge variant="outline" className="text-xs">{cls.level}</Badge>
              {showStudioBadge && studioName && (
                <Badge className="text-xs text-white" style={{ backgroundColor: studioColor }}>
                  {studioName}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-neutral-500">
              {cls.coach && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {cls.coach}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {durationMinutes(cls.time, cls.endTime)} min
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {cls.location}
              </span>
            </div>
          </div>
          <div className="text-right">
            {isBooked ? (
              <Badge variant="secondary" className="text-primary-600 bg-primary-50">Reservada</Badge>
            ) : full ? (
              <Badge variant="secondary" className="text-amber-600 bg-amber-50">Lleno</Badge>
            ) : (
              <div>
                <p className="text-sm font-medium text-primary-600">{spotsLeft} lugares</p>
                <div className="flex items-center gap-1 text-xs text-neutral-400">
                  <Users className="h-3 w-3" />
                  {cls.enrolled}/{cls.capacity}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
