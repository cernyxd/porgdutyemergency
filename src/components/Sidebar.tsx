import React, { useState, useEffect } from 'react';
import { Colleague, BookableSlot } from '../types';
import { User, Users, Plus, ShieldAlert, Award, Clock, CalendarDays, CheckCircle2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  colleagues: Colleague[];
  activeColleagueId: string;
  onSelectColleague: (id: string) => void;
  onAddColleague: (name: string, email: string) => void;
  slots: BookableSlot[];
  cooldownUntil: number | null; // epoch timestamp in ms, or null
  isAdmin: boolean;
  onSignOut: () => void;
}

export default function Sidebar({
  colleagues,
  activeColleagueId,
  onSelectColleague,
  onAddColleague,
  slots,
  cooldownUntil,
  isAdmin,
  onSignOut
}: SidebarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    onAddColleague(newName.trim(), newEmail.trim());
    setNewName('');
    setNewEmail('');
    setIsAdding(false);
  };

  const progressPercentage = timeLeft > 0 ? (timeLeft / 30) * 100 : 0;

  return (
    <aside className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col h-full" id="sidebar-container">
      {/* App Brand Header */}
      <div className="p-6 border-b border-slate-100" id="sidebar-header">
        <div className="flex items-center space-x-3 text-indigo-600 mb-1">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900">PORG Duty & Emergency</span>
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
          onClick={onSignOut}
          className="mt-2 w-full px-3 py-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50"
          id="btn-sign-out"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          Sign Out of Account
        </button>
      </div>



      {/* Admin Switcher / Form */}
      {isAdmin ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" id="colleague-switcher">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Switch Colleague</p>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-indigo-100 cursor-pointer"
              title="Add colleague"
              id="btn-toggle-add-colleague"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add Colleague Form */}
          <AnimatePresence>
            {isAdding && (
              <motion.form
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                onSubmit={handleSubmit}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-3 overflow-hidden"
                id="add-colleague-form"
              >
                <h4 className="text-[10px] font-bold text-slate-700 uppercase">Add New Teacher</h4>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div className="flex gap-2 justify-end text-[10px]">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    Save Teacher
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Colleague List */}
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
            {colleagues.map(colleague => {
              const isSelected = colleague.id === activeColleagueId;
              return (
                <button
                  key={colleague.id}
                  onClick={() => onSelectColleague(colleague.id)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all group cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 ring-1 ring-indigo-200'
                      : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                  }`}
                  id={`colleague-select-${colleague.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}>
                      {colleague.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">{colleague.name}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6 flex flex-col justify-end text-center bg-slate-50/30">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Logged In Session</p>
          <p className="text-xs text-slate-500 mt-1 leading-normal font-medium">
            Standard teacher privileges apply. Profile-switching is restricted.
          </p>
        </div>
      )}
    </aside>
  );
}
