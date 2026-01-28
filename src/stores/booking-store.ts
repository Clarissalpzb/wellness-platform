import { create } from "zustand";

interface BookingState {
  selectedDate: Date;
  selectedClassId: string | null;
  selectedScheduleId: string | null;
  setSelectedDate: (date: Date) => void;
  setSelectedClass: (classId: string | null) => void;
  setSelectedSchedule: (scheduleId: string | null) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedDate: new Date(),
  selectedClassId: null,
  selectedScheduleId: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedClass: (classId) => set({ selectedClassId: classId }),
  setSelectedSchedule: (scheduleId) => set({ selectedScheduleId: scheduleId }),
  reset: () => set({ selectedClassId: null, selectedScheduleId: null }),
}));
