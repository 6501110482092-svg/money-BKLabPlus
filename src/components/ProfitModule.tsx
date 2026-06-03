/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { DailyRecord } from '../types';
import { formatNumber } from '../constants';
import { Save, Calendar, CheckCircle, AlertTriangle, Coins, TrendingUp, ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfitModuleProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  record: DailyRecord;
  onSaveRecord: (record: DailyRecord) => void;
}

export default function ProfitModule({
  currentDate,
  onDateChange,
  record,
  onSaveRecord,
}: ProfitModuleProps) {
  const [countedCash, setCountedCash] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // คำนวณยอดเงินเบื้องต้น
  const cashIncome = record.incomeItems
    .filter((item) => item.type === 'cash')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const transferIncome = record.incomeItems
    .filter((item) => item.type === 'transfer')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const totalIncome = cashIncome + transferIncome;

  const generalExpense = record.expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const outLabExpense = record.hasOutLab !== false
    ? record.outLabItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    : 0;

  const totalExpense = generalExpense + outLabExpense;

  // 1) รายได้สุทธิ = (เงินสด + เงินโอน) - รายจ่าย - Out-Lab
  const netProfit = totalIncome - totalExpense;

  // 2) ยอดเงินสดที่ควรจะมี = เงินสด - รายจ่าย - Out-Lab
  const expectedCash = cashIncome - generalExpense - outLabExpense;

  // ซิงค์ยอดเงินที่บันทึกไว้ใน record
  useEffect(() => {
    setCountedCash(record.cashCheck?.countedCash || 0);
    setNote(record.cashCheck?.note || '');
    setValidationError(null);
  }, [record, currentDate]);

  // ตรวจสอบ ลอจิก
  const diff = countedCash - expectedCash;
  const isCorrect = Math.abs(diff) < 0.01;

  // ตรวจสอบเงื่อนไขว่า ถ้าไม่ตรง -> ต้องกรอก "หมายเหตุ" ก่อนบันทึก
  const handleSave = () => {
    if (!isCorrect && note.trim() === '') {
      setValidationError('ยอดเงินจริงที่นับได้ไม่ตรงกับยอดทางบัญชี กรุณากรอก "หมายเหตุ" ก่อนบันทึกข้อมูล');
      return;
    }

    setValidationError(null);

    const updatedRecord: DailyRecord = {
      ...record,
      cashCheck: {
        countedCash,
        note,
        isSaved: true,
      },
    };

    onSaveRecord(updatedRecord);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  // บันทึกด้วยคีย์ลัด Alt + S, F8 หรือ Ctrl / Cmd + S (ใช้ capture ป้องกันเบราว์เซอร์ดึงไปใช้ก่อน)
  const saveRef = useRef(handleSave);
  useEffect(() => {
    saveRef.current = handleSave;
  });

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isAltS = e.altKey && e.key.toLowerCase() === 's';
      const isCtrlS = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
      const isF8 = e.key === 'F8';

      if (isAltS || isCtrlS || isF8) {
        e.preventDefault();
        e.stopPropagation();
        saveRef.current();
      }
    };
    // ใช้ capture = true เพื่อดักจับ Event ก่อนที่จะถูก Browser หรือ Element อื่นขักขวาง
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  return (
    <div className="space-y-6" id="profit-module-container">
      {/* ส่วนควบคุม วันที่ */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-150 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block">ตรวจสอบข้อมูลของวันที่</span>
            <input
              type="date"
              id="profit-date-picker"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-sm font-semibold text-gray-700 outline-none border border-gray-250 focus:border-emerald-500 rounded px-2.5 py-1 bg-gray-50/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-amber-50/50 px-3 py-1.5 rounded-xl border border-amber-100">
            <span className="text-amber-800 font-bold">คีย์ลัดแนะนำ:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs font-bold text-slate-600">Alt</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs font-bold text-slate-600">S</kbd>
            <span className="text-slate-400">หรือ</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs font-bold text-slate-600">F8</kbd>
            <span className="text-slate-400">/</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs font-bold text-slate-400">Ctrl+S</kbd>
            <span className="text-amber-800 font-bold">เพื่อบันทึก</span>
          </span>
          <button
            onClick={handleSave}
            id="btn-save-profit"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-all shadow-xs"
          >
            <Save size={16} />
            <span>บันทึกผลการตรวจสอบ</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* บอร์ดคำนวณและสูตรหลัก */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-6">
            <span className="text-base font-bold text-gray-800 border-b pb-2.5 block">การคำนวณรายได้สุทธิ และสถานะบัญชี</span>

            {/* การวิเคราะห์แผ่นกระดาษ */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/80 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-gray-400 block mb-1">รายรับ (เงินสด + โอน)</span>
                  <span className="text-xl font-bold text-slate-800">฿ {formatNumber(totalIncome)}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 flex flex-col">
                  <span>เงินสด: ฿{formatNumber(cashIncome)}</span>
                  <span>เงินโอน: ฿{formatNumber(transferIncome)}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-gray-400 block mb-1">รายจ่ายรวมทั้งหมด</span>
                  <span className="text-xl font-bold text-red-600">฿ {formatNumber(totalExpense)}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 flex flex-col">
                  <span>จ่ายทั่วไป: ฿{formatNumber(generalExpense)}</span>
                  <span>Out-Lab: ฿{formatNumber(outLabExpense)}</span>
                </div>
              </div>
            </div>

            {/* (1) รายได้สุทธิ (Profit Summary Card) */}
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-xs">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-800 tracking-wide uppercase">รายได้สุทธิประจำวัน</span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">สูตร: (เงินสด + เงินโอน) - รายจ่าย</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ฿ {formatNumber(netProfit)}
                </span>
              </div>
            </div>

            {/* เตือน Out-Lab */}
            {outLabExpense > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-3 animate-pulse" id="outlab-reserve-alert">
                <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h5 className="text-sm font-bold text-rose-900">ต้องกันเงิน Out-Lab!</h5>
                  <p className="text-xs text-rose-700 mt-0.5">
                    กรุณากันเงินสำรองจ่าย Out-Lab ออกจากจำนวนเงินสดหน้าร้านวันนี้ เป็นจำนวนกลมๆ{' '}
                    <span className="font-extrabold text-rose-900 underline">฿ {formatNumber(outLabExpense)}</span> นำส่งแล็บพาร์ทเนอร์ในภายหลัง
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* (2) ตรวจสอบเงินสด (Cash Verification Pane) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <span className="text-base font-bold text-gray-800 border-b pb-2.5 block">ตรวจสอบเงินสดหน้างาน</span>

              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-1.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-widest block font-medium">
                  ยอดเงินสดตามระบบที่ควรจะมี
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-400">
                    ฿ {formatNumber(expectedCash)}
                  </span>
                  <span className="text-[10px] text-slate-400">(เงินสดในมือหลังหักค่าใช้จ่าย)</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                  คำนวณจาก: รับเงินสด (฿{formatNumber(cashIncome)}) - จ่ายรวม (฿{formatNumber(totalExpense)})
                </div>
              </div>

              {/* ตารางกล่องกรอกเงินสดที่นับได้ */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">เงินสดที่นับได้จริง (Counted Cash):</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="number"
                    value={countedCash || ''}
                    id="counted-cash-input"
                    onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                    placeholder="ใส่จำนวนเงินสดที่ตรวจนับจริง"
                    className="w-full text-lg font-bold pl-10 pr-8 py-2.5 border border-gray-200 outline-none rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100"
                  />
                  <span className="absolute right-3 top-3 text-sm text-gray-400">฿</span>
                </div>
              </div>

              {/* เปรียบเทียบแจ้งเตือน */}
              <div className="pt-2">
                {isCorrect ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 font-semibold text-xs" id="status-cash-correct">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>เงินถูกต้อง</span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-1.5 text-rose-800 text-xs" id="status-cash-incorrect">
                    <div className="flex items-center gap-2 font-bold text-rose-900">
                      <AlertTriangle className="text-rose-600 shrink-0" size={16} />
                      {diff < 0 ? (
                        <span>ขาด {formatNumber(Math.abs(diff))} บาท</span>
                      ) : (
                        <span>เกิน {formatNumber(diff)} บาท</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-[11px]">
                      ยอดเงินจริงไม่ตรงกับระบบบัญชีคณนา กรุณากรอก "หมายเหตุ" กำกับเรื่องขาดหรือเกินด้านล่างนี้
                    </p>
                  </div>
                )}
              </div>

              {/* ช่องหมายเหตุ */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-gray-600 block flex items-center justify-between">
                  <span>หมายเหตุ (Note):</span>
                  {!isCorrect && (
                    <span className="text-[10px] text-rose-600 font-bold">* บังคับกรอก</span>
                  )}
                </label>
                <textarea
                  value={note}
                  id="cash-note-textarea"
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ตังค์ทอนผิด, จ่ายค่าส่งของลืมคีย์, รับมาเกินเป็นทิป ฯลฯ"
                  rows={2}
                  className="w-full p-2.5 border border-gray-200 outline-none rounded-lg text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 bg-gray-50/50"
                />
              </div>

              {/* ข้อผิดพลาด Validation */}
              {validationError && (
                <div className="p-3 bg-red-100 border-l-4 border-red-500 rounded text-red-800 text-xs font-bold leading-relaxed">
                  {validationError}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-100 transition-all text-center"
              >
                ตรวจยืนยันและอัปเดตยอดเงิน
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50"
          >
            <CheckCircle className="text-emerald-400" size={20} />
            <div>
              <p className="text-sm font-semibold">ตรวจสอบเงินสดเรียบร้อย</p>
              <p className="text-xs text-slate-400">เก็บบันทึกข้อมูลการนับและลอจิกกำกับเงินแล้ว</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
