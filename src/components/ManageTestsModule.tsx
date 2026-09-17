/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LabTestTemplate, Business } from '../types';
import { loadLabTests, saveLabTests, loadBusinesses, saveBusinesses, saveActiveBusinessId } from '../utils/storage';
import { subscribeToLabTests, subscribeToBusinesses } from '../utils/firebase';
import { getBusinessColorClasses } from '../constants';
import { Plus, Trash2, Save, Sparkles, Building2, CheckCircle2, Edit2, X, Check, Store } from 'lucide-react';
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

  // ซิงค์สเตทกับ props ถ้าส่งมา
  useEffect(() => {
    if (propBusinesses && propBusinesses.length > 0) {
      setBusinesses(propBusinesses);
    }
  }, [propBusinesses]);

  useEffect(() => {
    if (propActiveBusinessId) {
      setActiveId(propActiveBusinessId);
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
      {/* ส่วนที่ 1: จัดการรายชื่อบริษัท / ธุรกิจ (Multi-Business Management) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-6" id="manage-businesses-section">
        <div className="border-b border-gray-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Building2 className="text-blue-600" size={22} />
              <span>จัดการรายชื่อบริษัท / ธุรกิจ (Manage Businesses)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              เพิ่มและกำหนดรายชื่อบริษัทหรือธุรกิจของคุณ (รองรับ 2-3 บริษัทขึ้นไป) ข้อมูลรายรับ-รายจ่ายของแต่ละบริษัทจะถูกบันทึกแยกสมุดบัญชีกัน 100%
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

                <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  {isActive ? (
                    <div className="flex items-center gap-1.5 text-blue-600 text-xs font-extrabold">
                      <CheckCircle2 size={14} className="text-blue-600" />
                      <span>กำลังใช้งานอยู่นี้</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectBusiness(biz.id)}
                      className="text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-gray-200 transition-all cursor-pointer"
                    >
                      สลับมาใช้ธุรกิจนี้
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
                className="w-full text-xs font-semibold py-2 px-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white"
              >
                <option value="emerald">เขียว (Emerald) - เหมาะสำหรับ คลินิกหลัก</option>
                <option value="blue">ฟ้า (Blue) - เหมาะสำหรับ แผนกแล็บวิเคราะห์</option>
                <option value="purple">ม่วง (Purple) - เหมาะสำหรับ สาขาย่อย/บริษัท 2</option>
                <option value="amber">ส้มทอง (Amber) - เหมาะสำหรับ แผนกการค้า/หน้าร้าน</option>
                <option value="rose">กุหลาบ (Rose) - เหมาะสำหรับ แผนกเฉพาะทาง</option>
                <option value="cyan">ไซแอน (Cyan) - เหมาะสำหรับ แผนกทันตกรรม</option>
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

      {/* ส่วนที่ 2: ตั้งค่ารายการตรวจวิเคราะห์ (Autocomplete Tests) */}
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
            <span className="text-xs font-bold text-gray-500">รายการที่มีอยู่ในระบบ (มีทั้งหมด {tests.length} รายการ)</span>
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
