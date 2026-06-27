import React, { useState, useEffect } from 'react';
import { Colleague, BookableSlot } from '../types';
import { ShieldAlert, Clock, LogOut, Moon, Sun, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  colleagues: Colleague[];
  activeColleagueId: string;
  slots: BookableSlot[];
  cooldownUntil: number | null;
  isAdmin: boolean;
  onSignOut: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  colleagues,
  activeColleagueId,
  slots,
  cooldownUntil,
  isAdmin,
  onSignOut,
  isDarkMode,
  onToggleTheme,
  mobileOpen,
  onCloseMobile
}: SidebarProps) {
  const [timeLeft, setTimeLeft] = useState(0);

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




      </aside>
    </>
  );
}
