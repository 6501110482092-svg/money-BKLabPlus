/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DailyRecord, ExpenseItem, OutLabItem, LabTestTemplate, Business } from '../types';
import { formatNumber, getLastDayOfMonth, isLastDayOfMonth } from '../constants';
import { loadLabTests, deduplicateExpenseItems } from '../utils/storage';
import { subscribeToLabTests } from '../utils/firebase';
import {
  Plus,
  Trash2,
  Save,
  Calendar,
  CheckCircle,
  Search,
  AlertCircle,
  EyeOff,
  CalendarClock,
  Receipt,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpenseModuleProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  record: DailyRecord;
  onSaveRecord: (record: DailyRecord) => void;
  activeBusinessId?: string;
  activeBusiness?: Business;
  businesses?: Business[];
}

export default function ExpenseModule({
  currentDate,
  onDateChange,
  record,
  onSaveRecord,
  activeBusinessId,
  activeBusiness,
  businesses,
}: ExpenseModuleProps) {
  // 1. รายจ่ายทั่วไป
  const [generalExpenses, setGeneralExpenses] = useState<ExpenseItem[]>([]);
  // 2. Out-Lab
  const [outLabExpenses, setOutLabExpenses] = useState<OutLabItem[]>([]);
  const [hasOutLab, setHasOutLab] = useState(true);

  // ข้อมูล Test แนะนำสำหรับ Autocomplete
  const [testTemplates, setTestTemplates] = useState<LabTestTemplate[]>([]);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const [showSavedToast, setShowSavedToast] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevRecordRef = useRef<string>('');

  // ตรวจสอบวันสิ้นเดือน (Last Day of Month)
  const lastDayOfMonth = useMemo(() => getLastDayOfMonth(currentDate), [currentDate]);
  const isLastDay = useMemo(() => isLastDayOfMonth(currentDate), [currentDate]);

  // Fix Costs ประจำธุรกิจ
  const currentBizFixCosts = useMemo(() => {
    return activeBusiness?.fixCosts || [];
  }, [activeBusiness]);

  // โหลดรายการและเติม Fix Cost ในวันสิ้นเดือนอย่างปลอดภัย (Deduplicated 100% ไม่ซ้ำซ้อน)
  useEffect(() => {
    let rawExpenses: ExpenseItem[] = deduplicateExpenseItems(record?.expenseItems || []);

    // ถ้าเป็นวันสิ้นเดือน และมี fix costs ที่ยังไม่เคยลง ให้เติมเพิ่มเข้าตาราง
    if (isLastDay && currentBizFixCosts.length > 0) {
      const existingNames = new Set(
        rawExpenses.map((item) => (item.description || '').trim().toLowerCase())
      );
      const missingFixCosts = currentBizFixCosts.filter(
        (fc) => !existingNames.has(fc.name.trim().toLowerCase())
      );

      if (missingFixCosts.length > 0) {
        const newFixItems: ExpenseItem[] = missingFixCosts.map((fc, idx) => ({
          id: `gen-fix-${fc.id || Date.now()}-${idx}`,
          description: fc.name,
          amount: fc.amount || 0,
        }));
        rawExpenses = [...rawExpenses, ...newFixItems];
      }
    }

    const cleanedExpenses = deduplicateExpenseItems(rawExpenses);

    const serializedRecord = JSON.stringify({
      expenseItems: cleanedExpenses,
      outLabItems: record?.outLabItems || [],
      hasOutLab: record?.hasOutLab !== false,
    });

    if (serializedRecord !== prevRecordRef.current) {
      setGeneralExpenses(cleanedExpenses);
      setOutLabExpenses(record?.outLabItems || []);
      setHasOutLab(record?.hasOutLab !== false);
      prevRecordRef.current = serializedRecord;
    }
  }, [record, currentDate, isLastDay, currentBizFixCosts]);

  // ฟังก์ชันเติม Fix Cost ลงในตารางทันที (สำหรับกดสั่งเองหรือดึงมาใช้วันนี้)
  const handleForcePopulateFixCosts = () => {
    if (currentBizFixCosts.length === 0) {
      alert(`ธุรกิจ "${activeBusiness?.name || ''}" ยังไม่มีรายการ Fix Cost ที่ตั้งค่าไว้ครับ (สามารถไปเพิ่มได้ที่แท็บ จัดการธุรกิจและชุดตรวจ)`);
      return;
    }

    const existingNames = new Set(
      generalExpenses.map((item) => (item.description || '').trim().toLowerCase())
    );
    const missingFixCosts = currentBizFixCosts.filter(
      (fc) => !existingNames.has(fc.name.trim().toLowerCase())
    );

    if (missingFixCosts.length === 0) {
      alert('รายการ Fix Cost ประจำเดือนทั้งหมดมีอยู่ในตารางรายจ่ายแล้วครับ (ไม่มีรายการซ้ำ)');
      return;
    }

    const newFixItems: ExpenseItem[] = missingFixCosts.map((fc, idx) => ({
      id: `gen-fix-${Date.now()}-${idx}`,
      description: fc.name,
      amount: fc.amount || 0,
    }));

    setGeneralExpenses(deduplicateExpenseItems([...generalExpenses, ...newFixItems]));
  };

  // ระบบ Auto-Save บันทึกข้อมูลรายจ่ายและ Out-Lab เรียลไทม์เบื้องหลังเมื่อหยุดพิมพ์ 1.2 วินาที
  const recordRef = useRef(record);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const validGeneral = generalExpenses.filter(
        (item) => item.description.trim() !== '' || item.amount > 0
      );
      const validOutLab = hasOutLab
        ? outLabExpenses.filter(
            (item) =>
              item.labNumber.trim() !== '' ||
              item.testName.trim() !== '' ||
              item.amount > 0
          )
        : [];

      const serializedLocal = JSON.stringify({
        expenseItems: validGeneral,
        outLabItems: validOutLab,
        hasOutLab,
      });
      const currentRecordLatest = recordRef.current;
      const serializedProp = JSON.stringify({
        expenseItems: currentRecordLatest?.expenseItems || [],
        outLabItems: currentRecordLatest?.outLabItems || [],
        hasOutLab: currentRecordLatest?.hasOutLab !== false,
      });

      if (serializedLocal !== serializedProp) {
        const updatedRecord: DailyRecord = {
          ...currentRecordLatest,
          expenseItems: validGeneral,
          outLabItems: validOutLab,
          hasOutLab,
        };
        prevRecordRef.current = serializedLocal;
        onSaveRecord(updatedRecord);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [generalExpenses, outLabExpenses, hasOutLab]);

  // ซิงค์เทมเพลตชุดตรวจ Autocomplete
  useEffect(() => {
    setTestTemplates(loadLabTests());
    const unsubscribe = subscribeToLabTests((updatedTests) => {
      setTestTemplates(updatedTests);
    });
    return () => unsubscribe();
  }, []);

  // ซ่อน Dropdown เมื่อคลิกนอกขอบเขต
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ฟังก์ชันรายจ่ายทั่วไป
  const addGeneralExpense = () => {
    const newItem: ExpenseItem = {
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: '',
      amount: 0,
    };
    setGeneralExpenses([...generalExpenses, newItem]);
    setTimeout(() => {
      const inputs = document.querySelectorAll('.gen-desc-input');
      if (inputs.length > 0) {
        (inputs[inputs.length - 1] as HTMLInputElement).focus();
      }
    }, 50);
  };

  const handleGeneralChange = (index: number, field: keyof ExpenseItem, value: string | number) => {
    const updated = [...generalExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setGeneralExpenses(updated);
  };

  const removeGeneralExpense = (id: string) => {
    setGeneralExpenses(generalExpenses.filter((item) => item.id !== id));
  };

  // ฟังก์ชันรายจ่ายส่งแล็บนอก
  const addOutLabExpense = () => {
    if (!hasOutLab) {
      setHasOutLab(true);
    }
    const newItem: OutLabItem = {
      id: `outlab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      labNumber: '',
      testName: '',
      amount: 0,
    };
    setOutLabExpenses([...outLabExpenses, newItem]);
    setTimeout(() => {
      const inputs = document.querySelectorAll('.lab-number-input');
      if (inputs.length > 0) {
        (inputs[inputs.length - 1] as HTMLInputElement).focus();
      }
    }, 50);
  };

  const handleOutLabChange = (index: number, field: keyof OutLabItem, value: string | number) => {
    const updated = [...outLabExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setOutLabExpenses(updated);
  };

  const removeOutLabExpense = (id: string) => {
    setOutLabExpenses(outLabExpenses.filter((item) => item.id !== id));
  };

  const handleNoOutLab = () => {
    setHasOutLab(!hasOutLab);
  };

  const totalGeneral = generalExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalOutLab = hasOutLab
    ? outLabExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    : 0;
  const totalExpense = totalGeneral + totalOutLab;

  const handleSaveAll = () => {
    const validGeneral = generalExpenses.filter(
      (item) => item.description.trim() !== '' || item.amount > 0
    );
    const validOutLab = hasOutLab
      ? outLabExpenses.filter(
          (item) =>
            item.labNumber.trim() !== '' ||
            item.testName.trim() !== '' ||
            item.amount > 0
        )
      : [];

    const updatedRecord: DailyRecord = {
      ...record,
      expenseItems: validGeneral,
      outLabItems: validOutLab,
      hasOutLab: hasOutLab,
    };

    prevRecordRef.current = JSON.stringify({
      expenseItems: validGeneral,
      outLabItems: validOutLab,
      hasOutLab: hasOutLab,
    });

    onSaveRecord(updatedRecord);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);

    setGeneralExpenses(validGeneral);
    setOutLabExpenses(validOutLab);
  };

  // บันทึกด้วยคีย์ลัด F8
  const saveRef = useRef(handleSaveAll);
  useEffect(() => {
    saveRef.current = handleSaveAll;
  });

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        e.stopPropagation();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  const handleGeneralKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addGeneralExpense();
    }
  };

  const handleOutLabKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOutLabExpense();
    }
  };

  const selectTemplate = (index: number, template: LabTestTemplate) => {
    const updated = [...outLabExpenses];
    updated[index] = {
      ...updated[index],
      testName: template.name,
      amount: template.defaultPrice,
    };
    setOutLabExpenses(updated);
    setActiveDropdownId(null);
  };

  return (
    <div className="space-y-6" id="expense-module-container">
      {/* ส่วนควบคุม วันที่ */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-150 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium block">แก้ไขข้อมูลของวันที่</span>
              <input
                type="date"
                id="expense-date-picker"
                value={currentDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-sm font-semibold text-gray-700 outline-none border border-gray-205 focus:border-rose-500 rounded px-2.5 py-1 bg-gray-50 cursor-pointer"
              />
            </div>
          </div>

          {/* ป้ายแสดงสถานะวันสิ้นเดือน */}
          {isLastDay && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              <CalendarClock size={14} className="text-amber-600" />
              <span>วันสิ้นเดือนของ {currentDate.slice(0, 7)} (ลง Fix Cost อัตโนมัติ)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-amber-50/50 px-3 py-1.5 rounded-xl border border-amber-100">
            <span className="text-amber-800 font-bold">คีย์ลัด:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs font-bold text-slate-600">F8</kbd>
            <span className="text-amber-800 font-bold">เพื่อบันทึก</span>
          </span>
          <button
            onClick={handleSaveAll}
            id="btn-save-expense"
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-sm transition-all shadow-xs cursor-pointer"
          >
            <Save size={16} />
            <span>บันทึกรายจ่ายของวัน</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============================================================== */}
        {/* 1. รายจ่ายทั่วไป (General Expense) พร้อมระบบ Fix Cost อัตโนมัติ */}
        {/* ============================================================== */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-150 flex flex-col justify-between" id="general-expense-panel">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <h3 className="font-semibold text-gray-800 text-base">รายจ่ายทั่วไป (General Expense)</h3>
              </div>
              <button
                onClick={addGeneralExpense}
                id="btn-add-general-expense"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>เพิ่มรายการ</span>
              </button>
            </div>

            {/* แถบแจ้งเตือน Fix Cost */}
            {isLastDay ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0">
                    <CalendarClock size={15} />
                  </span>
                  <div>
                    <span className="font-extrabold text-blue-900 block">
                      📅 วันนี้คือวันสิ้นเดือน: ระบบลงรายการ Fix Cost ประจำเดือนของ "{activeBusiness?.name || 'ธุรกิจ'}" ไว้รอแล้ว
                    </span>
                    <span className="text-[11px] text-blue-700/80">
                      รายการผันแปร (เช่น <strong>ค่าไฟ</strong>) สามารถพิมพ์ใส่จำนวนเงินในช่องยอดเงินได้เลยครับ
                    </span>
                  </div>
                </div>
                {currentBizFixCosts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleForcePopulateFixCosts}
                    className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer text-[11px]"
                  >
                    🔄 เติม Fix Cost ซ้ำ
                  </button>
                )}
              </div>
            ) : (
              currentBizFixCosts.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Receipt size={14} className="text-slate-500 shrink-0" />
                    <span className="text-slate-600">
                      💡 ธุรกิจนี้มี Fix Cost <strong>{currentBizFixCosts.length} รายการ</strong> (จะลงอัตโนมัติในวันสิ้นเดือน <strong>{lastDayOfMonth}</strong>)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDateChange(lastDayOfMonth)}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 px-2 py-1 rounded-md border border-blue-200 transition-colors cursor-pointer"
                    >
                      📅 ไปวันสิ้นเดือน
                    </button>
                    <button
                      type="button"
                      onClick={handleForcePopulateFixCosts}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 px-2 py-1 rounded-md border border-slate-200 transition-colors cursor-pointer"
                      title="ดึงรายการ Fix Cost ประจำเดือนมาลงในวันที่ปัจจุบันนี้ทันที"
                    >
                      📥 ดึงมาลงวันนี้
                    </button>
                  </div>
                </div>
              )
            )}

            {generalExpenses.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl my-2">
                <p className="text-gray-400 text-sm">ยังไม่มีรายการค่าใช้จ่ายทั่วไป</p>
                <button
                  onClick={addGeneralExpense}
                  className="mt-2 text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  + เพิ่มรายการแรก
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {generalExpenses.map((item, index) => {
                  const isVariableWaiting = (!item.amount || item.amount === 0) && item.description.trim() !== '';

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-2 items-center"
                    >
                      <input
                        type="text"
                        className="gen-desc-input flex-1 text-sm border border-gray-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 outline-none py-1.5 px-3 rounded-lg bg-gray-50/50"
                        placeholder="รายการรายจ่ายทั่วไป (เช่น ค่าน้ำ, ค่าของ, ค่าไฟ)"
                        value={item.description}
                        onChange={(e) => handleGeneralChange(index, 'description', e.target.value)}
                        onKeyDown={handleGeneralKeyDown}
                      />

                      {/* ช่องกรอกจำนวนเงิน พร้อมป้ายเตือนกรณีค่าไฟหรือยอดผันแปรที่รอใส่ตัวเลข */}
                      <div className="relative w-36">
                        <input
                          type="number"
                          className={`w-full text-right text-sm border focus:border-rose-500 focus:ring-1 focus:ring-rose-200 outline-none py-1.5 pr-6 pl-3 rounded-lg ${
                            isVariableWaiting
                              ? 'bg-amber-50/60 border-amber-300 text-amber-900 font-bold placeholder-amber-400 ring-1 ring-amber-200'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                          placeholder="0.00"
                          value={item.amount || ''}
                          onChange={(e) => handleGeneralChange(index, 'amount', parseFloat(e.target.value) || 0)}
                          onKeyDown={handleGeneralKeyDown}
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-gray-400">฿</span>
                      </div>

                      <button
                        onClick={() => removeGeneralExpense(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="ลบรายการ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/70 p-3 rounded-xl flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">รวมรายจ่ายทั่วไป:</span>
            <span className="text-lg font-bold text-rose-600">฿ {formatNumber(totalGeneral)}</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. รายจ่ายส่งแล็บนอก (Out-Lab Expense) */}
        {/* ============================================================== */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-150 flex flex-col justify-between" id="outlab-expense-panel">
          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 pb-4 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${hasOutLab ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`}></span>
                <h3 className="font-semibold text-gray-800 text-base">ส่งแล็บนอก (Out-Lab Expense)</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleNoOutLab}
                  id="btn-no-outlab"
                  className={`px-3 py-1.5 rounded-lg border transition-all font-semibold cursor-pointer ${
                    !hasOutLab
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {!hasOutLab ? '✓ ไม่มีส่งแล็บวันนี้ (ปิดแล็บ)' : 'วันนี้ไม่มีส่งแล็บ'}
                </button>
                {hasOutLab && (
                  <button
                    onClick={addOutLabExpense}
                    id="btn-add-outlab"
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-semibold transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>เพิ่มรายการ</span>
                  </button>
                )}
              </div>
            </div>

            {!hasOutLab ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-gray-100 space-y-2">
                <EyeOff size={24} className="mx-auto text-gray-400" />
                <p className="text-gray-500 text-sm font-semibold">วันนี้ไม่มีประวัติส่งแล็บนอก (ยอดเป็น 0)</p>
                <p className="text-gray-400 text-xs">หากต้องการบันทึกแล็บ ให้คลิกที่ปุ่ม "+ เพิ่มรายการ" หรือปิดสถานะด้านบน</p>
              </div>
            ) : outLabExpenses.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl my-2">
                <p className="text-gray-400 text-sm">ยังไม่มีรายการส่งแล็บนอก</p>
                <button
                  onClick={addOutLabExpense}
                  className="mt-2 text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
                >
                  + เพิ่มรายการแรก
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {outLabExpenses.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2 items-center"
                  >
                    <input
                      type="text"
                      className="lab-number-input w-28 text-sm border border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-none py-1.5 px-3 rounded-lg bg-gray-50/50 font-mono"
                      placeholder="LN (เลขแล็บ)"
                      value={item.labNumber}
                      onChange={(e) => handleOutLabChange(index, 'labNumber', e.target.value)}
                      onKeyDown={handleOutLabKeyDown}
                    />

                    <div className="relative flex-1">
                      <input
                        type="text"
                        className="test-name-input w-full text-sm border border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-none py-1.5 px-3 rounded-lg bg-gray-50/50"
                        placeholder="ชื่อรายการตรวจ (Test)"
                        value={item.testName}
                        onChange={(e) => {
                          handleOutLabChange(index, 'testName', e.target.value);
                          setSearchFilter(e.target.value);
                          setActiveDropdownId(item.id);
                        }}
                        onFocus={() => {
                          setSearchFilter(item.testName);
                          setActiveDropdownId(item.id);
                        }}
                        onKeyDown={handleOutLabKeyDown}
                      />

                      {/* Dropdown Autocomplete */}
                      {activeDropdownId === item.id && (
                        <div
                          ref={dropdownRef}
                          className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                        >
                          {testTemplates
                            .filter((t) => t.name.toLowerCase().includes(searchFilter.toLowerCase()))
                            .map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => selectTemplate(index, t)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex justify-between items-center border-b border-gray-50 cursor-pointer"
                              >
                                <span className="font-semibold text-gray-700">{t.name}</span>
                                <span className="text-amber-600 font-mono font-bold">฿{t.defaultPrice}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="relative w-32">
                      <input
                        type="number"
                        className="w-full text-right text-sm border border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-none py-1.5 pr-6 pl-3 rounded-lg bg-gray-50 text-gray-700"
                        placeholder="0.00"
                        value={item.amount || ''}
                        onChange={(e) => handleOutLabChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        onKeyDown={handleOutLabKeyDown}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-gray-400">฿</span>
                    </div>

                    <button
                      onClick={() => removeOutLabExpense(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="ลบรายการ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/70 p-3 rounded-xl flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">รวมส่งแล็บนอก:</span>
            <span className="text-lg font-bold text-amber-600">฿ {formatNumber(totalOutLab)}</span>
          </div>
        </div>
      </div>

      {/* บอร์ดสรุปรวมทั้งหมดของวัน */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800" id="expense-summary-panel">
        <h4 className="text-sm font-medium text-slate-400 tracking-wider uppercase mb-1">รายจ่ายรวมทั้งหมดประจำวัน</h4>
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mt-2">
          <span className="text-4xl font-extrabold text-rose-400">
            ฿ {formatNumber(totalExpense)}
          </span>
          <div className="flex gap-6 mt-2 md:mt-0 text-sm">
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-xs mb-0.5">รายจ่ายทั่วไป</span>
              <span className="font-semibold text-rose-400">฿ {formatNumber(totalGeneral)}</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-xs mb-0.5">ส่งแล็บนอก (Out-Lab)</span>
              <span className="font-semibold text-amber-400">฿ {formatNumber(totalOutLab)}</span>
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
              <p className="text-sm font-semibold">บันทึกข้อมูลเรียบร้อย</p>
              <p className="text-xs text-slate-400">ระบบบันทึกรายจ่ายของวันที่ {currentDate} แล้ว</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
