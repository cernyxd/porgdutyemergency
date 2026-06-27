import React, { useState, useEffect } from 'react';
import { BookableSlot, Colleague, CooldownState } from './types';
import { DEFAULT_SLOTS, DEFAULT_COLLEAGUES } from './data';
import Sidebar from './components/Sidebar';
import BookingList from './components/BookingList';
import MyBookings from './components/MyBookings';
import CsvImporter from './components/CsvImporter';
import HrExport from './components/HrExport';
import { CalendarRange, ClipboardList, FileSpreadsheet, ShieldAlert, BadgeInfo, Bell, LogIn, Mail, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase';

export default function App() {
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; department?: string } | null>(null);
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [activeColleagueId, setActiveColleagueId] = useState<string>('');
  const [cooldowns, setCooldowns] = useState<CooldownState>({});
  const [activeTab, setActiveTab] = useState<'book' | 'my-bookings' | 'import' | 'hr-export'>('book');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [adminEmails, setAdminEmails] = useState<string[]>(['cernyondrej@novyporg.cz']);

  // Custom login state inside onboarder
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Initialize data from localStorage or defaults
  useEffect(() => {
    // Listen to real Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setGoogleUser({
          name: user.displayName || 'Teacher',
          email: user.email || '',
          department: 'General'
        });
      } else {
        setGoogleUser(null);
      }
    });

    const storedAdmins = localStorage.getItem('porgdutyemergency_booking_admins');
    if (storedAdmins) {
      try {
        setAdminEmails(JSON.parse(storedAdmins));
      } catch (e) {
        console.error('Error parsing admin emails', e);
      }
    }

    const storedSlots = localStorage.getItem('porgdutyemergency_booking_slots_v3');
    const storedColleagues = localStorage.getItem('porgdutyemergency_booking_colleagues_v3');
    const storedCooldowns = localStorage.getItem('porgdutyemergency_booking_cooldowns_v3');

    let finalColleagues = DEFAULT_COLLEAGUES;
    if (storedColleagues) {
      try {
        finalColleagues = JSON.parse(storedColleagues);
      } catch (e) {
        console.error('Error parsing colleagues from localStorage', e);
      }
    }
    setColleagues(finalColleagues);

    let finalSlots = DEFAULT_SLOTS;
    if (storedSlots) {
      try {
        const parsed = JSON.parse(storedSlots);
        if (Array.isArray(parsed)) {
          finalSlots = parsed;
        }
      } catch (e) {
        console.error('Error parsing slots from localStorage', e);
      }
    }
    
    // Sanitize slots to support list-based capacity booking and merge legacy bookings
    const sanitizedSlots = finalSlots.map((slot: any) => {
      const list = slot.bookedByList || (slot.bookedBy ? [slot.bookedBy] : []);
      return {
        ...slot,
        maxCapacity: slot.maxCapacity || 1,
        bookedByList: list,
        bookedBy: list.length > 0 ? list[0] : null
      };
    });
    setSlots(sanitizedSlots);

    let finalCooldowns: CooldownState = {};
    if (storedCooldowns) {
      try {
        finalCooldowns = JSON.parse(storedCooldowns);
      } catch (e) {
        console.error('Error parsing cooldowns', e);
      }
    }
    setCooldowns(finalCooldowns);
    
    return () => unsubscribe();
  }, []);

  // Sync active colleague based on the signed-in Google user
  useEffect(() => {
    if (!googleUser || colleagues.length === 0) return;

    // Check if the user exists in our colleague registry
    const existing = colleagues.find(c => c.email.toLowerCase() === googleUser.email.toLowerCase());
    if (existing) {
      setActiveColleagueId(existing.id);
    } else {
      // Auto-register the signed-in Google user as a teacher in our list!
      const newColleagueId = `colleague-${Date.now()}`;
      const newColleague: Colleague = {
        id: newColleagueId,
        name: googleUser.name,
        email: googleUser.email,
        department: googleUser.department || 'General'
      };
      
      const updatedColleagues = [...colleagues, newColleague];
      setColleagues(updatedColleagues);
      localStorage.setItem('porgdutyemergency_booking_colleagues_v3', JSON.stringify(updatedColleagues));
      setActiveColleagueId(newColleagueId);
    }
  }, [googleUser, colleagues]);

  // Save states to localStorage whenever they change
  useEffect(() => {
    if (slots.length > 0) {
      localStorage.setItem('porgdutyemergency_booking_slots_v3', JSON.stringify(slots));
    }
  }, [slots]);

  useEffect(() => {
    if (colleagues.length > 0) {
      localStorage.setItem('porgdutyemergency_booking_colleagues_v3', JSON.stringify(colleagues));
    }
  }, [colleagues]);

  useEffect(() => {
    localStorage.setItem('porgdutyemergency_booking_cooldowns_v3', JSON.stringify(cooldowns));
  }, [cooldowns]);

  // Toast Notification manager
  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Cooldown checking
  const activeCooldownUntil = cooldowns[activeColleagueId] || null;

  // Book a slot
  const handleBookSlot = (slotId: string) => {
    if (!activeColleagueId) {
      showNotification('Please log in or select a colleague profile to book a slot.', 'error');
      return;
    }

    // Double check cooldown
    const currentCooldown = cooldowns[activeColleagueId];
    if (currentCooldown && Date.now() < currentCooldown) {
      showNotification('Cooldown active. Please wait for the timer to finish.', 'error');
      return;
    }

    setSlots(prevSlots => {
      const slotIndex = prevSlots.findIndex(s => s.id === slotId);
      if (slotIndex === -1) return prevSlots;

      const slot = prevSlots[slotIndex];
      const list = slot.bookedByList || (slot.bookedBy ? [slot.bookedBy] : []);
      const maxCap = slot.maxCapacity || 1;

      if (list.includes(activeColleagueId)) {
        showNotification('You have already booked this slot!', 'error');
        return prevSlots;
      }

      if (list.length >= maxCap) {
        showNotification('This slot is already fully booked!', 'error');
        return prevSlots;
      }

      // Perform booking copy
      const updatedSlots = [...prevSlots];
      const newList = [...list, activeColleagueId];
      updatedSlots[slotIndex] = {
        ...slot,
        bookedByList: newList,
        bookedBy: newList[0],
        bookedAt: new Date().toISOString()
      };

      // Set cooldown for 30 seconds
      setCooldowns(prev => ({
        ...prev,
        [activeColleagueId]: Date.now() + 30000 // 30 seconds
      }));

      showNotification(`Successfully booked: "${slot.title}"! (30s cooldown active)`, 'success');
      return updatedSlots;
    });
  };

  // Cancel booking
  const handleCancelBooking = (slotId: string) => {
    setSlots(prevSlots => {
      const slotIndex = prevSlots.findIndex(s => s.id === slotId);
      if (slotIndex === -1) return prevSlots;

      const slot = prevSlots[slotIndex];
      const list = slot.bookedByList || (slot.bookedBy ? [slot.bookedBy] : []);

      if (!list.includes(activeColleagueId)) {
        showNotification('You can only cancel your own bookings.', 'error');
        return prevSlots;
      }

      const updatedSlots = [...prevSlots];
      const newList = list.filter(id => id !== activeColleagueId);
      updatedSlots[slotIndex] = {
        ...slot,
        bookedByList: newList,
        bookedBy: newList.length > 0 ? newList[0] : null,
        bookedAt: newList.length > 0 ? slot.bookedAt : null
      };

      showNotification(`Cancelled booking: "${slot.title}"`, 'info');
      return updatedSlots;
    });
  };

  // Import slots
  const handleImportSlots = (newSlots: BookableSlot[], append: boolean) => {
    if (append) {
      setSlots(prev => {
        const updated = [...prev, ...newSlots];
        localStorage.setItem('porgdutyemergency_booking_slots_v3', JSON.stringify(updated));
        return updated;
      });
    } else {
      setSlots(newSlots);
      localStorage.setItem('porgdutyemergency_booking_slots_v3', JSON.stringify(newSlots));
    }
    setActiveTab('book'); // Auto switch to Book Slots tab to see results!
    showNotification(`Spreadsheet data imported successfully!`, 'success');
  };

  // Clear all slots (wipe database)
  const handleClearAllSlots = () => {
    setSlots([]);
    localStorage.setItem('porgdutyemergency_booking_slots_v3', JSON.stringify([]));
    showNotification('All slots and bookings have been deleted.', 'info');
  };

  // Add a new colleague (Admin-only feature)
  const handleAddColleague = (name: string, email: string) => {
    const isDup = colleagues.some(c => c.email.toLowerCase() === email.toLowerCase());
    if (isDup) {
      showNotification('A colleague with this email already exists.', 'error');
      return;
    }

    const newColleague = {
      id: `colleague-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      email,
      department: 'General'
    };

    setColleagues(prev => [...prev, newColleague]);
    setActiveColleagueId(newColleague.id);
    showNotification(`Registered teacher: ${name}! Switched active profile.`, 'success');
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email?.toLowerCase().endsWith('@novyporg.cz')) {
        await signOut(auth);
        showNotification('Access restricted to @novyporg.cz accounts only.', 'error');
        return;
      }
      
      showNotification(`Welcome, ${user.displayName}! Signed in via school Google Workspace.`, 'success');
      setActiveTab('book');
    } catch (error: any) {
      console.error('Login failed:', error);
      showNotification('Google Sign-In failed. Please try again.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveColleagueId('');
      showNotification('Signed out of Google session.', 'info');
    } catch (error) {
      showNotification('Error signing out.', 'error');
    }
  };

  const isAdmin = googleUser?.email && adminEmails.includes(googleUser.email.toLowerCase());

  // Render Google Login onboarder if not signed in
  if (!googleUser) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 p-4 font-sans" id="login-layout">
        <div className="w-full max-w-md bg-white border border-slate-200/85 rounded-3xl p-8 shadow-xl flex flex-col gap-6" id="login-card">
          
          {/* Logo & Header */}
          <div className="text-center" id="login-header">
            <div className="mx-auto w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md mb-3">
              <span className="text-white font-extrabold text-lg">P</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">PORG Duty & Emergency</h1>
            <p className="text-xs text-slate-500 mt-1">
              Teacher Emergency Lesson & Duty Booking Portal
            </p>
          </div>

          <div className="border-t border-slate-100 my-1"></div>

          {/* Prompt */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5 text-center">
              School Account Required
            </h2>

            <div className="flex flex-col gap-2" id="account-selectors">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow shadow-indigo-600/20 font-bold text-sm cursor-pointer"
              >
                Sign in with Google
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-3">
                Please use your official @novyporg.cz school email to access the booking system.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Force active tab to safe values if non-admin tries to hack tab states
  const currentTab = (!isAdmin && (activeTab === 'import' || activeTab === 'hr-export')) ? 'book' : activeTab;

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-slate-50 overflow-hidden font-sans" id="app-shell">
      
      {/* Toast Notification Container */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            id="toast-notification"
          >
            <div className={`px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold ${
              notification.type === 'success' 
                ? 'bg-emerald-900 border-emerald-800 text-emerald-50' 
                : notification.type === 'error'
                ? 'bg-rose-900 border-rose-800 text-rose-50'
                : 'bg-slate-900 border-slate-800 text-slate-50'
            }`}>
              <Bell className="h-4.5 w-4.5 shrink-0 animate-bounce" />
              <span>{notification.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar: Profile and switcher (if Admin) */}
      <Sidebar
        colleagues={colleagues}
        activeColleagueId={activeColleagueId}
        onSelectColleague={(id) => {
          // Double check permissions
          if (!isAdmin && id !== activeColleagueId) {
            showNotification('Switching colleagues is restricted to school administrators.', 'error');
            return;
          }
          setActiveColleagueId(id);
          showNotification(`Switched active teacher profile.`, 'info');
        }}
        onAddColleague={handleAddColleague}
        slots={slots}
        cooldownUntil={activeCooldownUntil}
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
      />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col h-full overflow-hidden" id="main-content">
        
        {/* Navigation Tabs Bar */}
        <nav className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shrink-0 font-sans" id="main-nav">
          <div className="flex gap-1.5 overflow-x-auto py-1">
            {[
              { id: 'book', label: 'Book Slots', icon: CalendarRange, hide: false },
              { id: 'my-bookings', label: 'My Schedule', icon: ClipboardList, hide: false },
              { id: 'import', label: 'Spreadsheet Import', icon: FileSpreadsheet, hide: !isAdmin },
              { id: 'hr-export', label: 'HR Export', icon: ShieldAlert, hide: !isAdmin }
            ].map((tab) => {
              if (tab.hide) return null;
              const TabIcon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  id={`tab-${tab.id}`}
                >
                  <TabIcon className="h-4 w-4 shrink-0" />
                  {tab.label}
                  {tab.id === 'my-bookings' && slots.filter(s => (s.bookedByList || (s.bookedBy ? [s.bookedBy] : [])).includes(activeColleagueId)).length > 0 && (
                    <span className="bg-indigo-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-mono leading-none font-bold">
                      {slots.filter(s => (s.bookedByList || (s.bookedBy ? [s.bookedBy] : [])).includes(activeColleagueId)).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Notice Info */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-3 py-1 text-[11px] font-medium font-mono">
              <BadgeInfo className="h-3.5 w-3.5 text-slate-400" />
              <span>Baselines: 30s lock active</span>
            </div>
          </div>
        </nav>

        {/* Dynamic Inner Panel Stage */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8" id="stage-panel">
          <div className="max-w-6xl mx-auto w-full h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {currentTab === 'book' && (
                  <BookingList
                    slots={slots}
                    colleagues={colleagues}
                    activeColleagueId={activeColleagueId}
                    cooldownUntil={activeCooldownUntil}
                    onBookSlot={handleBookSlot}
                    onCancelBooking={handleCancelBooking}
                  />
                )}

                {currentTab === 'my-bookings' && (
                  <MyBookings
                    slots={slots}
                    activeColleagueId={activeColleagueId}
                    onCancelBooking={handleCancelBooking}
                  />
                )}

                {currentTab === 'import' && isAdmin && (
                  <CsvImporter
                    onImportSlots={handleImportSlots}
                    existingCount={slots.length}
                    onClearSlots={handleClearAllSlots}
                  />
                )}

                {currentTab === 'hr-export' && isAdmin && (
                  <HrExport
                    slots={slots}
                    colleagues={colleagues}
                    adminEmails={adminEmails}
                    onUpdateAdmins={(newAdmins: string[]) => {
                      setAdminEmails(newAdmins);
                      localStorage.setItem('porgdutyemergency_booking_admins', JSON.stringify(newAdmins));
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
