"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Link } from "lucide-react";

export function InviteLinkCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const inviteUrl = `${origin}/unirse/${slug}`;

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
          <Link className="h-5 w-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900">
            Enlace de invitación para clientes
          </p>
          <p className="text-xs text-neutral-500 truncate">{inviteUrl}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 mr-1" />
          ) : (
            <Copy className="h-4 w-4 mr-1" />
          )}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </CardContent>
    </Card>
  );
}
