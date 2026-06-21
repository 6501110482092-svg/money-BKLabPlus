/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { DailyRecord, IncomeItem } from '../types';
import { formatNumber } from '../constants';
import { Plus, Trash2, Save, Calendar, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IncomeModuleProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  record: DailyRecord;
  onSaveRecord: (record: DailyRecord) => void;
}

export default function IncomeModule({
  currentDate,
  onDateChange,
  record,
  onSaveRecord,
}: IncomeModuleProps) {
  const [cashItems, setCashItems] = useState<IncomeItem[]>([]);
  const [transferItems, setTransferItems] = useState<IncomeItem[]>([]);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // โฟกัสสำหรับรายการใหม่ล่าสุด
  const cashInputRef = useRef<HTMLInputElement | null>(null);
  const transferInputRef = useRef<HTMLInputElement | null>(null);
  const prevRecordRef = useRef<string>('');

  // โหลดรายการจาก record เมื่อมีการเปลี่ยนวันที่ หรือเมื่อบันทึกจากที่อื่นโดยไม่มีการแก้ไขค้างอยู่
  useEffect(() => {
    const serializedRecord = JSON.stringify(record?.incomeItems || []);

    if (serializedRecord !== prevRecordRef.current) {
      const cash = record?.incomeItems ? record.incomeItems.filter((item) => item.type === 'cash') : [];
      const transfer = record?.incomeItems ? record.incomeItems.filter((item) => item.type === 'transfer') : [];
      setCashItems(cash);
      setTransferItems(transfer);
      prevRecordRef.current = serializedRecord;
    }
  }, [record, currentDate]);

  // ระบบ Auto-Save บันทึกข้อมูลเรียลไทม์เบื้องหลังเมื่อหยุดพิมพ์ 1.2 วินาที (ไม่มีข้อความหมุนกวนใจ)
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
      const validCash = cashItems.filter((item) => item.description.trim() !== '' || item.amount > 0);
      const validTransfer = transferItems.filter((item) => item.description.trim() !== '' || item.amount > 0);

      const serializedLocal = JSON.stringify([...validCash, ...validTransfer]);
      const currentRecordLatest = recordRef.current;
      const serializedProp = JSON.stringify(currentRecordLatest?.incomeItems || []);

      if (serializedLocal !== serializedProp) {
        const updatedRecord: DailyRecord = {
          ...currentRecordLatest,
          incomeItems: [...validCash, ...validTransfer],
        };
        prevRecordRef.current = serializedLocal;
        onSaveRecord(updatedRecord);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [cashItems, transferItems]);

  // ซิงค์การเปลี่ยนแปลงยอดเงินสดและเงินโอน
  const updateItems = (updatedCash: IncomeItem[], updatedTransfer: IncomeItem[]) => {
    setCashItems(updatedCash);
    setTransferItems(updatedTransfer);
  };

  const addCashItem = () => {
    const newItem: IncomeItem = {
      id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: '',
      amount: 0,
      type: 'cash',
    };
    const updated = [...cashItems, newItem];
    setCashItems(updated);
    setTimeout(() => {
      // โฟกัสไปที่ช่องคีย์ล่าสุด
      const inputs = document.querySelectorAll('.cash-desc-input');
      if (inputs.length > 0) {
        (inputs[inputs.length - 1] as HTMLInputElement).focus();
      }
    }, 50);
  };

  const addTransferItem = () => {
    const newItem: IncomeItem = {
      id: `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: '',
      amount: 0,
      type: 'transfer',
    };
    const updated = [...transferItems, newItem];
    setTransferItems(updated);
    setTimeout(() => {
      const inputs = document.querySelectorAll('.transfer-desc-input');
      if (inputs.length > 0) {
        (inputs[inputs.length - 1] as HTMLInputElement).focus();
      }
    }, 50);
  };

  const handleCashChange = (index: number, field: keyof IncomeItem, value: string | number) => {
    const updated = [...cashItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setCashItems(updated);
  };

  const handleTransferChange = (index: number, field: keyof IncomeItem, value: string | number) => {
    const updated = [...transferItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setTransferItems(updated);
  };

  const removeCashItem = (id: string) => {
    setCashItems(cashItems.filter((item) => item.id !== id));
  };

  const removeTransferItem = (id: string) => {
    setTransferItems(transferItems.filter((item) => item.id !== id));
  };

  // รวมเงินสด
  const totalCash = cashItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  // รวมเงินโอน
  const totalTransfer = transferItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  // รวมทั้งหมด
  const totalIncome = totalCash + totalTransfer;

  const handleSave = () => {
    // กรองเอารายการที่จำนวนเงิน > 0 หรือมีคำอธิบายออกมาก่อนบันทึกเพื่อความสะอาด
    const validCash = cashItems.filter((item) => item.description.trim() !== '' || item.amount > 0);
    const validTransfer = transferItems.filter((item) => item.description.trim() !== '' || item.amount > 0);

    const updatedRecord: DailyRecord = {
      ...record,
      incomeItems: [...validCash, ...validTransfer],
    };

    // อัปเดต ref ตัวอ้างอิงข้อมูลล่าสุดที่บันทึก เพื่อไม่ให้โดนตีความว่าถูกแก้ไขหลังจากรับ prop ใหม่
    prevRecordRef.current = JSON.stringify([...validCash, ...validTransfer]);

    onSaveRecord(updatedRecord);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);

    // อัปเดต state ด้วยรายการที่คลีนแล้ว
    setCashItems(validCash);
    setTransferItems(validTransfer);
  };

  // บันทึกด้วยคีย์ลัด F8 (ใช้ capture ป้องกันเบราว์เซอร์ดึงไปใช้ก่อน)
  const saveRef = useRef(handleSave);
  useEffect(() => {
    saveRef.current = handleSave;
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
    // ใช้ capture = true เพื่อดักจับ Event ก่อนที่จะถูก Browser หรือ Element อื่นขัดขวาง
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  // คีย์ลัด Enter สำหรับช่องกรอก รายการ/จำนวนเงิน
  const handleCashKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, isAmountField: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // หากกด Enter ในช่องกรอกจำนวนเงิน หรือคำอธิบาย จะทำการเปิดแถวถัดไปทันที
      addCashItem();
    }
  };

  const handleTransferKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, isAmountField: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTransferItem();
    }
  };

  return (
    <div className="space-y-6" id="income-module-container">
      {/* ส่วนควบคุม วันที่ */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block">แก้ไขข้อมูลของวันที่</span>
            <input
              type="date"
              id="income-date-picker"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-sm font-semibold text-gray-700 outline-none border border-gray-205 focus:border-blue-500 rounded px-2.5 py-1 bg-gray-50"
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
            onClick={handleSave}
            id="btn-save-income"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-xs"
          >
            <Save size={16} />
            <span>บันทึกรายรับของวัน</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* กลุ่มเงินสด */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-150 flex flex-col justify-between" id="cash-income-panel">
          <div>
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="font-semibold text-gray-800 text-base">ยอดเงินสด (Cash)</h3>
              </div>
              <button
                onClick={addCashItem}
                id="btn-add-cash"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all"
              >
                <Plus size={14} />
                <span>เพิ่มรายการ</span>
              </button>
            </div>

            {cashItems.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl my-2">
                <p className="text-gray-400 text-sm">ยังไม่มีรายการเงินสด</p>
                <button
                  onClick={addCashItem}
                  className="mt-2 text-xs font-semibold text-emerald-600 hover:underline"
                >
                  + เพิ่มรายการแรก
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {cashItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2 items-center"
                  >
                    <input
                      type="text"
                      className="cash-desc-input flex-1 text-sm border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none py-1.5 px-3 rounded-lg bg-gray-50/50"
                      placeholder="รายการเงินสด (เช่น ค่าตรวจพิกัด, ตรวจแล็บ)"
                      value={item.description}
                      onChange={(e) => handleCashChange(index, 'description', e.target.value)}
                      onKeyDown={(e) => handleCashKeyDown(e, index, false)}
                    />
                    <div className="relative w-36">
                      <input
                        type="number"
                        className="w-full text-right text-sm border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none py-1.5 pr-6 pl-3 rounded-lg bg-gray-50/50"
                        placeholder="0.00"
                        value={item.amount || ''}
                        onChange={(e) => handleCashChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleCashKeyDown(e, index, true)}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-gray-400">฿</span>
                    </div>
                    <button
                      onClick={() => removeCashItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/70 p-3 rounded-xl flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">รวมเงินสดทั้งหมด:</span>
            <span className="text-lg font-bold text-emerald-600">฿ {formatNumber(totalCash)}</span>
          </div>
        </div>

        {/* กลุ่มเงินโอน */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-150 flex flex-col justify-between" id="transfer-income-panel">
          <div>
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <h3 className="font-semibold text-gray-800 text-base">ยอดโอนเงิน (Transfer)</h3>
              </div>
              <button
                onClick={addTransferItem}
                id="btn-add-transfer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-all"
              >
                <Plus size={14} />
                <span>เพิ่มรายการ</span>
              </button>
            </div>

            {transferItems.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl my-2">
                <p className="text-gray-400 text-sm">ยังไม่มีรายการโอนเงิน</p>
                <button
                  onClick={addTransferItem}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  + เพิ่มรายการแรก
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {transferItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-2 items-center"
                  >
                    <input
                      type="text"
                      className="transfer-desc-input flex-1 text-sm border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none py-1.5 px-3 rounded-lg bg-gray-50/50"
                      placeholder="รายการเงินโอน (เช่น โอนสแกน, สิทธิ์ประกัน)"
                      value={item.description}
                      onChange={(e) => handleTransferChange(index, 'description', e.target.value)}
                      onKeyDown={(e) => handleTransferKeyDown(e, index, false)}
                    />
                    <div className="relative w-36">
                      <input
                        type="number"
                        className="w-full text-right text-sm border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none py-1.5 pr-6 pl-3 rounded-lg bg-gray-50/50"
                        placeholder="0.00"
                        value={item.amount || ''}
                        onChange={(e) => handleTransferChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleTransferKeyDown(e, index, true)}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-gray-400">฿</span>
                    </div>
                    <button
                      onClick={() => removeTransferItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/70 p-3 rounded-xl flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">รวมโอนเงินทั้งหมด:</span>
            <span className="text-lg font-bold text-blue-600">฿ {formatNumber(totalTransfer)}</span>
          </div>
        </div>
      </div>

      {/* บอร์ดสรุปรวมทั้งหมดของวัน */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800" id="income-summary-panel">
        <h4 className="text-sm font-medium text-slate-400 tracking-wider uppercase mb-1">รายรับรวมทั้งหมดประจำวัน</h4>
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mt-2">
          <span className="text-4xl font-extrabold text-blue-400">
            ฿ {formatNumber(totalIncome)}
          </span>
          <div className="flex gap-6 mt-2 md:mt-0 text-sm">
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-xs mb-0.5">รวมเงินสด</span>
              <span className="font-semibold text-emerald-400">฿ {formatNumber(totalCash)}</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-xs mb-0.5">รวมเงินโอน</span>
              <span className="font-semibold text-blue-400">฿ {formatNumber(totalTransfer)}</span>
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
              <p className="text-xs text-slate-400">ระบบบันทึกรายรับของวันที่ {currentDate} แล้ว</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
