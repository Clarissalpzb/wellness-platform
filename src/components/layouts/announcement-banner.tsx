"use client";

import { useState, useEffect } from "react";
import { X, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  info: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
    icon: <Info className="h-4 w-4 flex-shrink-0" />,
  },
  warning: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    icon: <AlertTriangle className="h-4 w-4 flex-shrink-0" />,
  },
  success: {
    bg: "bg-green-50 border-green-200",
    text: "text-green-800",
    icon: <CheckCircle2 className="h-4 w-4 flex-shrink-0" />,
  },
};

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data);
      })
      .catch(() => {});
  }, []);

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1 px-4 pt-2">
      {visible.map((a) => {
        const style = TYPE_STYLES[a.type] ?? TYPE_STYLES.info;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-sm ${style.bg} ${style.text}`}
          >
            {style.icon}
            <div className="flex-1 min-w-0">
              <span className="font-semibold">{a.title}</span>
              {a.content && <span className="ml-1 font-normal opacity-90">{a.content}</span>}
            </div>
            <button
              onClick={() => setDismissed((s) => new Set(s).add(a.id))}
              className="opacity-60 hover:opacity-100 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
