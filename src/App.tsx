import React, { useState, useEffect } from 'react';
import { BookableSlot, Colleague, CooldownState } from './types';
import { DEFAULT_SLOTS } from './data';
import Sidebar from './components/Sidebar';
import BookingList from './components/BookingList';
import MyBookings from './components/MyBookings';
import CsvImporter from './components/CsvImporter';
import HrExport from './components/HrExport';
import { CalendarRange, ClipboardList, FileSpreadsheet, ShieldAlert, BadgeInfo, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase';

export default function App() {
  const DEFAULT_ADMIN_EMAILS = ['cernyondrej@novyporg.cz'];

  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; department?: string } | null>(null);
  const [currentUserUid, setCurrentUserUid] = useState<string>('');
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [activeColleagueId, setActiveColleagueId] = useState<string>('');
  const [cooldowns, setCooldowns] = useState<CooldownState>({});
  const [activeTab, setActiveTab] = useState<'book' | 'my-bookings' | 'import' | 'hr-export'>('book');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [adminEmails, setAdminEmails] = useState<string[]>(DEFAULT_ADMIN_EMAILS);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  const sanitizeSlot = (slot: any): BookableSlot => {
    const list = Array.isArray(slot.bookedByList) ? slot.bookedByList : (slot.bookedBy ? [slot.bookedBy] : []);
    return {
      ...slot,
      maxCapacity: slot.maxCapacity || 1,
      bookedByList: list,
      bookedBy: list.length > 0 ? list[0] : null,
      bookedAt: slot.bookedAt || null,
    };
  };

  const deleteCollectionDocs = async (collectionName: string) => {
    const snapshot = await getDocs(collection(db, collectionName));
    let batch = writeBatch(db);
    let opCount = 0;

    for (const docSnap of snapshot.docs) {
      batch.delete(docSnap.ref);
      opCount += 1;
      if (opCount === 400) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
  };

  const upsertSlotsInChunks = async (nextSlots: BookableSlot[]) => {
    let batch = writeBatch(db);
    let opCount = 0;

    for (const slot of nextSlots) {
      batch.set(doc(db, 'slots', slot.id), sanitizeSlot(slot));
      opCount += 1;
      if (opCount === 400) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setCurrentUserUid(user.uid);
        setGoogleUser({
          name: user.displayName || 'Teacher',
          email: user.email,
          department: 'General',
        });
      } else {
        setCurrentUserUid('');
        setGoogleUser(null);
        setSlots([]);
        setColleagues([]);
        setCooldowns({});
        setAdminEmails(DEFAULT_ADMIN_EMAILS);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserUid || !googleUser) return;

    setIsDataLoading(true);

    let slotsReady = false;
    let colleaguesReady = false;
    let cooldownsReady = false;
    let adminsReady = false;

    const markReady = () => {
      if (slotsReady && colleaguesReady && cooldownsReady && adminsReady) {
        setIsDataLoading(false);
      }
    };

    const bootstrap = async () => {
      try {
        await setDoc(doc(db, 'admins', DEFAULT_ADMIN_EMAILS[0]), {
          email: DEFAULT_ADMIN_EMAILS[0],
          createdAt: new Date().toISOString(),
        }, { merge: true });

        const colleagueId = `user_${currentUserUid}`;
        await setDoc(doc(db, 'colleagues', colleagueId), {
          id: colleagueId,
          name: googleUser.name,
          email: googleUser.email.toLowerCase(),
          department: googleUser.department || 'General',
        }, { merge: true });

        const hasSlots = await getDocs(query(collection(db, 'slots'), limit(1)));
        if (hasSlots.empty) {
          await upsertSlotsInChunks(DEFAULT_SLOTS);
        }
      } catch (error) {
        console.error('Firestore bootstrap failed', error);
      }
    };

    bootstrap();

    const unsubSlots = onSnapshot(collection(db, 'slots'), (snapshot) => {
      const nextSlots = snapshot.docs.map((d) => sanitizeSlot({ id: d.id, ...d.data() }));
      setSlots(nextSlots);
      slotsReady = true;
      markReady();
    });

    const unsubColleagues = onSnapshot(collection(db, 'colleagues'), (snapshot) => {
      const nextColleagues = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Colleague));
      setColleagues(nextColleagues);
      colleaguesReady = true;
      markReady();
    });

    const unsubCooldowns = onSnapshot(collection(db, 'cooldowns'), (snapshot) => {
      const nextCooldowns: CooldownState = {};
      snapshot.docs.forEach((d) => {
        const ts = Number(d.data().timestamp || 0);
        if (ts > Date.now()) {
          nextCooldowns[d.id] = ts;
        }
      });
      setCooldowns(nextCooldowns);
      cooldownsReady = true;
      markReady();
    });

    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const emails = snapshot.docs
        .map((d) => String(d.data().email || d.id).toLowerCase())
        .filter(Boolean);
      setAdminEmails(emails.length > 0 ? emails : DEFAULT_ADMIN_EMAILS);
      adminsReady = true;
      markReady();
    });

    return () => {
      unsubSlots();
      unsubColleagues();
      unsubCooldowns();
      unsubAdmins();
    };
  }, [currentUserUid, googleUser]);

  useEffect(() => {
    if (!googleUser || !currentUserUid) return;

    const existing = colleagues.find((c) => c.email.toLowerCase() === googleUser.email.toLowerCase());
    if (existing) {
      if (activeColleagueId !== existing.id) {
        setActiveColleagueId(existing.id);
      }
      return;
    }

    const colleagueId = `user_${currentUserUid}`;
    setDoc(doc(db, 'colleagues', colleagueId), {
      id: colleagueId,
      name: googleUser.name,
      email: googleUser.email.toLowerCase(),
      department: googleUser.department || 'General',
    }, { merge: true }).catch((error) => {
      console.error('Failed to auto-register colleague', error);
    });
  }, [googleUser, currentUserUid, colleagues, activeColleagueId]);

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
  const handleBookSlot = async (slotId: string) => {
    if (!activeColleagueId) {
      showNotification('Please log in or select a colleague profile to book a slot.', 'error');
      return;
    }

    const currentCooldown = cooldowns[activeColleagueId];
    if (currentCooldown && Date.now() < currentCooldown) {
      showNotification('Cooldown active. Please wait for the timer to finish.', 'error');
      return;
    }

    try {
      const slotRef = doc(db, 'slots', slotId);
      const cooldownRef = doc(db, 'cooldowns', activeColleagueId);
      await runTransaction(db, async (tx) => {
        const [slotSnap, cooldownSnap] = await Promise.all([tx.get(slotRef), tx.get(cooldownRef)]);

        if (!slotSnap.exists()) {
          throw new Error('slot-missing');
        }

        const remoteCooldown = Number(cooldownSnap.data()?.timestamp || 0);
        if (remoteCooldown > Date.now()) {
          throw new Error('cooldown-active');
        }

        const slot = sanitizeSlot({ id: slotSnap.id, ...slotSnap.data() });
        const list = slot.bookedByList || [];
        const maxCap = slot.maxCapacity || 1;

        if (list.includes(activeColleagueId)) {
          throw new Error('already-booked');
        }

        if (list.length >= maxCap) {
          throw new Error('slot-full');
        }

        const newList = [...list, activeColleagueId];
        tx.update(slotRef, {
          bookedByList: newList,
          bookedBy: newList[0] || null,
          bookedAt: new Date().toISOString(),
        });
        tx.set(cooldownRef, { timestamp: Date.now() + 30000 }, { merge: true });
      });

      showNotification('Successfully booked slot. 30s cooldown active.', 'success');
    } catch (error: any) {
      if (error?.message === 'already-booked') {
        showNotification('You have already booked this slot.', 'error');
      } else if (error?.message === 'slot-full') {
        showNotification('This slot is already fully booked.', 'error');
      } else if (error?.message === 'cooldown-active') {
        showNotification('Cooldown active. Please wait for the timer to finish.', 'error');
      } else {
        console.error('Booking failed', error);
        showNotification('Booking failed. Please try again.', 'error');
      }
    }
  };

  const handleCancelBooking = async (slotId: string) => {
    if (!activeColleagueId) return;

    try {
      const slotRef = doc(db, 'slots', slotId);
      await runTransaction(db, async (tx) => {
        const slotSnap = await tx.get(slotRef);
        if (!slotSnap.exists()) {
          throw new Error('slot-missing');
        }

        const slot = sanitizeSlot({ id: slotSnap.id, ...slotSnap.data() });
        const list = slot.bookedByList || [];
        if (!list.includes(activeColleagueId)) {
          throw new Error('not-owner');
        }

        const newList = list.filter((id) => id !== activeColleagueId);
        tx.update(slotRef, {
          bookedByList: newList,
          bookedBy: newList.length > 0 ? newList[0] : null,
          bookedAt: newList.length > 0 ? slot.bookedAt : null,
        });
      });

      showNotification('Booking cancelled.', 'info');
    } catch (error: any) {
      if (error?.message === 'not-owner') {
        showNotification('You can only cancel your own bookings.', 'error');
      } else {
        console.error('Cancel booking failed', error);
        showNotification('Cancellation failed. Please try again.', 'error');
      }
    }
  };

  const handleImportSlots = async (newSlots: BookableSlot[], append: boolean) => {
    try {
      if (!append) {
        await deleteCollectionDocs('slots');
      }
      await upsertSlotsInChunks(newSlots);

      setActiveTab('book');
      showNotification('Spreadsheet data imported successfully.', 'success');
    } catch (error) {
      console.error('Import slots failed', error);
      showNotification('Import failed. Please try again.', 'error');
    }
  };

  const handleClearAllSlots = async () => {
    try {
      await deleteCollectionDocs('slots');
      showNotification('All slots and bookings have been deleted.', 'info');
    } catch (error) {
      console.error('Clear slots failed', error);
      showNotification('Unable to clear slots.', 'error');
    }
  };

  const handleAddColleague = async (name: string, email: string) => {
    const isDup = colleagues.some(c => c.email.toLowerCase() === email.toLowerCase());
    if (isDup) {
      showNotification('A colleague with this email already exists.', 'error');
      return;
    }

    const newColleague: Colleague = {
      id: `colleague-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      email,
      department: 'General'
    };

    try {
      await setDoc(doc(db, 'colleagues', newColleague.id), {
        ...newColleague,
        email: newColleague.email.toLowerCase(),
      });
      setActiveColleagueId(newColleague.id);
      showNotification(`Registered teacher: ${name}. Switched active profile.`, 'success');
    } catch (error) {
      console.error('Add colleague failed', error);
      showNotification('Failed to add colleague.', 'error');
    }
  };

  const handleUpdateAdmins = async (newAdmins: string[]) => {
    const normalized: string[] = Array.from(new Set(newAdmins.map((email) => email.toLowerCase().trim()).filter(Boolean)));
    const nextAdmins = normalized.length > 0 ? normalized : DEFAULT_ADMIN_EMAILS;

    try {
      const batch = writeBatch(db);
      const currentSet = new Set<string>(adminEmails.map((email) => email.toLowerCase()));
      const nextSet = new Set<string>(nextAdmins);

      for (const existing of currentSet) {
        if (!nextSet.has(existing)) {
          batch.delete(doc(db, 'admins', existing));
        }
      }

      for (const email of nextSet) {
        batch.set(doc(db, 'admins', email), {
          email,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }

      await batch.commit();
      showNotification('Admin list updated.', 'success');
    } catch (error) {
      console.error('Update admins failed', error);
      showNotification('Failed to update admin list.', 'error');
    }
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

  const isAdmin = !!(googleUser?.email && adminEmails.includes(googleUser.email.toLowerCase()));

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

  if (isDataLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 text-sm font-semibold text-slate-700 shadow-sm">
          Syncing schedule from Firestore...
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
                    onUpdateAdmins={handleUpdateAdmins}
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
