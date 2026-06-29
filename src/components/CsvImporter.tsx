import React, { useState, useRef } from 'react';
import { BookableSlot } from '../types';
import { Upload, Clipboard, Info, CheckCircle, FileSpreadsheet, Check, AlertTriangle, FileUp } from 'lucide-react';
import { motion } from 'motion/react';

interface CsvImporterProps {
  onImportSlots: (newSlots: BookableSlot[], append: boolean) => void;
  existingCount: number;
  onClearSlots?: () => void;
}

export default function CsvImporter({ onImportSlots, existingCount, onClearSlots }: CsvImporterProps) {
  const [csvText, setCsvText] = useState('');
  const [importedPreview, setImportedPreview] = useState<BookableSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleDutyCsv = `Slot_ID,Day of Week,Area / Location,Time Block From,Time Block To,Duration (Mins),Max Capacity
MON_DUTY_01,Monday,Canteen UP,10:05,10:35,30,2
MON_DUTY_02,Monday,Canteen UP,11:20,12:10,50,2
TUE_DUTY_01,Tuesday,A1,08:00,08:20,20,1`;

  const sampleEmergencyCsv = `Slot_ID,Day of Week,Section,Start Time,End Time,Duration (Mins),Max Capacity
MON_EMERGENCY_01,Monday,Mathematics Grade 10,08:50,09:35,45,1
TUE_EMERGENCY_01,Tuesday,Physics Lab Grade 11,10:00,10:45,45,2`;

  const copyTemplate = (type: 'duty' | 'emergency') => {
    const template = type === 'duty' ? sampleDutyCsv : sampleEmergencyCsv;
    navigator.clipboard.writeText(template.trim());
    setSuccessMsg(`Sample ${type === 'duty' ? 'Duties' : 'Emergency Cover'} template copied to clipboard!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const parseCsv = (text: string) => {
    try {
      setError(null);
      setImportedPreview([]);
      
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        throw new Error("Invalid CSV format. It must have at least a header row and one data row.");
      }

      // Dynamically detect delimiter based on count of delimiter chars in header line
      const headerLine = lines[0];
      let delimiter = ',';
      const commaCount = (headerLine.match(/,/g) || []).length;
      const semicolonCount = (headerLine.match(/;/g) || []).length;
      const tabCount = (headerLine.match(/\t/g) || []).length;
      
      if (semicolonCount > commaCount && semicolonCount > tabCount) {
        delimiter = ';';
      } else if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t';
      }

      // Helper to parse CSV fields respecting quotes (e.g., "Hello, World", Math)
      const parseCsvLine = (line: string, delim: string) => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delim && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result.map(val => val.replace(/^"|"$/g, '').trim()); // Strip wrapping quotes
      };

      const headers = parseCsvLine(lines[0], delimiter).map(h => h.toLowerCase());
      
      // Look for masterDutySlots and masterEmergencySlots column indices
      const slotIdIdx = headers.findIndex(h => h.includes('slot_id') || h.includes('id'));
      const dayOfWeekIdx = headers.findIndex(h => h.includes('day of week') || h.includes('day'));
      
      // Duties specific headers
      const areaLocIdx = headers.findIndex(h => h.includes('area / location') || h.includes('location') || h.includes('area'));
      const timeFromIdx = headers.findIndex(h => h.includes('time block from') || h.includes('from'));
      const timeToIdx = headers.findIndex(h => h.includes('time block to') || h.includes('to'));
      
      // Emergency specific headers
      const sectionIdx = headers.findIndex(h => h.includes('section') || h.includes('subject'));
      const startTimeIdx = headers.findIndex(h => h.includes('start time') || h.includes('start'));
      const endTimeIdx = headers.findIndex(h => h.includes('end time') || h.includes('end'));
      
      // Common headers
      const durationIdx = headers.findIndex(h => h.includes('duration'));
      const maxCapIdx = headers.findIndex(h => h.includes('max capacity') || h.includes('capacity') || h.includes('cap'));
      const ptsIdx = headers.findIndex(h => h.includes('point') || h.includes('weight') || h.includes('pts'));

      // If we see 'section' or 'start time' or 'end time', and we don't see 'area / location', it's likely an emergency cover sheet!
      const isEmergencySheet = sectionIdx !== -1 || startTimeIdx !== -1;
      const isCustomFormat = (dayOfWeekIdx !== -1) && (areaLocIdx !== -1 || sectionIdx !== -1);

      const parsedSlots: BookableSlot[] = [];
      const dayToDateMap: { [key: string]: string } = {
        'monday': '2026-09-07',
        'tuesday': '2026-09-08',
        'wednesday': '2026-09-09',
        'thursday': '2026-09-10',
        'friday': '2026-09-11'
      };

      // Robust day-of-week string mapper to stable dates
      const mapDayToDate = (rawDay: string): string => {
        const clean = rawDay.trim().toLowerCase();
        if (clean.includes('mon') || clean.includes('pon')) return '2026-09-07';
        if (clean.includes('tue') || clean.includes('út')) return '2026-09-08';
        if (clean.includes('wed') || clean.includes('st')) return '2026-09-09';
        if (clean.includes('thu') || clean.includes('čt')) return '2026-09-10';
        if (clean.includes('fri') || clean.includes('pá')) return '2026-09-11';
        
        // Fallback search in dayToDateMap
        for (const key of Object.keys(dayToDateMap)) {
          if (clean.includes(key)) return dayToDateMap[key];
        }
        return '2026-09-07'; // Monday as safe default
      };

      if (isCustomFormat) {
        // Parse using custom masterDutySlots or masterEmergencySlots format
        for (let i = 1; i < lines.length; i++) {
          const row = parseCsvLine(lines[i], delimiter);
          if (row.length < 3) continue;

          const slotIdRaw = slotIdIdx !== -1 && row[slotIdIdx] ? row[slotIdIdx] : `imported-${Date.now()}-${i}`;
          
          // Determine type: emergency or duty
          const isEmergency = isEmergencySheet || slotIdRaw.toLowerCase().includes('emergency') || areaLocIdx === -1;
          const type: 'duty' | 'emergency' = isEmergency ? 'emergency' : 'duty';

          // Determine day and stable date
          const dayOfWeekRaw = dayOfWeekIdx !== -1 && row[dayOfWeekIdx] ? row[dayOfWeekIdx] : 'Monday';
          const date = mapDayToDate(dayOfWeekRaw);

          // Determine location/section
          let location = 'Room TBD';
          if (type === 'duty') {
            if (areaLocIdx !== -1 && row[areaLocIdx]) {
              location = row[areaLocIdx];
            }
          } else {
            // Emergency
            if (sectionIdx !== -1 && row[sectionIdx]) {
              location = row[sectionIdx];
            } else if (areaLocIdx !== -1 && row[areaLocIdx]) {
              location = row[areaLocIdx];
            }
          }

          // Determine time block
          let timeFrom = '08:00';
          let timeTo = '08:20';
          if (type === 'duty') {
            if (timeFromIdx !== -1 && row[timeFromIdx]) timeFrom = row[timeFromIdx];
            if (timeToIdx !== -1 && row[timeToIdx]) timeTo = row[timeToIdx];
          } else {
            if (startTimeIdx !== -1 && row[startTimeIdx]) timeFrom = row[startTimeIdx];
            if (endTimeIdx !== -1 && row[endTimeIdx]) timeTo = row[endTimeIdx];
          }

          // Format time (e.g. 8:00 -> 08:00)
          const formatTime = (t: string) => {
            t = t.trim();
            if (/^\d:\d{2}$/.test(t)) return '0' + t;
            return t;
          };
          const time = `${formatTime(timeFrom)} - ${formatTime(timeTo)}`;

          // Determine duration
          let duration = 30;
          if (durationIdx !== -1 && row[durationIdx]) {
            const parsedDur = parseInt(row[durationIdx], 10);
            if (!isNaN(parsedDur)) duration = parsedDur;
          }

          // Determine capacity
          let maxCapacity = 1;
          if (maxCapIdx !== -1 && row[maxCapIdx]) {
            const parsedCap = parseInt(row[maxCapIdx], 10);
            if (!isNaN(parsedCap)) maxCapacity = parsedCap;
          }

          // Title
          const title = type === 'duty' 
            ? `${location} Supervision` 
            : `${location} Cover`;

          parsedSlots.push({
            id: slotIdRaw,
            type,
            title,
            date,
            time,
            location,
            description: '',
            maxCapacity,
            bookedByList: [],
            bookedBy: null,
            bookedAt: null
          });
        }
      } else {
        // Fallback to the generic fallback parser
        const typeIdx = headers.findIndex(h => h.includes('type'));
        const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('subject') || h.includes('activity') || h.includes('name'));
        const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('day'));
        const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('period') || h.includes('slot'));
        const locIdx = headers.findIndex(h => h.includes('location') || h.includes('room') || h.includes('where'));
        const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('detail') || h.includes('note'));

        if (titleIdx === -1 || dateIdx === -1 || timeIdx === -1) {
          throw new Error("Could not detect column headers. Make sure your sheet has columns like 'Slot_ID', 'Day of Week', 'Area / Location' (or 'Section'), and time columns.");
        }

        for (let i = 1; i < lines.length; i++) {
          const row = parseCsvLine(lines[i], delimiter);
          if (row.length < 3) continue;

          const rawType = typeIdx !== -1 && row[typeIdx] ? row[typeIdx].toLowerCase() : '';
          const isEmergency = rawType.includes('emergency') || rawType.includes('cover') || rawType.includes('lesson');
          const type: 'duty' | 'emergency' = isEmergency ? 'emergency' : 'duty';

          const title = row[titleIdx] || 'Cover/Duty Slot';
          const dateRaw = row[dateIdx] || new Date().toISOString().split('T')[0];
          
          let date = mapDayToDate(dateRaw);
          if (date === '2026-09-07' && dateRaw !== 'Monday' && !dateRaw.toLowerCase().includes('mon')) {
            // It was not a day name, maybe a raw date string
            const dateParsed = Date.parse(dateRaw);
            if (!isNaN(dateParsed)) {
              date = new Date(dateParsed).toISOString().split('T')[0];
            }
          }

          const time = timeIdx !== -1 ? row[timeIdx] : 'TBD';
          const location = locIdx !== -1 ? row[locIdx] : 'Room TBD';

          // Determine capacity for fallback parser as well!
          let maxCapacity = 1;
          if (maxCapIdx !== -1 && row[maxCapIdx]) {
            const parsedCap = parseInt(row[maxCapIdx], 10);
            if (!isNaN(parsedCap)) maxCapacity = parsedCap;
          }

          const description = descIdx !== -1 ? row[descIdx] : '';

          parsedSlots.push({
            id: `imported-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            type,
            title,
            date,
            time,
            location,
            description,
            maxCapacity,
            bookedByList: [],
            bookedBy: null,
            bookedAt: null
          });
        }
      }

      if (parsedSlots.length === 0) {
        throw new Error("No valid duty or cover rows were found in the CSV. Please verify formatting.");
      }

      setImportedPreview(parsedSlots);
      setSuccessMsg(`Successfully parsed ${parsedSlots.length} available slots from your spreadsheet!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV spreadsheet file. Please check spacing and column headers.');
      setImportedPreview([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCsv(text);
    };
    reader.onerror = () => {
      setError('Error reading the CSV file.');
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    if (importedPreview.length === 0) return;
    onImportSlots(importedPreview, importMode === 'append');
    setImportedPreview([]);
    setCsvText('');
    setSuccessMsg(`Successfully imported ${importedPreview.length} slots into your scheduler!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="flex flex-col gap-6" id="csv-importer-container">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-sans tracking-tight text-slate-800">Spreadsheet Data Import</h2>
        <p className="text-sm text-slate-500 mt-1">
          Import your emergency cover duties and recess shifts directly from school scheduling systems. You can upload any CSV sheet or copy-paste rows from Excel/Google Sheets.
        </p>
      </div>

      {/* Mass Delete / Database Maintenance Warning */}
      {existingCount > 0 && onClearSlots && (
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in" id="danger-zone-mass-delete">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-950">Mass Delete & Clear Existing Slots</h4>
              <p className="text-xs text-rose-800/80 leading-relaxed mt-1">
                There are currently <strong className="text-rose-950 font-bold">{existingCount} slots</strong> loaded in your schedule. If you would like to start fresh and import your own customized data, you can delete all current slots and bookings first.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                🗑️ Clear All {existingCount} Slots
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <span className="text-[10px] text-rose-700 font-bold text-center sm:text-right bg-rose-100 px-2.5 py-1 rounded-lg">
                  Confirm? Erases all bookings!
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClearSlots();
                      setShowClearConfirm(false);
                    }}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-850 text-white font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Upload & Copy/Paste */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileUp className="h-4 w-4 text-indigo-600" />
              1. Choose Import Method
            </h3>

            {/* Drag Drop File Picker */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".csv,text/csv" 
                className="hidden" 
              />
              <div className="bg-white p-3 rounded-xl border border-slate-200 group-hover:border-indigo-200 shadow-sm transition-colors text-slate-500 group-hover:text-indigo-600 mb-3">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700 group-hover:text-indigo-950">
                Click to upload your school spreadsheet (.csv)
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                CSV format, comma or tab delimited, UTF-8 encoding
              </p>
            </div>

            {/* Separator */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">OR PASTE RAW DATA</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {/* Paste Text Area */}
            <div className="flex flex-col gap-2">
              <textarea
                rows={6}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder="Paste your CSV text rows here...&#10;e.g.&#10;Date,Type,Title,Time,Location&#10;2026-09-14,duty,Corridor recess guard,10:30,Block A"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
              />
              
              <button
                onClick={() => parseCsv(csvText)}
                disabled={!csvText.trim()}
                className={`py-2 px-4 text-xs font-bold rounded-xl transition-all w-full flex items-center justify-center gap-2 ${
                  csvText.trim()
                    ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-98'
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Clipboard className="h-4 w-4" />
                Analyze Pasted Data
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Instructions & Template */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-indigo-600" />
              Spreadsheet Requirements
            </h3>
            
            <div className="text-xs font-semibold text-slate-700 bg-white/70 p-2.5 rounded-xl border border-indigo-100/40 flex flex-col gap-1.5">
              <span className="text-indigo-950 font-bold">1. Duties (masterDutySlots):</span>
              <p className="text-[10px] text-slate-500 leading-normal font-normal">
                Columns: <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Slot_ID</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Day of Week</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Area / Location</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Time Block From</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Time Block To</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Duration (Mins)</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Max Capacity</code>
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-700 bg-white/70 p-2.5 rounded-xl border border-indigo-100/40 flex flex-col gap-1.5">
              <span className="text-indigo-950 font-bold">2. Covers (masterEmergencySlots):</span>
              <p className="text-[10px] text-slate-500 leading-normal font-normal">
                Columns: <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Slot_ID</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Day of Week</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Section</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Start Time</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">End Time</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Duration (Mins)</code>, <code className="font-mono bg-slate-100 px-1 rounded text-rose-600">Max Capacity</code>
              </p>
            </div>

            <div className="border-t border-indigo-100/60 pt-3 mt-1 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Copy Sample Sheets:</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => copyTemplate('duty')}
                    className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold underline hover:no-underline cursor-pointer"
                  >
                    Duties Template
                  </button>
                  <span className="text-indigo-200">|</span>
                  <button 
                    onClick={() => copyTemplate('emergency')}
                    className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold underline hover:no-underline cursor-pointer"
                  >
                    Covers Template
                  </button>
                </div>
              </div>
              <pre className="bg-indigo-950/5 border border-indigo-950/10 rounded-lg p-2.5 text-[9px] font-mono text-indigo-950 leading-relaxed overflow-x-auto max-h-[120px]">
                {sampleDutyCsv}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Output / Feedback messages */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-800" id="import-error-alert">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold">Import Error</h4>
            <p className="text-xs text-rose-700/90 leading-relaxed mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 text-emerald-800" id="import-success-alert">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold">Success</h4>
            <p className="text-xs text-emerald-700/90 leading-relaxed mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Preview Section & Action Panel */}
      {importedPreview.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4"
          id="import-preview-panel"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-600" />
                2. Preview and Confirm Import ({importedPreview.length} slots)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Please double check the parsed rows below before applying to the database.
              </p>
            </div>

            {/* Merge options */}
            <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl self-start">
              <button
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  importMode === 'replace' 
                    ? 'bg-white text-slate-800 shadow-sm font-bold' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Overwrite (Replace {existingCount} Slots)
              </button>
              <button
                onClick={() => setImportMode('append')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  importMode === 'append' 
                    ? 'bg-white text-slate-800 shadow-sm font-bold' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Merge (Add to existing)
              </button>
            </div>
          </div>

          {/* Slots Table Preview */}
          <div className="overflow-x-auto max-h-[350px] border border-slate-100 rounded-xl" id="import-preview-table-container">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Title / Activity</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {importedPreview.map((slot, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        slot.type === 'duty' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {slot.type}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate">{slot.title}</td>
                    <td className="p-3 font-mono text-[11px]">{slot.date}</td>
                    <td className="p-3 font-mono text-[11px]">{slot.time}</td>
                    <td className="p-3 truncate">{slot.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Confirm Actions button */}
          <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 text-xs">
            <button
              onClick={() => {
                setImportedPreview([]);
                setCsvText('');
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-all cursor-pointer"
            >
              Discard Preview
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="h-4.5 w-4.5" />
              Apply {importedPreview.length} Slots Now
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
