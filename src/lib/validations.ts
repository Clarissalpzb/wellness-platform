import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  organizationName: z.string().min(2, "Mínimo 2 caracteres"),
  phone: z.string().optional(),
});

export const classSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional(),
  color: z.string().default("#22c55e"),
  duration: z.coerce.number().min(15, "Mínimo 15 minutos").max(180, "Máximo 180 minutos"),
  maxCapacity: z.coerce.number().min(1, "Mínimo 1 persona"),
  waitlistMax: z.coerce.number().min(0).default(5),
  category: z.string().optional(),
  level: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const packageSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional(),
  type: z.enum(["CLASS_PACK", "UNLIMITED", "DROP_IN", "MEMBERSHIP"]),
  price: z.coerce.number().min(0, "Precio debe ser positivo"),
  classLimit: z.coerce.number().optional(),
  validityDays: z.coerce.number().min(1, "Mínimo 1 día"),
});

export const scheduleSchema = z.object({
  classId: z.string().min(1, "Selecciona una clase"),
  locationId: z.string().min(1, "Selecciona una ubicación"),
  spaceId: z.string().optional(),
  coachProfileId: z.string().optional(),
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm"),
  isRecurring: z.boolean().default(true),
  specificDate: z.string().optional(),
});

export const staffSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().optional().default(""),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "FRONT_DESK", "COACH"]),
  phone: z.string().optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  channel: z.enum(["EMAIL", "WHATSAPP", "PUSH"]),
  subject: z.string().optional(),
  content: z.string().min(10, "Mínimo 10 caracteres"),
  segmentFilter: z.record(z.string(), z.any()).default({}),
  scheduledAt: z.string().optional(),
});

export const clientRegisterSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  phone: z.string().optional(),
  slug: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ClientRegisterInput = z.infer<typeof clientRegisterSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type PackageInput = z.infer<typeof packageSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export const locationSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  address: z.string().min(5, "Mínimo 5 caracteres"),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const spaceSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  capacity: z.coerce.number().min(1, "Mínimo 1 persona"),
  amenities: z.array(z.string()).default([]),
  locationId: z.string().min(1, "Selecciona una ubicación"),
});

export const productSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  price: z.coerce.number().min(0, "Precio debe ser positivo"),
  category: z.string().optional(),
  sku: z.string().optional(),
  stock: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CampaignInput = z.infer<typeof campaignSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type SpaceInput = z.infer<typeof spaceSchema>;
export type ProductInput = z.infer<typeof productSchema>;
