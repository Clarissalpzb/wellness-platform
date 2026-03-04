export interface ScheduleItem {
  id: string;
  time: string;
  endTime: string;
  name: string;
  coach: string;
  enrolled: number;
  capacity: number;
  color: string;
  level: string;
  location: string;
  category: string;
  organizationId: string;
}

export interface Studio {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  settings: Record<string, any>;
}

export type StudioFilter = "all" | string;
export type TabName = "sesiones" | "paquetes" | "ubicacion";

export interface PackageItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  currency: string;
  classLimit: number | null;
  validityDays: number;
}

export interface StudioWithMeta extends Studio {
  color: string;
  gradient: string;
  index: number;
}

export interface CouponResult {
  valid: boolean;
  discountType: string;
  discountValue: number;
  originalPrice: number;
  finalPrice: number;
  code: string;
}
