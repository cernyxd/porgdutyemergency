import React, { useState, useMemo } from 'react';
import { BookableSlot, Colleague } from '../types';
import { FileDown, Search, Filter, ShieldCheck, Download, AlertCircle, Sparkles, TrendingUp, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface HrExportProps {
  slots: BookableSlot[];
  colleagues: Colleague[];
  adminEmails: string[];
  onUpdateAdmins: (emails: string[]) => void;
}

export default function HrExport({ slots, colleagues, adminEmails, onUpdateAdmins }: HrExportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'duty' | 'emergency'>('all');
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Define BookingRecord type locally
  interface BookingRecord {
    id: string;
    slotId: string;
    colleagueId: string;
    colleagueName: string;
    colleagueEmail: string;
    date: string;
    time: string;
    type: 'duty' | 'emergency';
    title: string;
    location: string;
    bookedAt: string;
  }

  // Find all individual booking records
  const bookingRecords = useMemo(() => {
    const records: BookingRecord[] = [];
    slots.forEach(slot => {
      const list = slot.bookedByList || (slot.bookedBy ? [slot.bookedBy] : []);
      list.forEach(teacherId => {
        const colleague = colleagues.find(c => c.id === teacherId);
        records.push({
          id: `${slot.id}-${teacherId}`,
          slotId: slot.id,
          colleagueId: teacherId,
          colleagueName: colleague ? colleague.name : 'Assigned Teacher',
          colleagueEmail: colleague ? colleague.email : '',
          date: slot.date,
          time: slot.time,
          type: slot.type,
          title: slot.title,
          location: slot.location,
          bookedAt: slot.bookedAt || new Date().toISOString()
        });
      });
    });
    return records;
  }, [slots, colleagues]);

  const totalCapacityCount = useMemo(() => {
    return slots.reduce((sum, s) => sum + (s.maxCapacity || 1), 0);
  }, [slots]);

  const bookedSlotsCount = bookingRecords.length;
  const unbookedSlotsCount = Math.max(0, totalCapacityCount - bookedSlotsCount);
  const fillRate = totalCapacityCount > 0 ? Math.round((bookedSlotsCount / totalCapacityCount) * 100) : 0;

  // Filter booked slots based on search and type
  const filteredBookedSlots = useMemo(() => {
    return bookingRecords.filter(record => {
      const matchesSearch = 
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.colleagueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.colleagueEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.date.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || record.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [bookingRecords, searchTerm, filterType]);

  // Handle download of CSV
  const handleExportCsv = () => {
    try {
      if (bookingRecords.length === 0) {
        alert("There are no bookings made yet to export.");
        return;
      }

      const getDayOfWeek = (dateStr: string) => {
        const cleanDate = dateStr.trim();
        if (cleanDate === '2026-09-07' || cleanDate.includes('2026-09-07')) return 'Monday';
        if (cleanDate === '2026-09-08' || cleanDate.includes('2026-09-08')) return 'Tuesday';
        if (cleanDate === '2026-09-09' || cleanDate.includes('2026-09-09')) return 'Wednesday';
        if (cleanDate === '2026-09-10' || cleanDate.includes('2026-09-10')) return 'Thursday';
        if (cleanDate === '2026-09-11' || cleanDate.includes('2026-09-11')) return 'Friday';

        const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          const year = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const day = parseInt(match[3], 10);
          const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));
          return dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        }

        const lower = cleanDate.toLowerCase();
        if (lower.includes('mon')) return 'Monday';
        if (lower.includes('tue')) return 'Tuesday';
        if (lower.includes('wed')) return 'Wednesday';
        if (lower.includes('thu')) return 'Thursday';
        if (lower.includes('fri')) return 'Friday';

        const dateObj = new Date(cleanDate);
        if (isNaN(dateObj.getTime())) return 'Monday';
        return dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      };

      // Headers for HR CSV export
      const headers = [
        'Day of Week',
        'Time Slot',
        'Type',
        'Title',
        'Room/Location',
        'Assigned Colleague Name',
        'Colleague Email'
      ];

      const csvRows = [headers.join(',')];

      bookingRecords.forEach(record => {
        // Escape quotes and fields to prevent syntax issues
        const escapeCsvField = (field: string | null | undefined) => {
          if (field === null || field === undefined) return '';
          const str = String(field);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const row = [
          escapeCsvField(getDayOfWeek(record.date)),
          escapeCsvField(record.time),
          escapeCsvField(record.type.toUpperCase()),
          escapeCsvField(record.title),
          escapeCsvField(record.location),
          escapeCsvField(record.colleagueName),
          escapeCsvField(record.colleagueEmail)
        ];

        csvRows.push(row.join(','));
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      link.setAttribute('href', url);
      link.setAttribute('download', `school_schedule_assignments_export_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error exporting CSV: ", e);
    }
  };

  return (
    <div className="flex flex-col gap-6" id="hr-export-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5" id="hr-header">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-slate-800">HR Assignment Portal</h2>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={bookingRecords.length === 0}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow hover:shadow-md flex items-center justify-center gap-2 ${
            bookingRecords.length > 0
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:scale-[1.01] active:scale-98'
              : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          id="btn-hr-export-csv"
        >
          <FileDown className="h-4.5 w-4.5 shrink-0" />
          Export Assignments (.csv)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="hr-kpis">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fill Rate</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-800 font-mono">{fillRate}%</span>
            <span className="text-xs text-slate-500 font-mono">({bookedSlotsCount}/{totalCapacityCount})</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${fillRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unassigned Slots</span>
          <span className="text-3xl font-extrabold text-rose-600 mt-2 font-mono">{unbookedSlotsCount}</span>
          <span className="text-[10px] text-slate-400 leading-none mt-2 font-medium">Require manual assignment or backup</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bookings</span>
          <span className="text-3xl font-extrabold text-emerald-600 mt-2 font-mono">{bookedSlotsCount}</span>
          <span className="text-[10px] text-slate-400 leading-none mt-2 font-medium">Successfully locked in by staff</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bookings Table Log */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
              Confirmed Booking Log
            </h3>

            {/* Filter Toolbar inside HR table */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by teacher, subject, room, or date..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                />
              </div>

              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 cursor-pointer appearance-none font-medium pr-8 relative"
              >
                <option value="all">All Types</option>
                <option value="duty">Duties</option>
                <option value="emergency">Emergency Cover</option>
              </select>
            </div>

            {/* Table */}
            {filteredBookedSlots.length > 0 ? (
              <div className="overflow-x-auto border border-slate-100 rounded-xl" id="hr-table-container">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-100">
                    <tr>
                      <th className="p-3">Teacher</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Session</th>
                      <th className="p-3">Room</th>
                      <th className="p-3 text-right">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredBookedSlots.map(slot => {
                      return (
                        <tr key={slot.id} className="hover:bg-slate-50/30">
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{slot.colleagueName || 'Assigned'}</span>
                              <span className="text-[10px] text-slate-400">{slot.colleagueEmail}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[10px]">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{slot.date}</span>
                              <span className="text-[10px] text-slate-400">{slot.time}</span>
                            </div>
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 truncate">{slot.title}</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-500 font-mono">{slot.location}</td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                              slot.type === 'duty' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-purple-50 text-purple-700 border border-purple-100'
                            }`}>
                              {slot.type}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center border border-slate-100 rounded-xl bg-slate-50/30" id="hr-table-empty">
                <AlertCircle className="h-6 w-6 text-slate-400 mb-2" />
                <h4 className="font-semibold text-slate-700 text-xs">No matching assignments in ledger</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mt-0.5 leading-relaxed">
                  No staff bookings match your active filters, or colleagues have not booked any items yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Admin Management Widget */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm" id="hr-admin-management">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
              Admin Management
            </h3>
            
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Assign new administrator access by adding Google Workspace emails.
            </p>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (newAdminEmail.trim() && !adminEmails.includes(newAdminEmail.toLowerCase())) {
                  onUpdateAdmins([...adminEmails, newAdminEmail.toLowerCase()]);
                  setNewAdminEmail('');
                }
              }} 
              className="flex gap-2"
            >
              <input
                type="email"
                placeholder="teacher@novyporg.cz"
                required
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
              >
                Add
              </button>
            </form>
            
            <div className="flex flex-col gap-1.5 mt-1 max-h-[150px] overflow-y-auto">
              {adminEmails.map(email => (
                <div key={email} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2">
                  <span className="text-xs font-medium text-slate-700 truncate">{email}</span>
                  {email !== 'cernyondrej@novyporg.cz' && (
                    <button
                      onClick={() => onUpdateAdmins(adminEmails.filter(e => e !== email))}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold px-1.5 py-1 rounded bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
