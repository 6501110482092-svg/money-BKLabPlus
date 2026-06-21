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
  const [allRecords, setAllRecords] = useState<Record<string, DailyRecord>>({});



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
