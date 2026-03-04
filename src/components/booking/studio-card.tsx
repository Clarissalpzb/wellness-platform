"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Studio } from "@/lib/booking/types";

interface StudioCardProps {
  studio: Studio;
  color: string;
  gradient: string;
  classCount: number;
}

export function StudioCard({ studio, color, gradient, classCount }: StudioCardProps) {
  return (
    <Link href={`/app/studio/${studio.id}`}>
      <div className="rounded-2xl overflow-hidden bg-white border border-neutral-200 hover:shadow-md transition-shadow cursor-pointer">
        <div className={cn("h-20 bg-gradient-to-br", gradient)} />
        <div className="flex flex-col items-center -mt-8 pb-4 px-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg border-4 border-white"
            style={{ backgroundColor: color }}
          >
            {studio.name[0]}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-neutral-900 text-center leading-tight">
            {studio.name}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            {classCount === 0
              ? "Sin clases hoy"
              : `${classCount} clase${classCount > 1 ? "s" : ""} hoy`}
          </p>
        </div>
      </div>
    </Link>
  );
}
