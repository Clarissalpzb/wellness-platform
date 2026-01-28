import { Role, BookingStatus, InsightStatus, PackageType, CompensationType, CampaignChannel, CampaignStatus, TransactionType, PaymentMethod } from "@prisma/client";

export type { Role, BookingStatus, InsightStatus, PackageType, CompensationType, CampaignChannel, CampaignStatus, TransactionType, PaymentMethod };

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
  image?: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  revenueChange: number;
  activeClients: number;
  clientsChange: number;
  bookingsToday: number;
  bookingsChange: number;
  retentionRate: number;
  retentionChange: number;
}

export interface ClassWithSchedule {
  id: string;
  name: string;
  description: string | null;
  color: string;
  duration: number;
  maxCapacity: number;
  category: string | null;
  level: string | null;
  schedules: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    coachProfile: {
      user: {
        firstName: string;
        lastName: string;
        avatar: string | null;
      };
    } | null;
    _count: {
      bookings: number;
    };
  }[];
}

export interface InsightWithActions {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  impactScore: number;
  confidenceScore: number;
  actionabilityScore: number;
  suggestedActions: string[];
  status: InsightStatus;
  createdAt: Date;
  actions: {
    id: string;
    action: string;
    result: string | null;
    createdAt: Date;
    user: {
      firstName: string;
      lastName: string;
    };
  }[];
}

export interface BookingWithDetails {
  id: string;
  date: Date;
  status: BookingStatus;
  checkedInAt: Date | null;
  source: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    healthFlags: string[];
  };
  classSchedule: {
    startTime: string;
    endTime: string;
    class: {
      name: string;
      color: string;
    };
    coachProfile: {
      user: {
        firstName: string;
        lastName: string;
      };
    } | null;
  };
}

export interface ChartDataPoint {
  label: string;
  value: number;
  previousValue?: number;
}
