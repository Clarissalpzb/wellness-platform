import { type Role } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "insights:view"
  | "classes:manage"
  | "classes:book_self"
  | "packages:manage"
  | "staff:manage"
  | "locations:manage"
  | "users:view"
  | "users:checkin"
  | "crm:manage"
  | "pos:manage"
  | "settings:manage"
  | "compensation:view_all"
  | "compensation:view_own"
  | "availability:manage_own"
  | "referrals:view_own"
  | "benefits:view_own";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [
    "dashboard:view",
    "insights:view",
    "classes:manage",
    "packages:manage",
    "staff:manage",
    "locations:manage",
    "users:view",
    "users:checkin",
    "crm:manage",
    "pos:manage",
    "settings:manage",
    "compensation:view_all",
  ],
  ADMIN: [
    "dashboard:view",
    "insights:view",
    "classes:manage",
    "packages:manage",
    "staff:manage",
    "locations:manage",
    "users:view",
    "users:checkin",
    "crm:manage",
    "pos:manage",
    "settings:manage",
    "compensation:view_all",
  ],
  HEAD_COACH: [
    "dashboard:view",
    "insights:view",
    "classes:manage",
    "users:view",
    "users:checkin",
    "compensation:view_all",
    "compensation:view_own",
    "availability:manage_own",
    "referrals:view_own",
  ],
  FRONT_DESK: [
    "users:view",
    "users:checkin",
    "pos:manage",
    "referrals:view_own",
    "classes:book_self",
    "benefits:view_own",
  ],
  COACH: [
    "compensation:view_own",
    "availability:manage_own",
    "referrals:view_own",
  ],
  CLIENT: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
