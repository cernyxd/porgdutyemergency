export type SlotType = 'duty' | 'emergency';

export interface BookableSlot {
  id: string;
  type: SlotType;
  title: string;
  date: string;
  time: string; // e.g. "08:00 - 08:45" or "Period 1"
  location: string;
  description?: string;
  bookedBy: string | null; // colleague ID or null
  bookedAt: string | null; // ISO string or null
  maxCapacity?: number; // max capacity of teachers who can book this
  bookedByList?: string[]; // list of teacher IDs who booked this
}

export interface Colleague {
  id: string;
  name: string;
  email: string;
  department: string;
}

export interface CooldownState {
  [colleagueId: string]: number; // Maps colleague ID to epoch timestamp (ms) when cooldown ends
}

export interface SignupControlSettings {
  dutyClosed: boolean;
  dutyOpenAt: number | null;
  emergencyClosed: boolean;
  emergencyOpenAt: number | null;
}
