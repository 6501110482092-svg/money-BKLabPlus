/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LabTestTemplate, Business, FixCostItem } from '../types';
import { loadLabTests, saveLabTests, loadBusinesses, saveBusinesses, saveActiveBusinessId } from '../utils/storage';
import { subscribeToLabTests, subscribeToBusinesses } from '../utils/firebase';
import { getBusinessColorClasses, formatNumber } from '../constants';
import {
  Plus,
  Trash2,
  Save,
  Sparkles,
  Building2,
  CheckCircle2,
  Edit2,
  X,
  Check,
  Store,
  Receipt,
  Zap,
  CalendarClock,
  Info,
  Coins,
} from 'lucide-react';
import { motion } from 'motion/react';

interface ManageTestsModuleProps {
  businesses?: Business[];
  activeBusinessId?: string;
  onSelectBusiness?: (id: string) => void;
  onBusinessesChange?: (businesses: Business[]) => void;
}

export default function ManageTestsModule({
  businesses: propBusinesses,
  activeBusinessId: propActiveBusinessId,
  onSelectBusiness,
  onBusinessesChange,
}: ManageTestsModuleProps) {
  // รัฐชุดตรวจแล็บ
  const [tests, setTests] = useState<LabTestTemplate[]>([]);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number>(100);

  // รัฐจัดการบริษัท/ธุรกิจ
  const [businesses, setBusinesses] = useState<Business[]>(() => propBusinesses || loadBusinesses());
  const [activeId, setActiveId] = useState<string>(() => propActiveBusinessId || businesses[0]?.id || 'clinic-main');

  // ฟอร์มเพิ่มบริษัทใหม่
  const [newBizName, setNewBizName] = useState('');
  const [newBizCode, setNewBizCode] = useState('');
  const [newBizDesc, setNewBizDesc] = useState('');
  const [newBizColor, setNewBizColor] = useState<string>('emerald');
  const [editingBizId, setEditingBizId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('emerald');

  // รัฐจัดการ Fix Cost (รายจ่ายประจำเดือน)
  const [selectedFixCostBizId, setSelectedFixCostBizId] = useState<string>(() => propActiveBusinessId || businesses[0]?.id || 'clinic-main');
  const [newFcName, setNewFcName] = useState('');
  const [newFcAmount, setNewFcAmount] = useState<string>(''); // เป็น string เพื่อให้เว้นว่างได้
  const [editingFcId, setEditingFcId] = useState<string | null>(null);
  const [editFcName, setEditFcName] = useState('');
  const [editFcAmount, setEditFcAmount] = useState('');

  // ซิงค์สเตทกับ props ถ้าส่งมา
  useEffect(() => {
    if (propBusinesses && propBusinesses.length > 0) {
      setBusinesses(propBusinesses);
    }
  }, [propBusinesses]);

  useEffect(() => {
    if (propActiveBusinessId) {
      setActiveId(propActiveBusinessId);
      if (!selectedFixCostBizId) {
        setSelectedFixCostBizId(propActiveBusinessId);
      }
    }
  }, [propActiveBusinessId]);

  useEffect(() => {
    setTests(loadLabTests());

    // ซิงค์ลิสต์ชุดตรวจในคลังแบบเรียลไทม์จากระบบคลาวด์ Firebase
    const unsubscribeTests = subscribeToLabTests((updatedTests) => {
      setTests(updatedTests);
    });

    // ซิงค์รายชื่อบริษัทแบบเรียลไทม์
    const unsubscribeBusinesses = subscribeToBusinesses((updatedBusinesses) => {
      if (updatedBusinesses && updatedBusinesses.length > 0) {
        setBusinesses(updatedBusinesses);
        if (onBusinessesChange) {
          onBusinessesChange(updatedBusinesses);
        }
      }
    });

    return () => {
      unsubscribeTests();
      unsubscribeBusinesses();
    };
  }, [onBusinessesChange]);

  const handleSelectBusiness = (id: string) => {
    setActiveId(id);
    saveActiveBusinessId(id);
    if (onSelectBusiness) {
      onSelectBusiness(id);
    }
  };

  const handleAddBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) return;

    const code = newBizCode.trim() || newBizName.trim().substring(0, 3).toUpperCase();
    const newBiz: Business = {
      id: `biz-${Date.now()}`,
      name: newBizName.trim(),
      code,
      description: newBizDesc.trim() || 'บันทึกรายรับ-รายจ่ายแยกสมุด',
      color: newBizColor,
      createdAt: new Date().toISOString(),
      fixCosts: [],
    };

    const updated = [...businesses, newBiz];
    setBusinesses(updated);
    saveBusinesses(updated);
    if (onBusinessesChange) {
      onBusinessesChange(updated);
    }

    setNewBizName('');
    setNewBizCode('');
    setNewBizDesc('');
    setNewBizColor('emerald');
  };

  const handleStartEdit = (biz: Business) => {
    setEditingBizId(biz.id);
    setEditName(biz.name);
    setEditCode(biz.code || '');
    setEditDesc(biz.description || '');
    setEditColor(biz.color || 'emerald');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    const updated = businesses.map((b) => {
      if (b.id === id) {
        return {
          ...b,
          name: editName.trim(),
          code: editCode.trim() || editName.trim().substring(0, 3).toUpperCase(),
          description: editDesc.trim(),
          color: editColor,
        };
      }
      return b;
    });

    setBusinesses(updated);
    saveBusinesses(updated);
    if (onBusinessesChange) {
      onBusinessesChange(updated);
    }
    setEditingBizId(null);
  };

  const handleDeleteBusiness = (id: string) => {
    if (businesses.length <= 1) {
      alert('ไม่สามารถลบได้ เนื่องจากระบบต้องมีบริษัทหรือธุรกิจอย่างน้อย 1 รายการครับ');
      return;
    }

    const target = businesses.find((b) => b.id === id);
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบธุรกิจ "${target?.name || id}"? (สมุดบันทึกจะถูกลบออกจากตัวเลือก)`)) {
      const updated = businesses.filter((b) => b.id !== id);
      setBusinesses(updated);
      saveBusinesses(updated);
      if (onBusinessesChange) {
        onBusinessesChange(updated);
      }

      if (activeId === id) {
        const nextId = updated[0]?.id || 'clinic-main';
        setActiveId(nextId);
        saveActiveBusinessId(nextId);
        if (onSelectBusiness) {
          onSelectBusiness(nextId);
        }
      }
    }
  };

  // --- จัดการ Fix Cost ประจำธุรกิจ ---
  const currentFixCostBiz = businesses.find((b) => b.id === selectedFixCostBizId) || businesses[0];
  const currentFixCosts = currentFixCostBiz?.fixCosts || [];

  const handleAddFixCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFcName.trim() || !currentFixCostBiz) return;

    const parsedAmount = newFcAmount.trim() === '' ? 0 : parseFloat(newFcAmount) || 0;
    const newFixCost: FixCostItem = {
      id: `fc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newFcName.trim(),
      amount: parsedAmount,
    };

    const updatedBusinesses = businesses.map((b) => {
      if (b.id === currentFixCostBiz.id) {
        const existing = b.fixCosts || [];
        return {
          ...b,
          fixCosts: [...existing, newFixCost],
        };
      }
      return b;
    });

    setBusinesses(updatedBusinesses);
    saveBusinesses(updatedBusinesses);
    if (onBusinessesChange) {
      onBusinessesChange(updatedBusinesses);
    }

    setNewFcName('');
    setNewFcAmount('');
  };

  const handleStartEditFixCost = (fc: FixCostItem) => {
    setEditingFcId(fc.id);
    setEditFcName(fc.name);
    setEditFcAmount(fc.amount ? String(fc.amount) : '');
  };

  const handleSaveEditFixCost = (fcId: string) => {
    if (!editFcName.trim() || !currentFixCostBiz) return;
    const parsedAmount = editFcAmount.trim() === '' ? 0 : parseFloat(editFcAmount) || 0;

    const updatedBusinesses = businesses.map((b) => {
      if (b.id === currentFixCostBiz.id) {
        const updatedFc = (b.fixCosts || []).map((fc) => {
          if (fc.id === fcId) {
            return {
              ...fc,
              name: editFcName.trim(),
              amount: parsedAmount,
            };
          }
          return fc;
        });
        return {
          ...b,
          fixCosts: updatedFc,
        };
      }
      return b;
    });

    setBusinesses(updatedBusinesses);
    saveBusinesses(updatedBusinesses);
    if (onBusinessesChange) {
      onBusinessesChange(updatedBusinesses);
    }
    setEditingFcId(null);
  };

  const handleRemoveFixCost = (fixCostId: string) => {
    if (!currentFixCostBiz) return;

    const updatedBusinesses = businesses.map((b) => {
      if (b.id === currentFixCostBiz.id) {
        return {
          ...b,
          fixCosts: (b.fixCosts || []).filter((fc) => fc.id !== fixCostId),
        };
      }
      return b;
    });

    setBusinesses(updatedBusinesses);
    saveBusinesses(updatedBusinesses);
    if (onBusinessesChange) {
      onBusinessesChange(updatedBusinesses);
    }
  };

  // ชิปเติมด่วนสำหรับ Fix Cost ที่พบบ่อย
  const quickFixCostTemplates = [
    { name: 'ค่าไฟฟ้า (ผันแปร)', amount: '' },
    { name: 'ค่าน้ำประปา', amount: '350' },
    { name: 'ค่าเช่าสถานที่ / คลินิก', amount: '15000' },
    { name: 'ค่าอินเทอร์เน็ตคลินิก', amount: '799' },
    { name: 'เงินเดือนพนักงาน', amount: '' },
    { name: 'ค่าโปรแกรม / ซอฟต์แวร์คลินิก', amount: '1200' },
    { name: 'ค่าบริการทำบัญชี / ตรวจสอบ', amount: '3000' },
  ];

  // --- จัดการชุดตรวจ Autocomplete ---
  const handleAddTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() === '') return;

    const newTest: LabTestTemplate = {
      id: `test-${Date.now()}`,
      name: newName.trim(),
      defaultPrice: Number(newPrice) || 0,
    };

    const updated = [...tests, newTest];
    setTests(updated);
    saveLabTests(updated);

    setNewName('');
    setNewPrice(100);
  };

  const handleRemoveTest = (id: string) => {
    const updated = tests.filter((t) => t.id !== id);
    setTests(updated);
    saveLabTests(updated);
  };

  return (
    <div className="space-y-8" id="manage-settings-container">
      {/* ============================================================== */}
      {/* ส่วนที่ 1: จัดการรายชื่อบริษัท / ธุรกิจ (Multi-Business Management) */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-6" id="manage-businesses-section">
        <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Building2 className="text-blue-600" size={22} />
              <span>จัดการสมุดบัญชีธุรกิจ / บริษัท (Business Ledgers)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              เพิ่มและกำหนดรายชื่อบริษัทหรือธุรกิจของคุณ ข้อมูลรายรับ-รายจ่ายของแต่ละบริษัทจะถูกบันทึกแยกสมุดบัญชีกัน 100%
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100 shrink-0 text-xs font-bold">
            <Store size={15} />
            <span>มีทั้งหมด {businesses.length} ธุรกิจในระบบ</span>
          </div>
        </div>

        {/* รายการบริษัทที่มีอยู่ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {businesses.map((biz) => {
            const isActive = biz.id === activeId;
            const colorCls = getBusinessColorClasses(biz.color);
            const isEditing = editingBizId === biz.id;
            const fcCount = (biz.fixCosts || []).length;

            if (isEditing) {
              return (
                <div key={biz.id} className="p-4 rounded-xl border-2 border-blue-400 bg-blue-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-700">แก้ไขข้อมูลธุรกิจ</span>
                    <button
                      type="button"
                      onClick={() => setEditingBizId(null)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">ชื่อธุรกิจ</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs font-semibold py-1.5 px-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">รหัสย่อ</label>
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className="w-full text-xs font-semibold py-1.5 px-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">สีประจำธุรกิจ</label>
                      <select
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-full text-xs font-semibold py-1.5 px-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="emerald">เขียว (Emerald)</option>
                        <option value="blue">ฟ้า (Blue)</option>
                        <option value="purple">ม่วง (Purple)</option>
                        <option value="amber">ส้มทอง (Amber)</option>
                        <option value="rose">กุหลาบ (Rose)</option>
                        <option value="cyan">ไซแอน (Cyan)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">คำอธิบาย</label>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full text-xs font-semibold py-1.5 px-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(biz.id)}
                      className="flex-1 bg-blue-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1"
                    >
                      <Check size={13} />
                      <span>บันทึก</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBizId(null)}
                      className="text-xs text-gray-500 py-1.5 px-2.5 rounded-lg border border-gray-200 hover:bg-gray-100"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={biz.id}
                className={`relative p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-blue-500 bg-gradient-to-b from-blue-50/50 to-white shadow-sm ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorCls.dot}`} />
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase tracking-wider font-mono border border-slate-200">
                      {biz.code || 'BIZ'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                      Fix Cost: {fcCount} รายการ
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(biz)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-100 transition-colors"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 size={13} />
                    </button>
                    {businesses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBusiness(biz.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                        title="ลบธุรกิจ"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="font-extrabold text-slate-900 text-sm leading-snug mb-1 truncate" title={biz.name}>
                  {biz.name}
                </h4>
                <p className="text-[11px] text-gray-500 line-clamp-2 min-h-[32px]">
                  {biz.description || 'บันทึกแยกสมุดบัญชีรายรับ-รายจ่าย'}
                </p>

                <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFixCostBizId(biz.id);
                      const el = document.getElementById('manage-fix-cost-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Receipt size={12} />
                    <span>จัดการ Fix Cost ({fcCount})</span>
                  </button>

                  {isActive ? (
                    <div className="flex items-center gap-1 text-blue-600 text-xs font-extrabold">
                      <CheckCircle2 size={14} className="text-blue-600" />
                      <span>ใช้งานอยู่</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectBusiness(biz.id)}
                      className="text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-gray-200 transition-all cursor-pointer"
                    >
                      สลับใช้ธุรกิจนี้
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ฟอร์มเพิ่มบริษัทใหม่ */}
        <div className="bg-slate-50/80 p-4.5 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-1.5">
            <Plus size={16} className="text-blue-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
              เพิ่มบริษัท / ธุรกิจใหม่ในระบบ
            </span>
          </div>
          <form onSubmit={handleAddBusiness} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-600 block mb-1">ชื่อบริษัท / คลินิก / ธุรกิจ *</label>
              <input
                type="text"
                placeholder="เช่น คลินิกเวชกรรม สาขา 2"
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                required
                className="w-full text-xs font-semibold py-2 px-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600 block mb-1">รหัสย่อ (Code)</label>
              <input
                type="text"
                placeholder="เช่น BR2, LAB, DEN"
                value={newBizCode}
                onChange={(e) => setNewBizCode(e.target.value)}
                maxLength={6}
                className="w-full text-xs font-bold py-2 px-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600 block mb-1">สีประจำธุรกิจ</label>
              <select
                value={newBizColor}
                onChange={(e) => setNewBizColor(e.target.value)}
                className="w-full text-xs font-semibold py-2 px-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white cursor-pointer"
              >
                <option value="emerald">เขียว (Emerald) - คลินิกหลัก</option>
                <option value="blue">ฟ้า (Blue) - แผนกแล็บวิเคราะห์</option>
                <option value="purple">ม่วง (Purple) - สาขาย่อย/บริษัท 2</option>
                <option value="amber">ส้มทอง (Amber) - แผนกการค้า/หน้าร้าน</option>
                <option value="rose">กุหลาบ (Rose) - แผนกเฉพาะทาง</option>
                <option value="cyan">ไซแอน (Cyan) - แผนกทันตกรรม</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs py-2 px-4 rounded-lg transition-all h-[38px] flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={15} />
                <span>+ เพิ่มบริษัทใหม่</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ส่วนที่ 2: จัดการ Fix Cost (รายจ่ายประจำเดือน) ประจำธุรกิจ */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-6" id="manage-fix-cost-section">
        <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Receipt className="text-amber-600" size={22} />
              <span>จัดการ Fix Cost (รายจ่ายประจำเดือน) ของธุรกิจ</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              กำหนดรายการค่าใช้จ่ายประจำที่ต้องจ่ายทุกเดือนของแต่ละธุรกิจ (เช่น ค่าเช่า, เงินเดือน, ค่าไฟ, ค่าน้ำ, ค่าเน็ต) ระบบจะนำไปใส่ใน <strong>บันทึกรายจ่าย</strong> ให้อัตโนมัติใน <strong>วันสุดท้ายของเดือนนั้น</strong> ไว้รอทันที
            </p>
          </div>

          {/* สลับเลือกธุรกิจที่จะตั้งค่า Fix Cost */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
            <Building2 size={16} className="text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">เลือกธุรกิจ:</span>
            <select
              value={selectedFixCostBizId}
              onChange={(e) => setSelectedFixCostBizId(e.target.value)}
              className="text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code || 'BIZ'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* แถบแจ้งเตือนฟังก์ชันการทำงานอัตโนมัติ */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
          <CalendarClock size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">
              การทำงานอัตโนมัติ: ใส่ข้อมูลไว้รอในวันสิ้นเดือนของสมุดบัญชี "{currentFixCostBiz?.name}"
            </span>
            <p className="text-amber-800/90 leading-relaxed">
              • รายการที่ระบุจำนวนเงินไว้ (เช่น ค่าเช่า 15,000) ระบบจะใส่ยอดเงินให้เลย<br />
              • รายการที่ไม่ระบุจำนวนเงิน หรือใส่ 0 (เช่น <strong>ค่าไฟฟ้า</strong> ที่ยอดไม่เท่ากันทุกเดือน) ระบบจะใส่ชื่อรายการไว้รอ โดยเว้นช่องยอดเงินไว้ ให้คุณไปพิมพ์ใส่จำนวนเงินภายหลังในหน้า <strong>"บันทึกรายจ่าย"</strong> ได้อย่างสะดวกรวดเร็ว
            </p>
          </div>
        </div>

        {/* ฟอร์มเพิ่มรายการ Fix Cost ใหม่ */}
        <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-1.5">
            <Plus size={15} className="text-amber-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
              เพิ่ม Fix Cost ให้กับ "{currentFixCostBiz?.name}"
            </span>
          </div>

          <form onSubmit={handleAddFixCost} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-gray-600 block mb-1">
                ชื่อรายการ Fix Cost *
              </label>
              <input
                type="text"
                placeholder="เช่น ค่าเช่าสถานที่, ค่าไฟฟ้า (ผันแปร), ค่าอินเทอร์เน็ต"
                value={newFcName}
                onChange={(e) => setNewFcName(e.target.value)}
                required
                className="w-full text-xs font-semibold py-2 px-3 border border-gray-200 rounded-lg outline-none focus:border-amber-500 bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600 block mb-1">
                จำนวนเงิน (บาท) <span className="text-gray-400 font-normal">(เว้นว่างได้ เช่น ค่าไฟ)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    placeholder="เว้นว่าง / 0.00"
                    value={newFcAmount}
                    onChange={(e) => setNewFcAmount(e.target.value)}
                    min="0"
                    step="any"
                    className="w-full text-xs font-bold py-2 pr-6 pl-3 border border-gray-200 rounded-lg outline-none focus:border-amber-500 bg-white"
                  />
                  <span className="absolute right-2 top-2 text-xs text-gray-400">฿</span>
                </div>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm shrink-0 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>เพิ่มรายการ</span>
                </button>
              </div>
            </div>
          </form>

          {/* ชิปรายการแนะนำด่วน */}
          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Zap size={12} className="text-amber-500" />
              <span>คลิกเพื่อใส่ด่วน:</span>
            </span>
            {quickFixCostTemplates.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setNewFcName(t.name);
                  setNewFcAmount(t.amount);
                }}
                className="text-[11px] font-medium bg-white hover:bg-amber-50 hover:text-amber-800 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-amber-300 transition-all cursor-pointer"
              >
                + {t.name} {t.amount ? `(฿${t.amount})` : '(ยอดผันแปร)'}
              </button>
            ))}
          </div>
        </div>

        {/* ตารางรายการ Fix Cost ที่มีอยู่ */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>รายการ Fix Cost ประจำเดือนของ {currentFixCostBiz?.name}</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full font-mono text-[10px] font-bold">
                {currentFixCosts.length} รายการ
              </span>
            </span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-amber-50/70 text-amber-950 font-bold border-b border-amber-200">
                  <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                  <th className="py-2.5 px-4">ชื่อรายการ Fix Cost</th>
                  <th className="py-2.5 px-4 text-right w-44">จำนวนเงินที่ตั้งไว้ (บาท)</th>
                  <th className="py-2.5 px-4 text-center w-36">สถานะการลงบัญชี</th>
                  <th className="py-2.5 px-3 text-right w-24">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-slate-700">
                {currentFixCosts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      ยังไม่มีรายการ Fix Cost ประจำเดือนสำหรับธุรกิจนี้ (สามารถเพิ่มจากฟอร์มด้านบนได้เลยครับ)
                    </td>
                  </tr>
                ) : (
                  currentFixCosts.map((fc, index) => {
                    const isEditing = editingFcId === fc.id;
                    const isVariable = !fc.amount || fc.amount === 0;

                    if (isEditing) {
                      return (
                        <tr key={fc.id} className="bg-amber-50/40">
                          <td className="py-2 px-3 text-center text-gray-400">{index + 1}</td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={editFcName}
                              onChange={(e) => setEditFcName(e.target.value)}
                              className="w-full text-xs font-semibold py-1 px-2 border border-gray-200 rounded outline-none focus:border-amber-500 bg-white"
                            />
                          </td>
                          <td className="py-2 px-4 text-right">
                            <input
                              type="number"
                              value={editFcAmount}
                              onChange={(e) => setEditFcAmount(e.target.value)}
                              placeholder="เว้นว่างได้"
                              className="w-28 text-xs font-bold py-1 px-2 text-right border border-gray-200 rounded outline-none focus:border-amber-500 bg-white"
                            />
                          </td>
                          <td className="py-2 px-4 text-center text-gray-400 text-[11px]">-</td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEditFixCost(fc.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFcId(null)}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={fc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${isVariable ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span>{fc.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          {isVariable ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              ⚡ ยอดผันแปร (ไปกรอกในบันทึกรายจ่าย)
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800">
                              ฿{formatNumber(fc.amount || 0)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            📅 ลงวันสิ้นเดือนอัตโนมัติ
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditFixCost(fc)}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                              title="แก้ไขรายการ"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFixCost(fc.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="ลบรายการ Fix Cost นี้"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ส่วนที่ 3: ตั้งค่ารายการตรวจวิเคราะห์ (Autocomplete Tests) */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-6" id="manage-tests-container">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Sparkles className="text-amber-500" size={20} />
            <span>ตั้งค่ารายการตรวจวิเคราะห์ (Manage Autocomplete Tests)</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            คุณสามารถเพิ่มแนวราคาส่งแล็บนอก (Out-Lab) ที่พาร์ทเนอร์สถาบันใช้บ่อย เพื่อช่วยประหยัดเวลาพิมพ์ คลินิกจะเลือกแบบด่วนขึ้นได้ทันที
          </p>
        </div>

        {/* ฟอร์มเพิ่ม */}
        <form onSubmit={handleAddTest} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 block">ชื่อรายการวิเคราะห์ (Test Name)</label>
            <input
              type="text"
              className="w-full text-xs font-semibold py-2 px-3 border border-gray-200 rounded-lg outline-none focus:border-amber-500 bg-white"
              placeholder="เช่น Covid-19 ATK, PCR"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 block">ราคามาตรฐาน (Default Price)</label>
            <input
              type="number"
              className="w-full text-xs font-bold py-2 px-3 border border-gray-200 rounded-lg outline-none focus:border-amber-500 bg-white"
              value={newPrice}
              onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
              required
              min="0"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-4 rounded-lg transition-all h-10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>เพิ่มลงในรายการเสนอตรวจ</span>
            </button>
          </div>
        </form>

        {/* ตารางลิสต์ */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500">
              รายการที่มีอยู่ในระบบ (มีทั้งหมด {tests.length} รายการ)
            </span>
            {tests.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการตรวจทั้งหมดเพื่อเริ่มกรอกเองใหม่ทั้งหมด?')) {
                    setTests([]);
                    saveLabTests([]);
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-100 cursor-pointer"
              >
                ลบทั้งหมดเพื่อเริ่มใหม่
              </button>
            )}
          </div>
          <div className="border border-gray-100 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold text-xs border-b border-gray-100">
                  <th className="py-2.5 px-4">ชื่อรายการตรวจ (Test Name)</th>
                  <th className="py-2.5 px-4 text-center">ราคาเริ่มต้น (บาท)</th>
                  <th className="py-2.5 px-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-750">
                {tests.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">
                      ไม่พบรายการเสนอตรวจพิเศษ กรุณากรอกเพิ่มด้านบน
                    </td>
                  </tr>
                ) : (
                  tests.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-4 font-bold text-slate-800">{test.name}</td>
                      <td className="py-2 px-4 text-center font-mono font-bold text-amber-700">
                        ฿{test.defaultPrice.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveTest(test.id)}
                          className="p-1 px-2.5 text-xs text-rose-600 hover:text-white border border-rose-100 hover:bg-rose-500 rounded-md transition-all font-semibold cursor-pointer"
                        >
                          ลบรายการ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
