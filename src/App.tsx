/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DailyRecord } from './types';
import { getTodayDateString } from './constants';
import { 
  loadDailyRecord, 
  loadAllRecords,
  saveDailyRecord,
  syncRecordsWithServer,
  syncLabTestsWithServer
} from './utils/storage';
import {
  subscribeToRecords,
  subscribeToLabTests,
  auth,
  signInWithGoogle,
  logoutUser
} from './utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';


// นำเข้าแต่ละโมดูลหลัก
import IncomeModule from './components/IncomeModule';
import ExpenseModule from './components/ExpenseModule';
import ProfitModule from './components/ProfitModule';
import DailyReportModule from './components/DailyReportModule';
import SummaryReportModule from './components/SummaryReportModule';
import ManageTestsModule from './components/ManageTestsModule';

// นำเข้าไอคอนจาก lucide-react
import {
  Wallet,
  Receipt,
  LineChart,
  ClipboardCheck,
  CalendarDays,
  Settings,
  Sparkles,
  HeartPulse,
  FlaskConical,
  ShieldCheck,
  Info,
  LogOut,
  User,
  Mail,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'income' | 'expense' | 'profit' | 'daily' | 'summary' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('income');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [allRecords, setAllRecords] = useState<Record<string, DailyRecord>>({});
  const [user, setUser] = useState<{ uid: string; name: string; email: string; photoURL: string } | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>('');

  // ซิงค์สัญญาณ Bypass Auth
  const [showBypassForm, setShowBypassForm] = useState<boolean>(false);
  const [bypassEmail, setBypassEmail] = useState<string>('');
  const [bypassName, setBypassName] = useState<string>('');

  // ติดตามการเปลี่ยนแปลงสถานะล็อกอิน Google Gmail แบบเรียลไทม์
  useEffect(() => {
    const bypassedUserStr = localStorage.getItem('bklabplus_bypass_user');
    if (bypassedUserStr) {
      try {
        const parsed = JSON.parse(bypassedUserStr);
        if (parsed && parsed.email) {
          setUser(parsed);
          setAuthLoading(false);
          return;
        }
      } catch (err) {
        localStorage.removeItem('bklabplus_bypass_user');
      }
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // ตรวจสอบห้องเซสชันเพื่อเลี่ยงทับซ้อน
      const hasBypass = localStorage.getItem('bklabplus_bypass_user');
      if (hasBypass) return;

      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'ผู้ใช้งานคลินิก',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // ตั้งค่าวันที่เริ่มต้นเมื่อเปิดแอปพลิเคชันครั้งแรก
  useEffect(() => {
    const today = getTodayDateString();
    setCurrentDate(today);
  }, []);

  // ดึงข้อมูลและเชื่อมโยงเรียลไทม์ผ่าน Firebase Firestore และ REST API ทั่วถึงพร้อมกันทุกเครื่อง
  useEffect(() => {
    // 1. โหลดข้อมูลแคชล่าสุดขึ้นแสดงความเร็วสูงก่อน
    const cached = loadAllRecords();
    setAllRecords(cached);

    // 2. สมัครซิงค์สัญญาณสดแบบ Real-time จากทาง Firebase Firestore
    const unsubscribeRecords = subscribeToRecords((records) => {
      setAllRecords((prev) => {
        // ผสานข้อมูลเพื่อลดการกระตุก ป้องกันข้อมูลสำคัญสูญหาย
        const merged = { ...prev };
        Object.keys(records).forEach((key) => {
          merged[key] = records[key];
        });
        return merged;
      });
    });

    const unsubscribeLabTests = subscribeToLabTests((tests) => {
      // ซิงค์เทมเพลตแล็บแบคกราวด์อัตโนมัติ
    });

    // 3. เรียกดึงฐานข้อมูลเซิร์ฟเวอร์สำรองเผื่อออฟไลน์
    const doInitialSync = async () => {
      try {
        const serverRecords = await syncRecordsWithServer();
        if (serverRecords) {
          setAllRecords((prev) => ({ ...prev, ...serverRecords }));
        }
        await syncLabTestsWithServer();
      } catch (err) {
        console.warn('Backup sync running passively. Firestore active.');
      }
    };
    doInitialSync();

    return () => {
      unsubscribeRecords();
      unsubscribeLabTests();
    };
  }, []); // ทำงานรอบเดียวตลอดทั้ง session เพื่อความต่อเนื่องและไร้ปัญหา race condition

  // สกัดข้อมูลสำหรับวันที่ดึงมาตามช่วงเวลาแบบสดๆ เคลื่อนไหวตาม Firestore 100%
  const currentRecord: DailyRecord = allRecords[currentDate] || {
    date: currentDate,
    incomeItems: [],
    expenseItems: [],
    outLabItems: [],
    hasOutLab: true,
    cashCheck: {
      countedCash: 0,
      note: '',
      isSaved: false,
    },
  };

  // ฟังก์ชันบันทึกข้อมูลประจำวันลง LocalStorage + Firebase Firestore แบบพร้อมกันข้ามอุปกรณ์
  const handleSaveRecord = (updatedRecord: DailyRecord) => {
    if (currentDate) {
      saveDailyRecord(currentDate, updatedRecord);
      setAllRecords((prev) => ({
        ...prev,
        [currentDate]: updatedRecord,
      }));
    }
  };

  const handleDateChange = (newDate: string) => {
    setCurrentDate(newDate);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070b19]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-300">กำลังเชื่อมสัญญาณคลาวด์เรียลไทม์...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center p-4 text-slate-100 font-sans">
        <div className="w-full max-w-lg space-y-8 py-10 px-6 bg-[#0d1527] border border-[#1e2e5d]/30 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Animated decorative bg circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full filter blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full filter blur-3xl pointer-events-none"></div>

          {/* Logo & Header */}
          <div className="relative text-center space-y-3.5">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/25">
              <FlaskConical className="text-white animate-pulse" size={40} />
            </div>
            <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/25 text-[10px] text-blue-400 font-black rounded-full uppercase tracking-widest">
              BK LAB PLUS + CLINICAL ACCOUNTING
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              ระบบบันทึกรายรับ-รายจ่าย คลินิกและแล็บ
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
              เครื่องมือบัญชีเรียลไทม์คู่ใจคลินิกและแล็บวิเคราะห์ ทำงานประมวลผล สรุปผลข้ามเครื่อง และแชร์การเข้าห้องปฏิบัติการสดๆ ทันที
            </p>
          </div>

          {/* Interactive sign-in zone */}
          <div className="relative bg-[#121c35] border border-[#1e3063]/40 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="text-sm font-black text-white border-b border-slate-800/60 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-400">
                <Lock size={14} /> เข้าระบบคลาวด์เพื่อความปลอดภัย
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                Online
              </span>
            </div>

            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl font-semibold leading-relaxed">
                🚨 เกิดข้อผิดพลาด: {authError}
              </div>
            )}

            <button
              onClick={async () => {
                setAuthError('');
                try {
                  await signInWithGoogle();
                } catch (err: any) {
                  setAuthError(err.message || 'โปรดลองใหม่อีกครั้ง');
                }
              }}
              className="w-full bg-white hover:bg-slate-150 active:scale-[0.99] text-slate-900 py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg border border-gray-200"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>เข้าสู่ระบบด้วย Google Account (Gmail)</span>
            </button>

            {!showBypassForm ? (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowBypassForm(true)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                >
                  🌐 เข้าสู่ระบบจากเครื่องอื่นไม่ได้? (คลิกเชื่อมต่อ Bypass)
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider">
                    ⚡ ระบบเชื่อมต่อสารสนเทศเลี่ยงสิทธิ์ (Bypass Connection)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowBypassForm(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    ย้อนกลับ
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      ระบุอีเมลผู้ใช้งาน (Gmail ของท่าน)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="เช่น mana@gmail.com"
                      value={bypassEmail}
                      onChange={(e) => setBypassEmail(e.target.value)}
                      className="w-full bg-[#0d1527] border border-slate-750/70 border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      ระบุชื่อเจ้าหน้าที่บันทึกผล
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น หมอมานะ / เจ้าหน้าที่วิเคราะห์"
                      value={bypassName}
                      onChange={(e) => setBypassName(e.target.value)}
                      className="w-full bg-[#0d1527] border border-slate-750/70 border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!bypassEmail || !bypassName) {
                      setAuthError('โปรดกรอกข้อมูลให้ครบถ้วนทุกช่องครับ');
                      return;
                    }
                    if (!bypassEmail.includes('@')) {
                      setAuthError('โปรดระบุรูปแบบอีเมลที่ถูกต้อง (เช่น yourname@gmail.com)');
                      return;
                    }
                    const fakeUser = {
                      uid: 'bypass-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                      name: bypassName.trim(),
                      email: bypassEmail.trim().toLowerCase(),
                      photoURL: ''
                    };
                    localStorage.setItem('bklabplus_bypass_user', JSON.stringify(fakeUser));
                    setUser(fakeUser);
                    setAuthError('');
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:opacity-90 active:scale-95 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-all"
                >
                  <span>ยืนยันตัวตนด่วน และเชื่อมตารางเรียลไทม์ ⚡</span>
                </button>
              </div>
            )}

            <div className="text-center font-medium">
              <span className="text-[11px] text-slate-400 leading-relaxed block">
                ระบบจะทำการซิงค์บันทึกรายรับ-รายจ่าย คลังวัสดุและสินค้า ตลอดจนแล็บนอกของคุณ ส่งสัญญานผ่านฐานข้อมูลสด (Real-time Cloud Node) ทราบผลทุกเครื่องพร้อมเพรียงกัน
              </span>
            </div>
          </div>

          {/* Guidelines on LINE/Facebook browsers */}
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-4.5 text-[11px] leading-relaxed text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-black">
              <Info size={14} className="text-amber-400 shrink-0" />
              <span>คำแนะนำสำคัญในการล็อกอิน:</span>
            </div>
            <p className="text-slate-300 font-medium">
              หากเปิดลิงก์ผ่านหน้าต่างแชท LINE (LINE Browser) หรือ FB Messenger บางเวอร์ชัน ตัวเบราว์เซอร์อาจบล็อกหน้าต่างล็อกอินของ Google
            </p>
            <p className="text-emerald-400 font-bold">
              👉 แนะนำให้กดที่ขีดสามปุ่มหรือเมนู แล้วเลือก "เปิดด้วยเบราว์เซอร์ระบบ" (Open in Safari / Chrome) เพื่อเสร็ปเข้าสู่ระบบได้แบบไร้ปัญหา 100%!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentRecord) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-gray-500">กำลังเตรียมระบบบัญชีแล็บ...</p>
        </div>
      </div>
    );
  }

  // แผนผังแท็บนำทางที่สวยงาม
  const tabs = [
    { id: 'income', label: 'บันทึกรายรับ', icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'expense', label: 'บันทึกรายจ่าย & Out-Lab', icon: Receipt, color: 'text-rose-600 bg-rose-50' },
    { id: 'profit', label: 'ประมวลกำไร & นับเงินสด', icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50' },
    { id: 'daily', label: 'รายงานประจำวัน', icon: CalendarDays, color: 'text-blue-600 bg-blue-50' },
    { id: 'summary', label: 'สรุปภาพรวมสะสม & กราฟ', icon: LineChart, color: 'text-indigo-600 bg-indigo-50' },
    { id: 'settings', label: 'ตั้งค่ารายการ Test', icon: Settings, color: 'text-slate-600 bg-slate-50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 pb-12 transition-all">
      {/* 1. แถบ Header แบรนด์ด้านบนสุด */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm print:hidden" id="app-main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-900/40">
              <HeartPulse className="text-white animate-pulse" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white">ระบบบันทึกรายรับ-รายจ่าย คลินิกและแล็บ</h1>
                <span className="px-1.5 py-0.5 bg-blue-500/30 text-[9px] text-blue-400 font-extrabold rounded-full uppercase tracking-widest border border-blue-400/10 shrink-0">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                CLINIC & LAB INCOME-EXPENSE SYSTEM
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-center">
            {/* ข้อมูลประวัติผู้เข้าระบบจาก Google Account */}
            {user && (
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 max-w-[260px] md:max-w-none">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-7 h-7 rounded-full border border-slate-600 shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-700 font-extrabold flex items-center justify-center text-[10px] text-blue-400 uppercase shrink-0 border border-slate-600">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="flex flex-col text-left truncate min-w-[65px] max-w-[120px] sm:max-w-[180px]">
                  <span className="text-[10px] font-black leading-none text-white block truncate">{user.name}</span>
                  <span className="text-[9px] font-semibold leading-normal text-slate-400 block truncate font-mono">{user.email}</span>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('ระบบจะออกจากบัญชี Google Account ปัจจุบันใช่หรือไม่?')) {
                      await logoutUser();
                    }
                  }}
                  className="p-1 px-2.5 bg-rose-600/90 hover:bg-rose-600 active:scale-95 text-white rounded-lg text-[9px] font-extrabold tracking-wide transition-all cursor-pointer flex items-center gap-1 border border-rose-500/20 shadow-xs ml-1 shrink-0"
                  title="ออกจากระบบ"
                >
                  <LogOut size={10} />
                  <span>ออกระบบ</span>
                </button>
              </div>
            )}

            {/* กล่องเลือกวันที่หลักของระบบ */}
            <div className="flex items-center gap-2.5 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 font-bold hidden sm:inline">วันที่บันทึก:</span>
              <input
                type="date"
                id="global-date-picker"
                value={currentDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="text-xs font-black text-white bg-slate-900 outline-none border border-slate-700 focus:border-blue-500 rounded px-2.5 py-1"
              />
            </div>
          </div>
        </div>
      </header>

      {/* 2. เนื้อหาหลักของแดชบอร์ด */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* แนะนำประโยชน์ด้านล่าง แยกลำดับ Tab ด้วยการออกแบบเปี่ยมเสน่ห์ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 print:hidden" id="navigation-tabs-container">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-905 bg-slate-900 text-white border-slate-800 shadow-md'
                    : 'bg-white text-gray-500 hover:text-slate-800 hover:bg-slate-50 border-gray-150 shadow-2xs'
                }`}
              >
                <div className={`p-2 rounded-xl mb-2 ${isSelected ? 'bg-slate-800 text-blue-400' : tab.color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[11px] font-black tracking-wide leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* แผ่นเนื้อหารายละเอียดแต่ละโมดูล */}
        <div className="min-h-[500px]" id="tab-content-portal">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + currentDate}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'income' && (
                <IncomeModule
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                  record={currentRecord}
                  onSaveRecord={handleSaveRecord}
                />
              )}

              {activeTab === 'expense' && (
                <ExpenseModule
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                  record={currentRecord}
                  onSaveRecord={handleSaveRecord}
                />
              )}

              {activeTab === 'profit' && (
                <ProfitModule
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                  record={currentRecord}
                  onSaveRecord={handleSaveRecord}
                />
              )}

              {activeTab === 'daily' && (
                <DailyReportModule
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                  record={currentRecord}
                />
              )}

              {activeTab === 'summary' && (
                <SummaryReportModule currentDate={currentDate} />
              )}

              {activeTab === 'settings' && <ManageTestsModule />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ส่วนท้าย Footer ล่างสุด */}
      <footer className="mt-16 text-center text-xs text-slate-400 max-w-7xl mx-auto px-4 border-t border-gray-150 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <p>
          ระบบ <strong>บันทึกรายรับ-รายจ่าย คลินิกและแล็บ</strong> (Clinic & Lab Income-Expense) - เชื่อมต่อแบบ Real-time Live Sync ผ่านระบบ Cloud Firebase ปลอดภัยและทันท่วงที
        </p>
        <p className="font-medium text-slate-400">
          อำนวยความสะดวกคลินิกเทคนิคการแพทย์ & แล็บวิเคราะห์โรคพาร์ทเนอร์
        </p>
      </footer>
    </div>
  );
}
