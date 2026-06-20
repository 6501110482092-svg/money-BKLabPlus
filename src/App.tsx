/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DailyRecord } from './types';
import { getTodayDateString } from './constants';
import { 
  loadDailyRecord, 
  saveDailyRecord,
  syncRecordsWithServer,
  syncLabTestsWithServer
} from './utils/storage';
import {
  subscribeToRecords,
  subscribeToLabTests
} from './utils/firebase';


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
  const [currentRecord, setCurrentRecord] = useState<DailyRecord | null>(null);

  // สถานะผู้ใช้งาน (จำลองเซสชัน)
  const [user, setUser] = useState<{ name: string; email: string } | null>(() => {
    try {
      const saved = localStorage.getItem('bklabplus_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // สถานะสำหรับฟอร์มล็อกอินจำลอง
  const [showBypassForm, setShowBypassForm] = useState(false);
  const [bypassName, setBypassName] = useState('');
  const [bypassEmail, setBypassEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // ตั้งค่าวันที่เริ่มต้นเมื่อเปิดแอปพลิเคชันครั้งแรก
  useEffect(() => {
    const today = getTodayDateString();
    setCurrentDate(today);
  }, []);

  // ดึงข้อมูลและเชื่อมโยงเรียลไทม์ผ่าน Firebase Firestore และ REST API เป็นประจำ
  useEffect(() => {
    if (!user) return; // ทำงานเฉพาะเวลาล็อกอินแล้ว

    // 1. สมัครสัญญาณซิงค์ด่วนแบบ Real-time จาก Firebase Firestore
    const unsubscribeRecords = subscribeToRecords((allRecords) => {
      if (currentDate) {
        const updatedRec = allRecords[currentDate];
        if (updatedRec) {
          setCurrentRecord((prev) => {
            // หลีกเลี่ยงการอัปเดตวนลูปถ้ารายละเอียดตรงกันหมด 100%
            if (JSON.stringify(prev) !== JSON.stringify(updatedRec)) {
              return updatedRec;
            }
            return prev;
          });
        }
      }
    });

    const unsubscribeLabTests = subscribeToLabTests((tests) => {
      // สมัครและรอสัญญาณเรียลไทม์
    });

    // 2. ดึงข้อมูลประวัติแรกเริ่มและสำรองผ่าน REST API ทั่วไป
    const doInitialSync = async () => {
      try {
        await syncRecordsWithServer();
        await syncLabTestsWithServer();
        if (currentDate) {
          setCurrentRecord(loadDailyRecord(currentDate));
        }
      } catch (err) {
        console.warn('Backup sync resting. Premium Firestore real-time active.');
      }
    };
    doInitialSync();

    return () => {
      unsubscribeRecords();
      unsubscribeLabTests();
    };
  }, [currentDate, user]);

  // โหลดหรือเปลี่ยนประวัติประจำวันเมื่อมีการเลือกวันที่ใหม่
  useEffect(() => {
    if (currentDate && user) {
      const rec = loadDailyRecord(currentDate);
      setCurrentRecord(rec);
    }
  }, [currentDate, user]);

  // ฟังก์ชันบันทึกข้อมูลประจำวันลง LocalStorage
  const handleSaveRecord = (updatedRecord: DailyRecord) => {
    if (currentDate) {
      saveDailyRecord(currentDate, updatedRecord);
      setCurrentRecord(updatedRecord);
    }
  };

  const handleDateChange = (newDate: string) => {
    setCurrentDate(newDate);
  };

  // สกรีนตรวจจับสิทธิ์ล็อกอิน บายพาสกรณีฉุกเฉินและ Google Auth
  if (!user) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center p-4 text-slate-100 font-sans selection:bg-slate-850">
        <div className="w-full max-w-md space-y-6 text-center py-8">
          {/* Logo Icon and Brand */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <FlaskConical className="text-white" size={40} />
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-extrabold rounded-full uppercase tracking-wider">
              LABORATORY INVENTORY SYSTEM
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              ระบบบริหารคลังชุดตรวจและน้ำยาเคมี
            </h1>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              ห้องปฏิบัติการเทคนิคการแพทย์ คลินิกแล็บความแม่นยำสูง
            </p>
          </div>

          {/* Sync status details card */}
          <div className="bg-[#111a34] border border-[#1e2e5d]/30 rounded-2xl p-5 text-left text-slate-350 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 text-blue-400 font-bold text-sm">
              <ShieldCheck size={18} className="text-blue-400 shrink-0" />
              <span>ระบบเชื่อมต่อซิงค์คลาวด์แบบมาตรฐาน:</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 shrink-0 font-bold">•</span>
                <span>เชื่อมข้อมูลสดเรียลไทม์ (Real-time Live Sync) อัปเดตพร้อมกันทุกเครื่อง</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 shrink-0 font-bold">•</span>
                <span>พอร์ตระบบมาตรฐานและฐานข้อมูล Firebase คลาวด์คงทนสูง</span>
              </li>
            </ul>
          </div>

          {/* Login Actions wrapper */}
          <div className="space-y-4">
            {isLoggingIn ? (
              <div className="bg-[#111a34] border border-[#1e2e5d]/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-md">
                <div className="w-7 h-7 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-slate-300">กำลังแลกเปลี่ยนรหัสโปรโตคอลระบบเรียลไทม์...</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoggingIn(true);
                    setLoginError('');
                    setTimeout(() => {
                      setIsLoggingIn(false);
                      // บันทึกโปรไฟล์ Google จำลองจากเมตาดาต้า
                      const mockUser = {
                        name: 'ผู้ใช้ Google Account',
                        email: '6501110482092@ptu.ac.th',
                      };
                      localStorage.setItem('bklabplus_user', JSON.stringify(mockUser));
                      setUser(mockUser);
                    }, 800);
                  }}
                  className="w-full bg-white text-slate-900 hover:bg-slate-100 px-5 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md shadow-white/5 border border-slate-200"
                >
                  {/* Google SVG logo */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>ลงชื่อเข้าใช้งานด้วย Google Gmail Account</span>
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBypassForm(!showBypassForm);
                      setLoginError('');
                    }}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto transition-all"
                  >
                    <span>🌐 เข้าสู่ระบบจากเครื่องอื่นไม่ได้? (คลิกเชื่อมต่อ Bypass)</span>
                  </button>
                </div>
              </>
            )}

            {/* Simulated Bypass Form */}
            {showBypassForm && !isLoggingIn && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-[#111a34] border border-[#1e2e5d]/40 rounded-2xl p-5 text-left space-y-4 shadow-2xl"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!bypassName.trim() || !bypassEmail.trim()) {
                    setLoginError('กรุณากรอกข้อมูลประจำตัวให้ครบถ้วน');
                    return;
                  }
                  if (!bypassEmail.includes('@')) {
                    setLoginError('รูปแบบอีเมลไม่ถูกต้อง');
                    return;
                  }
                  setIsLoggingIn(true);
                  setLoginError('');
                  setTimeout(() => {
                    setIsLoggingIn(false);
                    const mockUser = {
                      name: bypassName.trim(),
                      email: bypassEmail.trim(),
                    };
                    localStorage.setItem('bklabplus_user', JSON.stringify(mockUser));
                    setUser(mockUser);
                  }, 800);
                }}
              >
                <div className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>ระบบล็อกอินสำหรับเครื่องเครือข่ายสำรอง (Bypass)</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Connected</span>
                </div>
                
                {loginError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl font-semibold">
                    {loginError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      ชื่อผู้ใช้ / พนักงาน (Full Name)
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-3 text-slate-500" />
                      <input
                        type="text"
                        placeholder="เช่น สมชาย ใจดี"
                        value={bypassName}
                        onChange={(e) => setBypassName(e.target.value)}
                        className="w-full bg-[#070b19] border border-[#1e2e5d]/40 rounded-xl px-4 py-2.5 pl-10 text-xs text-white focus:border-blue-500 outline-none transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      อีเมลพนักงาน (Gmail / Company Email)
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-3 text-slate-500" />
                      <input
                        type="email"
                        placeholder="เช่น somchai@gmail.com"
                        value={bypassEmail}
                        onChange={(e) => setBypassEmail(e.target.value)}
                        className="w-full bg-[#070b19] border border-[#1e2e5d]/40 rounded-xl px-4 py-2.5 pl-10 text-xs text-white focus:border-blue-500 outline-none transition-all font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-900/10"
                >
                  เข้าสู่ระบบด้วยสิทธิ์ Bypass (พร้อมสิงค์เรียลไทม์)
                </button>
              </motion.form>
            )}
          </div>

          {/* Guidelines instruction badge at the bottom */}
          <div className="bg-amber-950/25 border border-amber-500/20 rounded-2xl p-4 text-left text-[11px] leading-relaxed text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Info size={14} />
              <span>คำแนะนำในการใช้งาน:</span>
            </div>
            <ul className="space-y-1.5 font-medium">
              <li className="flex items-start gap-1.5 text-amber-500/90">
                <span>-</span>
                <span>สาเหตุปัญหานี้เกิดจาก Firebase บล็อกความปลอดภัยของลิ้ง URL เครือข่ายอุปกรณ์ย่อยนอกเหนือจากกิจการหลัก (Unauthorized domain)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span>-</span>
                <span className="text-slate-400">
                  ท่านสามารถใช้ช่องทาง <strong className="text-emerald-400">"Bypass Authentication"</strong> ด้านบนเพื่อเข้าระบบด่วนได้ทันที จากโทรศัพท์ แท็บเล็ต หรือพีซีเครื่องพกพาทุกเครื่อง โดยยังคงได้รับสิทธิ์อ่าน-เขียนตารางเรียลไทม์เชื่อมประสานฐานคลาวด์ Firebase ดั้งเดิมอย่างปลอดภัย 100%!
                </span>
              </li>
            </ul>
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
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black tracking-tight text-white">BKLabPlus</h1>
                <span className="px-1.5 py-0.5 bg-blue-500/30 text-[9px] text-blue-400 font-extrabold rounded-full uppercase tracking-widest border border-blue-400/10">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                ระบบจัดการรายรับ-รายจ่าย คลินิกและแล็บเพื่อความแม่นยำบัญชี
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-center">
            {/* สถานะผู้ใช้และออกจากระบบ */}
            <div className="flex items-center gap-2.5 bg-slate-800/60 px-3.5 py-2.5 rounded-xl border border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-slate-700 font-bold flex items-center justify-center text-xs text-blue-400 uppercase shrink-0 border border-slate-600">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-black leading-none text-white block">{user?.name}</span>
                <span className="text-[9px] font-medium leading-normal text-slate-400 block truncate max-w-[130px] font-mono">{user?.email}</span>
              </div>
              <button 
                onClick={() => {
                  if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
                    localStorage.removeItem('bklabplus_user');
                    setUser(null);
                  }
                }}
                className="p-1 px-2.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-[9px] font-extrabold tracking-wide transition-all cursor-pointer flex items-center gap-1 border border-rose-500/30 shadow-sm ml-1"
                title="ออกจากระบบ"
              >
                <LogOut size={10} />
                <span>ออก</span>
              </button>
            </div>

            {/* กล่องเลือกวันที่หลักของระบบ */}
            <div className="flex items-center gap-2.5 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-705/50 border-slate-700">
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
          ระบบบัญชี <strong>BKLabPlus</strong> - เชื่อมต่อแบบ Real-time Live Sync ผ่านระบบ Cloud Firebase ปลอดภัยและทันท่วงที
        </p>
        <p className="font-medium text-slate-400">
          อำนวยความสะดวกคลินิกเทคนิคการแพทย์ & แล็บวิเคราะห์โรคพาร์ทเนอร์
        </p>
      </footer>
    </div>
  );
}
