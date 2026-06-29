import React, { useState, useEffect } from 'react';
import { Colleague, BookableSlot, SignupControlSettings, SlotType } from '../types';
import { ShieldAlert, Clock, LogOut, Moon, Sun, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  colleagues: Colleague[];
  activeColleagueId: string;
  slots: BookableSlot[];
  cooldownUntil: number | null;
  isAdmin: boolean;
  signupSettings: SignupControlSettings;
  onSignOut: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSignupsNow: (type: SlotType) => void;
  onCloseSignupsNow: (type: SlotType) => void;
  onScheduleSignupsOpen: (type: SlotType, openAt: number) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  colleagues,
  activeColleagueId,
  slots,
  cooldownUntil,
  isAdmin,
  signupSettings,
  onSignOut,
  isDarkMode,
  onToggleTheme,
  onOpenSignupsNow,
  onCloseSignupsNow,
  onScheduleSignupsOpen,
  mobileOpen,
  onCloseMobile
}: SidebarProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [dutyOpenDateInput, setDutyOpenDateInput] = useState('');
  const [dutyOpenTimeInput, setDutyOpenTimeInput] = useState('20:00');
  const [emergencyOpenDateInput, setEmergencyOpenDateInput] = useState('');
  const [emergencyOpenTimeInput, setEmergencyOpenTimeInput] = useState('20:00');

  const activeColleague = colleagues.find(c => c.id === activeColleagueId);

  // Compute stats
  const activeBookings = slots.filter(s => (s.bookedByList || (s.bookedBy ? [s.bookedBy] : [])).includes(activeColleagueId));
  const dutyCount = activeBookings.filter(s => s.type === 'duty').length;
  const emergencyCount = activeBookings.filter(s => s.type === 'emergency').length;

  // Handle countdown timer
  useEffect(() => {
    if (!cooldownUntil) {
      setTimeLeft(0);
      return;
    }

    const checkTime = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
      setTimeLeft(diff);
    };

    checkTime();
    const interval = setInterval(checkTime, 200);

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const progressPercentage = timeLeft > 0 ? (timeLeft / 30) * 100 : 0;

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const toDateInput = (ts: number | null) => {
      if (!ts) return '';
      const d = new Date(ts);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    };

    const toTimeInput = (ts: number | null) => {
      if (!ts) return '20:00';
      const d = new Date(ts);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    };

    setDutyOpenDateInput(toDateInput(signupSettings.dutyOpenAt));
    setDutyOpenTimeInput(toTimeInput(signupSettings.dutyOpenAt));
    setEmergencyOpenDateInput(toDateInput(signupSettings.emergencyOpenAt));
    setEmergencyOpenTimeInput(toTimeInput(signupSettings.emergencyOpenAt));
  }, [signupSettings.dutyOpenAt, signupSettings.emergencyOpenAt]);

  const getSignupState = (type: SlotType) => {
    const isClosed = type === 'duty' ? signupSettings.dutyClosed : signupSettings.emergencyClosed;
    const openAt = type === 'duty' ? signupSettings.dutyOpenAt : signupSettings.emergencyOpenAt;
    const isOpen = !isClosed || (openAt !== null && nowTs >= openAt);
    return { isOpen, openAt };
  };

  const formatRemaining = (targetTs: number) => {
    const totalSeconds = Math.max(0, Math.floor((targetTs - nowTs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const handleSchedule = (type: SlotType) => {
    const dateRaw = type === 'duty' ? dutyOpenDateInput : emergencyOpenDateInput;
    const timeRaw = type === 'duty' ? dutyOpenTimeInput : emergencyOpenTimeInput;
    if (!dateRaw || !timeRaw) return;

    const ts = new Date(`${dateRaw}T${timeRaw}`).getTime();
    if (Number.isNaN(ts)) return;
    onScheduleSignupsOpen(type, ts);
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:flex lg:flex-col lg:h-full lg:w-80
          bg-white border-r border-slate-200 flex flex-col h-full
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        id="sidebar-container"
      >
      {/* App Brand Header */}
      <div className="p-5 border-b border-slate-100 shrink-0" id="sidebar-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-indigo-600">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm">
              <img
                src="/porg_logo_rgb_favicon_512x512.svg"
                alt="PORG logo"
                className="w-full h-full object-contain app-logo"
              />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">PORG Duty & Emergency</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Colleague Profile Card */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4" id="sidebar-profile">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teacher Profile</span>
          {isAdmin && (
            <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1">
              <ShieldAlert className="h-2.5 w-2.5" />
              Admin
            </span>
          )}
        </div>
        
        {activeColleague ? (
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              {activeColleague.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-slate-800 text-sm truncate">{activeColleague.name}</h2>
              <p className="text-[11px] text-slate-500 truncate mb-1">{activeColleague.email}</p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">No colleague profile selected</div>
        )}

        {/* Cooldown Lock Display */}
        <AnimatePresence>
          {timeLeft > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
              id="cooldown-container"
            >
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-amber-800">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5 animate-spin-slow text-amber-600" />
                    Cooldown Active
                  </div>
                  <span className="text-xs font-bold text-amber-800 font-mono">
                    {timeLeft}s
                  </span>
                </div>
                
                <div className="overflow-hidden h-1.5 text-xs flex rounded bg-amber-100">
                  <motion.div 
                    style={{ width: `${progressPercentage}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500 transition-all duration-200"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign Out Button */}
        <button
          onClick={onToggleTheme}
          className="mt-1 w-full px-3 py-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50"
          id="btn-theme-toggle-sidebar"
        >
          {isDarkMode ? <Sun className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <Moon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
          {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>

        <button
          onClick={onSignOut}
          className="mt-2 w-full px-3 py-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50"
          id="btn-sign-out"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          Sign Out of Account
        </button>
      </div>

      {isAdmin && (
        <div className="p-5 border-b border-slate-100 flex flex-col gap-4" id="sidebar-signup-controls">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Admin Signup Controls</h3>
          </div>

          {(['duty', 'emergency'] as const).map((type) => {
            const label = type === 'duty' ? 'Duties' : 'Emergency Cover';
            const state = getSignupState(type);
            const dateInputValue = type === 'duty' ? dutyOpenDateInput : emergencyOpenDateInput;
            const setDateInputValue = type === 'duty' ? setDutyOpenDateInput : setEmergencyOpenDateInput;
            const timeInputValue = type === 'duty' ? dutyOpenTimeInput : emergencyOpenTimeInput;
            const setTimeInputValue = type === 'duty' ? setDutyOpenTimeInput : setEmergencyOpenTimeInput;

            return (
              <div key={type} className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2.5 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">{label}</span>
                  {state.isOpen ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">OPEN</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      {state.openAt ? `Opens in ${formatRemaining(state.openAt)}` : 'CLOSED'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-[1.25fr_1fr] gap-2">
                  <input
                    type="date"
                    value={dateInputValue}
                    onChange={(e) => setDateInputValue(e.target.value)}
                    className="w-full px-2.5 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                  />
                  <input
                    type="time"
                    step={60}
                    value={timeInputValue}
                    onChange={(e) => setTimeInputValue(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => onOpenSignupsNow(type)}
                    className="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Open Now
                  </button>
                  <button
                    onClick={() => onCloseSignupsNow(type)}
                    className="px-2 py-1.5 text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Close Now
                  </button>
                  <button
                    onClick={() => handleSchedule(type)}
                    disabled={!dateInputValue || !timeInputValue}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border cursor-pointer ${
                      dateInputValue && timeInputValue
                        ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Set Time
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}




      </aside>
    </>
  );
}
