/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { DailyRecord, ExpenseItem, OutLabItem, LabTestTemplate } from '../types';
import { formatNumber } from '../constants';
import { loadLabTests } from '../utils/storage';
import { subscribeToLabTests } from '../utils/firebase';
import { Plus, Trash2, Save, Calendar, CheckCircle, Search, AlertCircle, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpenseModuleProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  record: DailyRecord;
  onSaveRecord: (record: DailyRecord) => void;
}

export default function ExpenseModule({
  currentDate,
  onDateChange,
  record,
  onSaveRecord,
}: ExpenseModuleProps) {
  // 1. รายจ่ายทั่วไป
  const [generalExpenses, setGeneralExpenses] = useState<ExpenseItem[]>([]);
  // 2. Out-Lab
  const [outLabExpenses, setOutLabExpenses] = useState<OutLabItem[]>([]);
  const [hasOutLab, setHasOutLab] = useState(true);

  // ข้อมูล Test แนะนำสำหรับ Autocomplete
  const [testTemplates, setTestTemplates] = useState<LabTestTemplate[]>([]);
  const [activeSelectIndex, setActiveSelectIndex] = useState<number | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const [showSavedToast, setShowSavedToast] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevRecordRef = useRef<string>('');

  // โหลดรายการ
  useEffect(() => {
    const serializedRecord = JSON.stringify({
      expenseItems: record?.expenseItems || [],
      outLabItems: record?.outLabItems || [],
      hasOutLab: record?.hasOutLab !== false
    });

    if (serializedRecord !== prevRecordRef.current) {
      setGeneralExpenses(record?.expenseItems || []);
      setOutLabExpenses(record?.outLabItems || []);
      setHasOutLab(record?.hasOutLab !== false); // Default เป็น true ถ้าไม่มีค่าว่าง
      prevRecordRef.current = serializedRecord;
    }
  }, [record, currentDate]);

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
      const validGeneral = generalExpenses.filter((item) => item.description.trim() !== '' || item.amount > 0);
      const validOutLab = hasOutLab
        ? outLabExpenses.filter((item) => item.labNumber.trim() !== '' || item.testName.trim() !== '' || item.amount > 0)
        : [];

      const serializedLocal = JSON.stringify({
        expenseItems: validGeneral,
        outLabItems: validOutLab,
        hasOutLab
      });
      const currentRecordLatest = recordRef.current;
      const serializedProp = JSON.stringify({
        expenseItems: currentRecordLatest?.expenseItems || [],
        outLabItems: currentRecordLatest?.outLabItems || [],
        hasOutLab: currentRecordLatest?.hasOutLab !== false
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

  // หมวดซิงค์เทมเพลตชุดตรวจในแผนกวิเคราะห์ (Autocomplete Tests) แบบสดๆ
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

  // --- ฟังก์ชันรายจ่ายทั่วไป (General Expenses) ---
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

  // --- ฟังก์ชันรายจ่ายส่งแล็บนอก (Out-Lab Expenses) ---
  const addOutLabExpense = () => {
    if (!hasOutLab) {
      setHasOutLab(true); // เปิดแล็บอัตโนมัติหากผู้ใช้กลับมากดเพิ่มรายการ
    }
    const newItem: OutLabItem = {
      id: `outlab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      labNumber: '',
      testName: '',
      amount: 0,
    };
    setOutLabExpenses([...outLabExpenses, newItem]);
    setTimeout(() => {
      const inputs = document.querySelectorAll('.outlab-ln-input');
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

  // ปุ่มเปิดปิดส่งแล็บ
  const handleNoOutLab = () => {
    setHasOutLab(false);
    setOutLabExpenses([]); // ล้างรายการทั้งหมดของวันนี้ทันทีตามเงื่อนไขไม่มีแล็บ
  };

  // ยอดคำนวณทั้งหมด
  const totalGeneral = generalExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalOutLab = hasOutLab ? outLabExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : 0;
  const totalExpenses = totalGeneral + totalOutLab;

  // บันทึกรวม
  const handleSaveAll = () => {
    // กรองรายการเปล่า
    const validGeneral = generalExpenses.filter((item) => item.description.trim() !== '' || item.amount > 0);
    const validOutLab = hasOutLab
      ? outLabExpenses.filter((item) => item.labNumber.trim() !== '' || item.testName.trim() !== '' || item.amount > 0)
      : [];

    const updatedRecord: DailyRecord = {
      ...record,
      expenseItems: validGeneral,
      outLabItems: validOutLab,
      hasOutLab: hasOutLab,
    };

    // อัปเดต ref ตัวอ้างอิงข้อมูลล่าสุดที่บันทึก เพื่อไม่ให้โดนตีความว่าถูกแก้ไขหลังจากรับ prop ใหม่
    prevRecordRef.current = JSON.stringify({
      expenseItems: validGeneral,
      outLabItems: validOutLab,
      hasOutLab: hasOutLab
    });

    onSaveRecord(updatedRecord);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);

    setGeneralExpenses(validGeneral);
    setOutLabExpenses(validOutLab);
  };

  // บันทึกด้วยคีย์ลัด F8 (ใช้ capture ป้องกันเบราว์เซอร์ดึงไปใช้ก่อน)
  const saveRef = useRef(handleSaveAll);
  useEffect(() => {
    saveRef.current = handleSaveAll;
  });

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isF8 = e.key === 'F8';

      if (isF8) {
        e.preventDefault();
        e.stopPropagation();
        saveRef.current();
      }
    };
    // ใช้ capture = true เพื่อดักจับ Event ก่อนที่จะถูก Browser หรือ Element อื่นขัดวาง
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  // คีย์ลัด Enter
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

  // เลือกไอเท็มจาก Autocomplete dropdown
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
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
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
              className="text-sm font-semibold text-gray-700 outline-none border border-gray-205 focus:border-rose-500 rounded px-2.5 py-1 bg-gray-50"
            />
          </div>
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
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-sm transition-all shadow-xs"
          >
            <Save size={16} />
            <span>บันทึกรายจ่ายของวัน</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. รายจ่ายทั่วไป */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-150 flex flex-col justify-between" id="general-expense-panel">
          <div>
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <h3 className="font-semibold text-gray-800 text-base">รายจ่ายทั่วไป (General Expense)</h3>
              </div>
              <button
                onClick={addGeneralExpense}
                id="btn-add-general-expense"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-all"
              >
                <Plus size={14} />
                <span>เพิ่มรายการ</span>
              </button>
            </div>

            {generalExpenses.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl my-2">
                <p className="text-gray-400 text-sm">ยังไม่มีรายการค่าใช้จ่ายทั่วไป</p>
                <button
                  onClick={addGeneralExpense}
                  className="mt-2 text-xs font-semibold text-rose-600 hover:underline"
                >
                  + เพิ่มรายการแรก
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {generalExpenses.map((item, index) => (
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
                      placeholder="รายการรายจ่ายทั่วไป (เช่น ค่าน้ำ, ค่าของ)"
                      value={item.description}
                      onChange={(e) => handleGeneralChange(index, 'description', e.target.value)}
                      onKeyDown={handleGeneralKeyDown}
                    />
                    <div className="relative w-32">
                      <input
                        type="number"
                        className="w-full text-right text-sm border border-gray-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 outline-none py-1.5 pr-6 pl-3 rounded-lg bg-gray-50 text-gray-700"
                        placeholder="0.00"
                        value={item.amount || ''}
                        onChange={(e) => handleGeneralChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        onKeyDown={handleGeneralKeyDown}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-gray-400">฿</span>
                    </div>
                    <button
                      onClick={() => removeGeneralExpense(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/70 p-3 rounded-xl flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">รวมรายจ่ายทั่วไป:</span>
            <span className="text-lg font-bold text-rose-600">฿ {formatNumber(totalGeneral)}</span>
          </div>
        </div>

        {/* 2. รายจ่ายส่งแล็บนอก (Out-Lab) */}
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
                  className={`px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                    !hasOutLab
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  ไม่มีส่ง Lab
                </button>
                <button
                  type="button"
                  onClick={addOutLabExpense}
                  id="btn-add-outlab"
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                    hasOutLab
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  <Plus size={12} />
                  <span>เพิ่มส่งแล็บ</span>
                </button>
              </div>
            </div>

            {!hasOutLab ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl my-2 bg-gray-50/50 flex flex-col items-center justify-center">
                <EyeOff className="text-gray-400 mb-2" size={32} />
                <p className="text-gray-500 font-medium text-sm">ระบุไว้ว่า "ไม่มีส่ง Lab" ในวันนี้</p>
                <p className="text-xs text-gray-400 mt-1">ค่าใช้จ่ายแล็บเป็น ฿0.00</p>
                <button
                  type="button"
                  onClick={() => {
                    setHasOutLab(true);
                    addOutLabExpense();
                  }}
                  className="mt-3 px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-all"
                >
                  เปลี่ยนเป็นส่งแล็บ (+ เพิ่มแล็บ)
                </button>
              </div>
            ) : outLabExpenses.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl my-2">
                <p className="text-gray-400 text-sm">ยังไม่มีส่งแล็บนอกของวันนี้</p>
                <button
                  onClick={addOutLabExpense}
                  className="mt-2 text-xs font-semibold text-amber-600 hover:underline"
                >
                  + เพิ่มรายการส่งแล็บนอก
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-visible pr-1" ref={dropdownRef}>
                {outLabExpenses.map((item, index) => {
                  // กรองรายการ Test ที่เข้าเกณฑ์ค้นหา
                  const activeFieldSearch = activeDropdownId === item.id ? searchFilter.toLowerCase() : '';
                  const filteredTemplates = testTemplates.filter((t) =>
                    t.name.toLowerCase().includes(activeFieldSearch)
                  );

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-[80px_1fr_100px_40px] gap-2 items-center relative"
                    >
                      {/* LN (Lab Number) */}
                      <div>
                        <input
                          type="text"
                          className="outlab-ln-input w-full text-center text-xs font-mono border border-gray-200 focus:border-amber-500 outline-none py-1.5 px-1 bg-gray-50 rounded-lg placeholder-gray-300"
                          placeholder="LN001"
                          value={item.labNumber}
                          onChange={(e) => handleOutLabChange(index, 'labNumber', e.target.value)}
                          onKeyDown={handleOutLabKeyDown}
                        />
                      </div>

                      {/* Autocomplete Input */}
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full text-xs font-medium border border-gray-200 focus:border-amber-500 outline-none py-1.5 px-2 bg-gray-50 rounded-lg"
                          placeholder="ค้นหาหรือพิมพ์ชื่อ Test"
                          value={item.testName}
                          onFocus={() => {
                            setActiveDropdownId(item.id);
                            setSearchFilter(item.testName);
                          }}
                          onChange={(e) => {
                            handleOutLabChange(index, 'testName', e.target.value);
                            setSearchFilter(e.target.value);
                          }}
                          onKeyDown={handleOutLabKeyDown}
                        />

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                          {activeDropdownId === item.id && filteredTemplates.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                            >
                              {filteredTemplates.map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => selectTemplate(index, template)}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 text-gray-700 hover:text-amber-800 border-b border-gray-50 flex justify-between font-medium"
                                >
                                  <span>{template.name}</span>
                                  <span className="text-gray-400">฿{template.defaultPrice}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Price */}
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full text-right text-xs border border-gray-200 focus:border-amber-500 outline-none py-1.5 pr-4 pl-1.5 bg-gray-50 rounded-lg font-medium"
                          placeholder="ราคา"
                          value={item.amount || ''}
                          onChange={(e) => handleOutLabChange(index, 'amount', parseFloat(e.target.value) || 0)}
                          onKeyDown={handleOutLabKeyDown}
                        />
                        <span className="absolute right-1 top-2 text-[10px] text-gray-400">฿</span>
                      </div>

                      {/* Delete */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => removeOutLabExpense(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/70 p-3 rounded-xl flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">รวมค่า Out-Lab สำมะคัญ:</span>
            <span className="text-lg font-bold text-amber-600">
              ฿ {formatNumber(totalOutLab)}
            </span>
          </div>
        </div>
      </div>

      {/* บอร์ดสรุปรวมทั้งหมดของวัน */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800" id="expense-summary-panel">
        <h4 className="text-sm font-medium text-slate-400 tracking-wider uppercase mb-1">รายจ่ายรวมทั้งหมดประจำวัน</h4>
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mt-2">
          <span className="text-4xl font-extrabold text-rose-400 animate-pulse">
            ฿ {formatNumber(totalExpenses)}
          </span>
          <div className="flex gap-6 mt-2 md:mt-0 text-sm font-semibold">
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-xs mb-0.5 font-normal">รวมรายจ่ายทั่วไป</span>
              <span className="text-rose-400">฿ {formatNumber(totalGeneral)}</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-xs mb-0.5 font-normal">รวม Out-Lab</span>
              <span className="text-amber-400">฿ {formatNumber(totalOutLab)}</span>
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
              <p className="text-sm font-semibold">บันทึกข้อมูลรายจ่ายเรียบร้อย</p>
              <p className="text-xs text-slate-400">เซฟข้อมูลรวมค่าแล็บและรายจ่ายของวันที่ {currentDate} แล้ว</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
