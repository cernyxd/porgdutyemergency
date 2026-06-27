import { BookableSlot, Colleague } from './types';

export const DEFAULT_COLLEAGUES: Colleague[] = [
  { id: '1', name: 'Ondrej Cerny', email: 'cernyondrej@novyporg.cz', department: 'Mathematics & IT' },
  { id: '2', name: 'Alice Smith', email: 'alice.smith@school.edu', department: 'Languages' },
  { id: '3', name: 'John Doe', email: 'john.doe@school.edu', department: 'Sciences' },
  { id: '4', name: 'Emma Watson', email: 'emma.watson@school.edu', department: 'Humanities' },
  { id: '5', name: 'Michael Jordan', email: 'michael.jordan@school.edu', department: 'PE & Arts' }
];

// Define raw base duty templates from user CSV
interface BaseDuty {
  idSuffix: string;
  location: string;
  from: string;
  to: string;
  duration: number;
  capacity: number;
}

const DUTY_TEMPLATES: BaseDuty[] = [
  { idSuffix: '01', location: 'Canteen UP', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '02', location: 'Canteen UP', from: '11:20', to: '12:10', duration: 50, capacity: 2 },
  { idSuffix: '03', location: 'Canteen UP', from: '12:15', to: '13:05', duration: 50, capacity: 2 },
  { idSuffix: '04', location: 'Canteen UP', from: '13:05', to: '13:55', duration: 50, capacity: 2 },
  { idSuffix: '05', location: 'Canteen UP', from: '13:55', to: '14:55', duration: 60, capacity: 2 },
  { idSuffix: '06', location: 'Canteen Down', from: '12:15', to: '13:05', duration: 50, capacity: 2 },
  { idSuffix: '07', location: 'Canteen Down', from: '13:05', to: '13:55', duration: 50, capacity: 2 },
  { idSuffix: '08', location: 'A1', from: '08:00', to: '08:20', duration: 20, capacity: 1 },
  { idSuffix: '09', location: 'A1', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '10', location: 'A1', from: '12:10', to: '12:20', duration: 10, capacity: 1 },
  { idSuffix: '11', location: 'A1', from: '13:10', to: '13:55', duration: 45, capacity: 2 },
  { idSuffix: '12', location: 'A2', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '13', location: 'A2', from: '12:10', to: '12:20', duration: 10, capacity: 1 },
  { idSuffix: '14', location: 'A3', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '15', location: 'A3', from: '12:10', to: '12:20', duration: 10, capacity: 1 },
  { idSuffix: '16', location: 'B', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '17', location: 'B', from: '12:10', to: '12:20', duration: 10, capacity: 1 },
  { idSuffix: '18', location: 'C', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '19', location: 'D', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '20', location: 'E1', from: '08:00', to: '08:20', duration: 20, capacity: 1 },
  { idSuffix: '21', location: 'E1', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '22', location: 'E1', from: '12:10', to: '12:20', duration: 10, capacity: 1 },
  { idSuffix: '23', location: 'E2', from: '08:00', to: '08:20', duration: 20, capacity: 1 },
  { idSuffix: '24', location: 'E2', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '25', location: 'E3', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '26', location: 'Brána', from: '08:00', to: '08:20', duration: 20, capacity: 1 },
  { idSuffix: '27', location: 'B-C outdoor sports ground', from: '11:20', to: '12:10', duration: 30, capacity: 2 },
  { idSuffix: '28', location: 'C-D outdoor sports ground', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '29', location: 'Park/big gym', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '30', location: 'Football pitch', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
  { idSuffix: '31', location: 'Elementary playground', from: '10:05', to: '10:35', duration: 30, capacity: 2 },
];

const DAYS_MAPPING = [
  { dayName: 'Monday', prefix: 'MON', date: '2026-09-07' },
  { dayName: 'Tuesday', prefix: 'TUE', date: '2026-09-08' },
  { dayName: 'Wednesday', prefix: 'WED', date: '2026-09-09' },
  { dayName: 'Thursday', prefix: 'THU', date: '2026-09-10' },
  { dayName: 'Friday', prefix: 'FRI', date: '2026-09-11' },
];

// Define emergency cover templates per day of the week
const EMERGENCY_COVERS_PER_DAY: { [key: string]: { title: string; time: string; location: string; desc: string }[] } = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: []
};

const generateInitialSlots = (): BookableSlot[] => {
  const generated: BookableSlot[] = [];

  DAYS_MAPPING.forEach(day => {
    // 1. Generate Duties from template
    DUTY_TEMPLATES.forEach(tmpl => {
      const timeStr = `${tmpl.from} - ${tmpl.to}`;

      if (tmpl.capacity === 2) {
        // Create Slot A
        generated.push({
          id: `${day.prefix}_DUTY_${tmpl.idSuffix}_A`,
          type: 'duty',
          title: `${tmpl.location} Supervision (A)`,
          date: day.date,
          time: timeStr,
          location: tmpl.location,
          description: '',
          bookedBy: null,
          bookedAt: null,
          maxCapacity: 1,
          bookedByList: []
        });

        // Create Slot B
        generated.push({
          id: `${day.prefix}_DUTY_${tmpl.idSuffix}_B`,
          type: 'duty',
          title: `${tmpl.location} Supervision (B)`,
          date: day.date,
          time: timeStr,
          location: tmpl.location,
          description: '',
          bookedBy: null,
          bookedAt: null,
          maxCapacity: 1,
          bookedByList: []
        });
      } else {
        // Capacity = 1
        generated.push({
          id: `${day.prefix}_DUTY_${tmpl.idSuffix}`,
          type: 'duty',
          title: `${tmpl.location} Supervision`,
          date: day.date,
          time: timeStr,
          location: tmpl.location,
          description: '',
          bookedBy: null,
          bookedAt: null,
          maxCapacity: 1,
          bookedByList: []
        });
      }
    });
  });

  return generated;
};

export const DEFAULT_SLOTS = generateInitialSlots();
