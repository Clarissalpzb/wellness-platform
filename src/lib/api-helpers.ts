import { NextResponse } from "next/server";
import { type Role } from "@prisma/client";
import { auth } from "./auth";
import { hasPermission, type Permission } from "./permissions";

export async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return session;
}

export function getOrgId(session: any): string | null {
  return session.user.organizationId ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "No encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function success(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function requirePermission(session: any, permission: Permission) {
  const role = session.user.role as Role;
  if (!hasPermission(role, permission)) return forbidden();
  return null;
}

export function requireRole(session: any, ...roles: Role[]) {
  const role = session.user.role as Role;
  if (!roles.includes(role)) return forbidden();
  return null;
}
