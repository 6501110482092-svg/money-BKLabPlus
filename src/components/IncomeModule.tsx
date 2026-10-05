/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DailyRecord, IncomeItem } from '../types';
import { formatNumber } from '../constants';
import { Plus, Trash2, Save, Calendar, CheckCircle, Hash, Sparkles, X, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IncomeModuleProps {
  key?: React.Key;
  currentDate: string;
  onDateChange: (date: string) => void;
  record: DailyRecord;
  onSaveRecord: (record: DailyRecord) => void;
  activeBusinessId?: string;
}

export default function IncomeModule({
  currentDate,
  onDateChange,
  record,
  onSaveRecord,
  activeBusinessId,
}: IncomeModuleProps) {
  const [cashItems, setCashItems] = useState<IncomeItem[]>([]);
  const [transferItems, setTransferItems] = useState<IncomeItem[]>([]);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // ระบบเลขนำหน้าอัตโนมัติ (Auto-Prefix) อิงตามปีและเดือนของวันที่ เช่น ปี 2026 เดือน 10 -> '2610'
  const [autoPrefixEnabled, setAutoPrefixEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('bklabplus_auto_prefix_income');
    return saved !== null ? saved === 'true' : true;
  });

  const [prefixYearFormat, setPrefixYearFormat] = useState<'CE' | 'BE'>(() => {
    const saved = localStorage.getItem('bklabplus_prefix_year_format');
    return saved === 'BE' ? 'BE' : 'CE'; // ค่าเริ่มต้น CE เช่น 2026 -> '26' รวมเดือน 10 เป็น '2610'
  });

  const [showPrefixConfig, setShowPrefixConfig] = useState(false);

  // คำนวณเลขนำหน้าตามวันที่ปัจจุบัน
  const currentPrefix = useMemo(() => {
    if (!currentDate) return '';
    const parts = currentDate.split('-');
    if (parts.length >= 2) {
      const rawYear = parseInt(parts[0], 10);
      const mm = parts[1]; // เดือน 2 หลัก เช่น '10'
      if (prefixYearFormat === 'BE') {
        // รูปแบบ พ.ศ. เช่น 2569 -> '69'
        const beYear = (rawYear + 543).toString().slice(-2);
        return `${beYear}${mm}`;
      } else {
        // รูปแบบ ค.ศ. เช่น 2026 -> '26'
        const ceYear = parts[0].slice(-2);
        return `${ceYear}${mm}`;
      }
    }
    return '';
  }, [currentDate, prefixYearFormat]);

  const toggleAutoPrefix = () => {
    const nextVal = !autoPrefixEnabled;
    setAutoPrefixEnabled(nextVal);
    localStorage.setItem('bklabplus_auto_prefix_income', String(nextVal));
  };

  const handleYearFormatChange = (fmt: 'CE' | 'BE') => {
    setPrefixYearFormat(fmt);
    localStorage.setItem('bklabplus_prefix_year_format', fmt);
  };

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
  }, [record, currentDate, activeBusinessId]);

  // ระบบ Auto-Save บันทึกข้อมูลเรียลไทม์เบื้องหลังเมื่อหยุดพิมพ์ 1.2 วินาที
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
      const isItemValid = (item: IncomeItem) =>
        item.amount > 0 || (item.description.trim() !== '' && item.description.trim() !== currentPrefix);

      const validCash = cashItems.filter(isItemValid);
      const validTransfer = transferItems.filter(isItemValid);

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
  }, [cashItems, transferItems, currentPrefix]);

  // เพิ่มรายการเงินสดพร้อมใส่เลขนำหน้าอัตโนมัติ
  const addCashItem = () => {
    const prefix = autoPrefixEnabled ? currentPrefix : '';
    const newItem: IncomeItem = {
      id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: prefix,
      amount: 0,
      type: 'cash',
    };
    const updated = [...cashItems, newItem];
    setCashItems(updated);
    setTimeout(() => {
      // โฟกัสไปที่ช่องคีย์ล่าสุด และวางเคอร์เซอร์ไว้ท้ายสุดของตัวเลขนำหน้า เพื่อให้พิมพ์ต่อได้ทันที
      const inputs = document.querySelectorAll<HTMLInputElement>('.cash-desc-input');
      if (inputs.length > 0) {
        const lastInput = inputs[inputs.length - 1];
        lastInput.focus();
        const len = lastInput.value.length;
        lastInput.setSelectionRange(len, len);
      }
    }, 50);
  };

  // เพิ่มรายการเงินโอนพร้อมใส่เลขนำหน้าอัตโนมัติ
  const addTransferItem = () => {
    const prefix = autoPrefixEnabled ? currentPrefix : '';
    const newItem: IncomeItem = {
      id: `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: prefix,
      amount: 0,
      type: 'transfer',
    };
    const updated = [...transferItems, newItem];
    setTransferItems(updated);
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.transfer-desc-input');
      if (inputs.length > 0) {
        const lastInput = inputs[inputs.length - 1];
        lastInput.focus();
        const len = lastInput.value.length;
        lastInput.setSelectionRange(len, len);
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
    const isItemValid = (item: IncomeItem) =>
      item.amount > 0 || (item.description.trim() !== '' && item.description.trim() !== currentPrefix);

    const validCash = cashItems.filter(isItemValid);
    const validTransfer = transferItems.filter(isItemValid);

    const updatedRecord: DailyRecord = {
      ...record,
      incomeItems: [...validCash, ...validTransfer],
    };

    prevRecordRef.current = JSON.stringify([...validCash, ...validTransfer]);
    onSaveRecord(updatedRecord);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);

    setCashItems(validCash);
    setTransferItems(validTransfer);
  };

  // บันทึกด้วยคีย์ลัด F8
  const saveRef = useRef(handleSave);
  useEffect(() => {
    saveRef.current = handleSave;
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

  // คีย์ลัด Enter สำหรับช่องกรอก รายการ/จำนวนเงิน
  const handleCashKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCashItem();
    }
  };

  const handleTransferKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTransferItem();
    }
  };

  return (
    <div className="space-y-6" id="income-module-container">
      {/* ส่วนควบคุม วันที่ และแถบเลขนำหน้าอัตโนมัติ */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-150 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
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
                className="text-sm font-semibold text-gray-700 outline-none border border-gray-205 focus:border-blue-500 rounded px-2.5 py-1 bg-gray-50 cursor-pointer"
              />
            </div>
          </div>

          {/* แถบสวิตช์เลขนำหน้าอัตโนมัติ (Auto-Prefix เช่น 2610) */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 px-3 py-1.5 rounded-xl border border-blue-200/80">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPrefixEnabled}
                onChange={toggleAutoPrefix}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Sparkles size={13} className="text-blue-600" />
                <span>เติมเลขอัตโนมัติ:</span>
              </span>
            </label>

            {autoPrefixEnabled && (
              <span
                className="px-2 py-0.5 bg-blue-600 text-white font-mono font-bold text-xs rounded-md shadow-2xs cursor-default"
                title={`เลขอิงตามปีและเดือนของวันที่ ${currentDate}`}
              >
                {currentPrefix}
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowPrefixConfig(!showPrefixConfig)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-white/60 transition-colors cursor-pointer"
              title="ตั้งค่ารูปแบบเลขนำหน้า"
            >
              <Settings2 size={13} />
            </button>
          </div>

          {/* ป๊อปอัปตั้งค่ารูปแบบเลขนำหน้า (CE / BE) */}
          {showPrefixConfig && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-sm text-xs">
              <span className="font-semibold text-slate-600">รูปแบบปี:</span>
              <button
                type="button"
                onClick={() => handleYearFormatChange('CE')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                  prefixYearFormat === 'CE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ค.ศ. ({currentDate.slice(2, 4) || '26'}{currentDate.slice(5, 7) || '10'})
              </button>
              <button
                type="button"
                onClick={() => handleYearFormatChange('BE')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                  prefixYearFormat === 'BE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                พ.ศ. ({((parseInt(currentDate.slice(0, 4), 10) || 2026) + 543).toString().slice(-2)}{currentDate.slice(5, 7) || '10'})
              </button>
            </div>
          )}
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
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-xs cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>เพิ่มรายการ</span>
                {autoPrefixEnabled && currentPrefix && (
                  <span className="text-[10px] font-mono font-bold bg-emerald-200/70 text-emerald-900 px-1 rounded">
                    {currentPrefix}...
                  </span>
                )}
              </button>
            </div>

            {cashItems.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl my-2">
                <p className="text-gray-400 text-sm">ยังไม่มีรายการเงินสด</p>
                <button
                  onClick={addCashItem}
                  className="mt-2 text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
                >
                  + เพิ่มรายการแรก {autoPrefixEnabled && currentPrefix && `(ขึ้นต้น ${currentPrefix}...)`}
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
                    <div className="relative flex-1">
                      <input
                        type="text"
                        className="cash-desc-input w-full text-sm border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none py-1.5 px-3 rounded-lg bg-gray-50/50 pr-7"
                        placeholder={`รายการเงินสด (เช่น ${currentPrefix || '2610'}01, ค่าตรวจ)`}
                        value={item.description}
                        onFocus={(e) => {
                          // หากเป็นเลขนำหน้าอัตโนมัติ ให้วางเคอร์เซอร์ไว้ท้ายสุดทันที เพื่อให้พิมพ์เลขต่อได้ทันที
                          if (e.target.value === currentPrefix) {
                            const len = e.target.value.length;
                            e.target.setSelectionRange(len, len);
                          }
                        }}
                        onChange={(e) => handleCashChange(index, 'description', e.target.value)}
                        onKeyDown={handleCashKeyDown}
                      />
                      {/* ปุ่มลบตัวเลขหรือล้างข้อความได้ทันทีในกรณีเป็นรายได้อื่น */}
                      {item.description && (
                        <button
                          type="button"
                          onClick={() => handleCashChange(index, 'description', '')}
                          className="absolute right-2 top-2 text-gray-300 hover:text-gray-500 text-xs p-0.5 rounded cursor-pointer"
                          title="ล้างข้อความเพื่อพิมพ์รายได้อื่น"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="relative w-36">
                      <input
                        type="number"
                        className="w-full text-right text-sm border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none py-1.5 pr-6 pl-3 rounded-lg bg-gray-50/50"
                        placeholder="0.00"
                        value={item.amount || ''}
                        onChange={(e) => handleCashChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        onKeyDown={handleCashKeyDown}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-gray-400">฿</span>
                    </div>

                    <button
                      onClick={() => removeCashItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      title="ลบรายการนี้"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>เพิ่มรายการ</span>
                {autoPrefixEnabled && currentPrefix && (
                  <span className="text-[10px] font-mono font-bold bg-blue-200/70 text-blue-900 px-1 rounded">
                    {currentPrefix}...
                  </span>
                )}
              </button>
            </div>

            {transferItems.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl my-2">
                <p className="text-gray-400 text-sm">ยังไม่มีรายการโอนเงิน</p>
                <button
                  onClick={addTransferItem}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  + เพิ่มรายการแรก {autoPrefixEnabled && currentPrefix && `(ขึ้นต้น ${currentPrefix}...)`}
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
                    <div className="relative flex-1">
                      <input
                        type="text"
                        className="transfer-desc-input w-full text-sm border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none py-1.5 px-3 rounded-lg bg-gray-50/50 pr-7"
                        placeholder={`รายการเงินโอน (เช่น ${currentPrefix || '2610'}01, สิทธิ์ประกัน)`}
                        value={item.description}
                        onFocus={(e) => {
                          if (e.target.value === currentPrefix) {
                            const len = e.target.value.length;
                            e.target.setSelectionRange(len, len);
                          }
                        }}
                        onChange={(e) => handleTransferChange(index, 'description', e.target.value)}
                        onKeyDown={handleTransferKeyDown}
                      />
                      {item.description && (
                        <button
                          type="button"
                          onClick={() => handleTransferChange(index, 'description', '')}
                          className="absolute right-2 top-2 text-gray-300 hover:text-gray-500 text-xs p-0.5 rounded cursor-pointer"
                          title="ล้างข้อความเพื่อพิมพ์รายได้อื่น"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="relative w-36">
                      <input
                        type="number"
                        className="w-full text-right text-sm border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none py-1.5 pr-6 pl-3 rounded-lg bg-gray-50/50"
                        placeholder="0.00"
                        value={item.amount || ''}
                        onChange={(e) => handleTransferChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        onKeyDown={handleTransferKeyDown}
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-gray-400">฿</span>
                    </div>

                    <button
                      onClick={() => removeTransferItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      title="ลบรายการนี้"
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
