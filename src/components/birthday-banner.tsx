"use client";

import { useState } from "react";
import { Cake, X } from "lucide-react";

export function BirthdayBanner({ names }: { names: { firstName: string; lastName: string }[] }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || names.length === 0) return null;

  const nameList = names.map((n) => `${n.firstName} ${n.lastName}`).join(", ");

  return (
    <div className="relative flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
      <Cake className="h-5 w-5 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800">
        <span className="font-medium">
          {names.length === 1 ? "Hoy cumple años:" : "Hoy cumplen años:"}
        </span>{" "}
        {nameList}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-amber-400 hover:text-amber-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
