import { NextResponse } from "next/server";
import { auth } from "./auth";

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

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "No encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function success(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
