import React from 'react';
import { BookableSlot } from '../types';
import { Calendar, Clock, MapPin, Trash2, Award, ShieldAlert, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MyBookingsProps {
  slots: BookableSlot[];
  activeColleagueId: string;
  onCancelBooking: (slotId: string) => void;
}

export default function MyBookings({
  slots,
  activeColleagueId,
  onCancelBooking
}: MyBookingsProps) {
  
  // Filter slots booked by the active colleague
  const myBookings = slots.filter(s => (s.bookedByList || (s.bookedBy ? [s.bookedBy] : [])).includes(activeColleagueId));

  // Group by date
  const groupedBookings = myBookings.reduce((groups, booking) => {
    const date = booking.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(booking);
    return groups;
  }, {} as { [key: string]: BookableSlot[] });

  const sortedDates = Object.keys(groupedBookings).sort();

  return (
    <div className="flex flex-col gap-6" id="my-bookings-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="my-bookings-header">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-slate-800">My Schedule & Bookings</h2>
        </div>

        <div className="bg-indigo-50 border border-indigo-100/80 rounded-2xl px-5 py-3 flex items-center gap-3 shrink-0">
          <Calendar className="h-6 w-6 text-indigo-600 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Reserved Shifts</p>
            <p className="text-lg font-bold text-slate-800 font-mono mt-0.5">{myBookings.length} slots booked</p>
          </div>
        </div>
      </div>

      {/* Main Body */}
      {myBookings.length > 0 ? (
        <div className="flex flex-col gap-6" id="my-bookings-timeline">
          {sortedDates.map(date => (
            <div key={date} className="flex flex-col gap-3">

              {/* Group Slots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedBookings[date].map(slot => (
                  <motion.div
                     layout
                     initial={{ opacity: 0, scale: 0.98 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     key={slot.id}
                     className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:shadow-sm transition-all"
                     id={`my-booking-${slot.id}`}
                  >
                    <div>
                      {/* Top bar */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                          slot.type === 'duty' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}>
                          {slot.type}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="font-sans font-bold text-slate-800 text-sm mb-2">{slot.title}</h4>
                      
                      {/* Desc */}
                      {slot.description && (
                        <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                          {slot.description}
                        </p>
                      )}
                    </div>

                    {/* Meta information & Cancel button */}
                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3 mt-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1 text-slate-500 text-xs min-w-0">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-mono">{slot.time}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-xs min-w-0">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{slot.location}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onCancelBooking(slot.id)}
                        className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 hover:border-rose-600 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 font-bold text-xs"
                        title="Cancel booking"
                        id={`btn-cancel-${slot.id}`}
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-2xl" id="my-bookings-empty">
          <div className="bg-slate-50 text-slate-400 p-4 rounded-full border border-slate-100 mb-4">
            <CheckSquare className="h-8 w-8" />
          </div>
          <h3 className="font-semibold text-slate-700 text-base">You haven't booked any slots yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
            Go to the **Book Slots** tab to view the available duties and emergency cover lessons, select the ones you want, and start building your schedule.
          </p>
        </div>
      )}
    </div>
  );
}
