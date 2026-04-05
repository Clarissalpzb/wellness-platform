import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/api-helpers";

// GET  /api/autopilot  → returns org automation settings + recent audit logs
// POST /api/autopilot  → toggle an automation on/off
// PUT  /api/autopilot  → trigger an automation manually (run now)

const DEFAULT_AUTOMATIONS = {
  motivational_notifications: true,
  retention_workflow: true,
  abandoned_cart: true,
  dynamic_pricing: true,
  weekly_digest: true,
  insight_generation: true,
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });

  const settings = (org?.settings as Record<string, unknown>) ?? {};
  const automations = { ...DEFAULT_AUTOMATIONS, ...(settings.automations as object ?? {}) };

  const recentLogs = await db.auditLog.findMany({
    where: { organizationId: orgId, entity: "automation" },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ automations, logs: recentLogs });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { key, enabled } = await req.json();

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });

  const settings = (org?.settings as Record<string, unknown>) ?? {};
  const automations = { ...DEFAULT_AUTOMATIONS, ...(settings.automations as object ?? {}), [key]: enabled };

  await db.organization.update({
    where: { id: orgId },
    data: { settings: { ...settings, automations } },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: (session.user as any).id,
      action: enabled ? "automation_enabled" : "automation_disabled",
      entity: "automation",
      entityId: key,
      changes: { key, enabled },
    },
  });

  return NextResponse.json({ ok: true, automations });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();
  const orgId = (session.user as any).organizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { key } = await req.json();
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const secret = process.env.NOTIFICATIONS_SECRET || process.env.NEXTAUTH_SECRET || "";

  const endpointMap: Record<string, string> = {
    motivational_notifications: `${appUrl}/api/notifications/motivational`,
    retention_workflow: `${appUrl}/api/notifications/retention`,
    abandoned_cart: `${appUrl}/api/notifications/abandoned-cart`,
    insight_generation: `${appUrl}/api/insights`,
  };

  const endpoint = endpointMap[key];
  let result: { success: boolean; detail: string };

  if (!endpoint) {
    result = { success: false, detail: "Esta automatización se ejecuta en segundo plano automáticamente." };
  } else {
    try {
      const method = key === "insight_generation" ? "POST" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
      });
      result = res.ok
        ? { success: true, detail: `Ejecutado exitosamente (${res.status})` }
        : { success: false, detail: `Error ${res.status}` };
    } catch (e) {
      result = { success: false, detail: String(e) };
    }
  }

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: (session.user as any).id,
      action: "automation_triggered",
      entity: "automation",
      entityId: key,
      changes: result,
    },
  });

  return NextResponse.json(result);
}
