import React, { useEffect, useState, useMemo } from 'react';
import { BookableSlot, Colleague, SignupControlSettings, SlotType } from '../types';
import { Search, Clock, Calendar, Check, X, AlertCircle, Inbox, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookingListProps {
  slots: BookableSlot[];
  colleagues: Colleague[];
  activeColleagueId: string;
  cooldownUntil: number | null; // epoch timestamp in ms, or null
  signupSettings: SignupControlSettings;
  onBookSlot: (slotId: string) => void;
  onCancelBooking: (slotId: string) => void;
}

export default function BookingList({
  slots,
  colleagues,
  activeColleagueId,
  cooldownUntil,
  signupSettings,
  onBookSlot,
  onCancelBooking
}: BookingListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('all'); // 'all', 'monday', 'tuesday', etc.
  const [timeFilter, setTimeFilter] = useState<string>('all'); // 'all', 'morning', 'midday', 'afternoon'
  const [selectedLocation, setSelectedLocation] = useState<string>('all'); // 'all', or specific location
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'booked-by-me'>('all');
  const [activeTypeTab, setActiveTypeTab] = useState<SlotType>('duty');
  const [nowTs, setNowTs] = useState(Date.now());

  const isCooldownActive = cooldownUntil ? Date.now() < cooldownUntil : false;

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getSignupState = (type: SlotType) => {
    const isClosed = type === 'duty' ? signupSettings.dutyClosed : signupSettings.emergencyClosed;
    const openAt = type === 'duty' ? signupSettings.dutyOpenAt : signupSettings.emergencyOpenAt;
    const isOpen = !isClosed || (openAt !== null && nowTs >= openAt);
    return { isOpen, openAt };
  };

  const formatCountdown = (targetTs: number) => {
    const totalSeconds = Math.max(0, Math.floor((targetTs - nowTs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Format date to determine weekday name
  const getDayName = (dateStr: string) => {
    const cleanDate = dateStr.trim();
    
    // Explicit map for our known default dates
    if (cleanDate === '2026-09-07' || cleanDate.includes('2026-09-07')) return 'Monday';
    if (cleanDate === '2026-09-08' || cleanDate.includes('2026-09-08')) return 'Tuesday';
    if (cleanDate === '2026-09-09' || cleanDate.includes('2026-09-09')) return 'Wednesday';
    if (cleanDate === '2026-09-10' || cleanDate.includes('2026-09-10')) return 'Thursday';
    if (cleanDate === '2026-09-11' || cleanDate.includes('2026-09-11')) return 'Friday';

    // Check if it is a YYYY-MM-DD string and parse it safely in UTC!
    const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const day = parseInt(match[3], 10);
      
      const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0)); // Set noon UTC to be safe
      return dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    }

    // Direct day-name substring fallback
    const lower = cleanDate.toLowerCase();
    if (lower.includes('mon')) return 'Monday';
    if (lower.includes('tue')) return 'Tuesday';
    if (lower.includes('wed')) return 'Wednesday';
    if (lower.includes('thu')) return 'Thursday';
    if (lower.includes('fri')) return 'Friday';

    // Standard fallback
    const dateObj = new Date(cleanDate);
    if (isNaN(dateObj.getTime())) return 'Monday';
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  };

  // Get unique locations dynamically for active type tab to avoid empty pills
  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    slots.forEach(slot => {
      if (slot.type === activeTypeTab) {
        const list = slot.bookedByList || (slot.bookedBy ? [slot.bookedBy] : []);
        const maxCap = slot.maxCapacity || 1;
        const isFull = list.length >= maxCap;
        const bookedByMe = list.includes(activeColleagueId);
        
        // Hide if full and NOT booked by me
        if (isFull && !bookedByMe) {
          return;
        }
        locs.add(slot.location);
      }
    });
    return Array.from(locs).sort();
  }, [slots, activeTypeTab, activeColleagueId]);

  // Get unique times dynamically for active type tab to avoid empty pills
  const uniqueTimes = useMemo(() => {
    const times = new Set<string>();
    slots.forEach(slot => {
      if (slot.type === activeTypeTab) {
        const list = slot.bookedByList || (slot.bookedBy ? [slot.bookedBy] : []);
        const maxCap = slot.maxCapacity || 1;
        const isFull = list.length >= maxCap;
        const bookedByMe = list.includes(activeColleagueId);
        if (isFull && !bookedByMe) {
          return;
        }
        times.add(slot.time);
      }
    });
    // Sort times chronologically
    return Array.from(times).sort((a, b) => {
      const timeA = a.split('-')[0].trim();
      const timeB = b.split('-')[0].trim();
      return timeA.localeCompare(timeB);
    });
  }, [slots, activeTypeTab, activeColleagueId]);

  // Filter slots based on state
  const filteredSlots = useMemo(() => {
    return slots.filter(slot => {
      // 1. MUST match the current active type tab ('duty' or 'emergency')
      if (slot.type !== activeTypeTab) return false;

      const list = slot.bookedByList || (slot.bookedBy ? [slot.bookedBy] : []);
      const maxCap = slot.maxCapacity || 1;
      const isFull = list.length >= maxCap;
      const bookedByMe = list.includes(activeColleagueId);

      // 2. Hide slots booked by other colleagues completely if they are full and we didn't book them
      if (isFull && !bookedByMe) {
        return false;
      }

      // 3. Search term filter (compares title and location/room)
      const matchesSearch = 
        slot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.location.toLowerCase().includes(searchTerm.toLowerCase());

      // 4. Weekday filter
      const dayName = getDayName(slot.date);
      const matchesDay = selectedDay === 'all' || dayName.toLowerCase() === selectedDay.toLowerCase();

      // 5. Place filter
      const matchesLocation = selectedLocation === 'all' || slot.location.toLowerCase() === selectedLocation.toLowerCase();

      // 6. Time filter (exact dynamic match)
      const matchesTime = timeFilter === 'all' || slot.time.toLowerCase() === timeFilter.toLowerCase();

      // 7. Booking status filter
      let matchesStatus = true;
      if (statusFilter === 'available') {
        matchesStatus = !isFull;
      } else if (statusFilter === 'booked-by-me') {
        matchesStatus = bookedByMe;
      }

      return matchesSearch && matchesDay && matchesLocation && matchesTime && matchesStatus;
    });
  }, [slots, activeTypeTab, searchTerm, selectedDay, selectedLocation, timeFilter, statusFilter, activeColleagueId]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="flex flex-col gap-5" id="booking-list-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3" id="booking-list-header">
        <div className="md:flex-1">
          <h2 className="text-lg font-bold font-sans tracking-tight text-slate-800">Available Cover & Duties</h2>
          <p className="text-xs text-slate-500">
            Bookings are subject to a fair-share 30s cooldown.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(['duty', 'emergency'] as const).map((type) => {
              const state = getSignupState(type);
              const label = type === 'duty' ? 'Duties' : 'Emergency';
              return (
                <span
                  key={type}
                  className={`text-[10px] px-2 py-1 rounded-md font-bold border ${
                    state.isOpen
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}
                >
                  {state.isOpen
                    ? `${label}: Open`
                    : state.openAt
                    ? `${label}: Opens in ${formatCountdown(state.openAt)}`
                    : `${label}: Closed`}
                </span>
              );
            })}
          </div>
        </div>

        {/* Tab switch between Duties and Emergencies */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-center md:mx-auto shadow-sm" id="type-tabs">
          <button
            onClick={() => {
              setActiveTypeTab('duty');
              setSelectedLocation('all'); // reset location filter on tab switch to avoid zero matches
              setTimeFilter('all'); // reset time filter on tab switch to avoid zero matches
            }}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTypeTab === 'duty'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Duties
          </button>
          <button
            onClick={() => {
              setActiveTypeTab('emergency');
              setSelectedLocation('all'); // reset location filter on tab switch to avoid zero matches
              setTimeFilter('all'); // reset time filter on tab switch to avoid zero matches
            }}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTypeTab === 'emergency'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Emergency Cover
          </button>
        </div>

        <div className="hidden md:block md:flex-1" aria-hidden="true"></div>
      </div>

      {/* Filter and Query Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm" id="filter-controls-card">
        
        {/* Row 1: Search and Status toggle pills */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b border-slate-100 pb-4">
          <div className="relative md:col-span-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search by subject, room, or area...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
            />
          </div>

          <div className="md:col-span-6 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Status:</span>
            {(['all', 'available', 'booked-by-me'] as const).map(status => {
              const label = status === 'all' ? 'Show All' : status === 'available' ? 'Available Only' : 'My Bookings';
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                    statusFilter === status
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Monday-Friday Weekday Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 border-b border-slate-100 pb-3.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 w-20 shrink-0">Filter Day:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedDay('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                selectedDay === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
              }`}
            >
              All Days
            </button>
            {daysOfWeek.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                  selectedDay.toLowerCase() === day.toLowerCase()
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Time Block Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 border-b border-slate-100 pb-3.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 w-20 shrink-0">Filter Time:</span>
          <div className="flex flex-wrap gap-1.5 max-h-[130px] overflow-y-auto pr-1 flex-1">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                timeFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
              }`}
            >
              All Times
            </button>
            {uniqueTimes.map(timeStr => (
              <button
                key={timeStr}
                onClick={() => setTimeFilter(timeStr)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                  timeFilter.toLowerCase() === timeStr.toLowerCase()
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
                }`}
              >
                🕒 {timeStr}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4: Place / Location Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 w-20 shrink-0 sm:pt-1">Filter Place:</span>
          <div className="flex flex-wrap gap-1.5 max-h-[130px] overflow-y-auto pr-1 flex-1">
            <button
              onClick={() => setSelectedLocation('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border cursor-pointer ${
                selectedLocation === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
              }`}
            >
              All Places
            </button>
            {uniqueLocations.map(loc => (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border cursor-pointer ${
                  selectedLocation.toLowerCase() === loc.toLowerCase()
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
                }`}
              >
                📍 {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Counter Display and Active Filters Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-3 mt-1 gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-medium">
            <span>Active filters:</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700">
              Day: {selectedDay === 'all' ? 'All' : selectedDay}
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700">
              Time: {timeFilter === 'all' ? 'All' : timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700 truncate max-w-[150px]">
              Place: {selectedLocation === 'all' ? 'All' : selectedLocation}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg self-end sm:self-auto">
            Showing {filteredSlots.length} item{filteredSlots.length !== 1 ? 's' : ''}
          </div>
        </div>

      </div>

      {/* Booking Cooldown Alarm */}
      {isCooldownActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5 items-start animate-pulse" id="cooldown-notice">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">Fair-Share Booking Lock</h4>
            <p className="text-[11px] text-amber-700 leading-normal mt-0.5">
              Please wait for your active cooldown timer to finish before securing another slot.
            </p>
          </div>
        </div>
      )}

      {!getSignupState(activeTypeTab).isOpen && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex gap-2.5 items-start" id="signup-closed-notice">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-900">Sign-ups are currently closed</h4>
            <p className="text-[11px] text-rose-700 leading-normal mt-0.5">
              {getSignupState(activeTypeTab).openAt
                ? `This opens in ${formatCountdown(getSignupState(activeTypeTab).openAt as number)}.`
                : 'Please wait for admin to open this signup window.'}
            </p>
          </div>
        </div>
      )}

      {/* High-Density Tabular Display */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" id="booking-grid-table-container">
        {filteredSlots.length > 0 ? (
          <>
            {/* Mobile card list */}
            <div className="md:hidden flex flex-col divide-y divide-slate-100">
              {filteredSlots.map(slot => {
                const list = slot.bookedByList || (slot.bookedBy ? [slot.bookedBy] : []);
                const maxCap = slot.maxCapacity || 1;
                const isBookedByMe = list.includes(activeColleagueId);
                const dayName = getDayName(slot.date);
                const spotsLeft = Math.max(0, maxCap - list.length);
                const signupsOpen = getSignupState(slot.type).isOpen;

                return (
                  <div key={slot.id} className="p-4 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${
                            slot.type === 'duty'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {slot.type}
                          </span>
                          {isBookedByMe && (
                            <span className="text-indigo-600 font-bold flex items-center gap-1 text-[10px]">
                              <Check className="h-3 w-3" /> Booked
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm text-slate-900 leading-tight truncate">{slot.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{slot.location}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-slate-700">{dayName}</span>
                        <span className="text-[11px] font-mono text-slate-500">{slot.time}</span>
                        {maxCap > 1 && (
                          <span className="text-[10px] text-indigo-600 font-semibold">
                            {list.length}/{maxCap} booked
                          </span>
                        )}
                      </div>

                      {isBookedByMe ? (
                        <button
                          onClick={() => onCancelBooking(slot.id)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all border cancel-slot-btn cursor-pointer shrink-0"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => onBookSlot(slot.id)}
                          disabled={isCooldownActive || spotsLeft === 0 || !signupsOpen}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all border shrink-0 ${
                            isCooldownActive || spotsLeft === 0 || !signupsOpen
                              ? 'claim-slot-btn-disabled cursor-not-allowed'
                              : 'claim-slot-btn cursor-pointer'
                          }`}
                        >
                          {!signupsOpen ? 'Closed' : spotsLeft === 0 ? 'Full' : 'Claim Slot'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-3.5 pl-5">Day of Week</th>
                    <th className="p-3.5">Time Slot</th>
                    <th className="p-3.5">Room / Location</th>
                    <th className="p-3.5">Duty / Cover Role</th>
                    <th className="p-3.5 pr-5 text-right">Status & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredSlots.map(slot => {
                    const list = slot.bookedByList || (slot.bookedBy ? [slot.bookedBy] : []);
                    const maxCap = slot.maxCapacity || 1;
                    const isBookedByMe = list.includes(activeColleagueId);
                    const dayName = getDayName(slot.date);
                    const spotsLeft = Math.max(0, maxCap - list.length);
                    const signupsOpen = getSignupState(slot.type).isOpen;

                    return (
                      <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-slate-900">{dayName}</td>
                        <td className="p-3.5 font-mono text-slate-600 font-semibold">{slot.time}</td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200/50">
                            {slot.location}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-800">
                          <div className="flex flex-col">
                            <span className="font-bold">{slot.title}</span>
                            {maxCap > 1 && (
                              <span className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                Capacity: {list.length}/{maxCap} booked ({spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          {isBookedByMe ? (
                            <div className="flex items-center justify-end gap-2.5">
                              <span className="text-indigo-600 font-bold flex items-center gap-1 text-[11px]">
                                <Check className="h-3.5 w-3.5 font-extrabold" />
                                Booked by You
                              </span>
                              <button
                                onClick={() => onCancelBooking(slot.id)}
                                className="px-3.5 py-2 min-w-[5.5rem] rounded-lg text-[11px] font-bold tracking-tight transition-all border cancel-slot-btn cursor-pointer text-center"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => onBookSlot(slot.id)}
                              disabled={isCooldownActive || spotsLeft === 0 || !signupsOpen}
                              className={`px-3.5 py-2 min-w-[5.5rem] rounded-lg text-[11px] font-bold tracking-tight transition-all border text-center ${
                                isCooldownActive || spotsLeft === 0 || !signupsOpen
                                  ? 'claim-slot-btn-disabled cursor-not-allowed'
                                  : 'claim-slot-btn cursor-pointer'
                              }`}
                            >
                              {!signupsOpen ? 'Closed' : spotsLeft === 0 ? 'Full' : 'Claim Slot'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-14 flex flex-col items-center justify-center text-center p-6 bg-slate-50/30" id="table-empty-state">
            <div className="bg-white text-slate-300 p-3.5 rounded-full border border-slate-100 mb-3 shadow-sm">
              <Inbox className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Available Schedule items</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-0.5 leading-relaxed">
              No matching {activeTypeTab === 'duty' ? 'duties' : 'emergency cover slots'} were found with your current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
