/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LabTestTemplate } from '../types';
import { loadLabTests, saveLabTests } from '../utils/storage';
import { Plus, Trash2, Save, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function ManageTestsModule() {
  const [tests, setTests] = useState<LabTestTemplate[]>([]);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number>(100);

  useEffect(() => {
    setTests(loadLabTests());
  }, []);

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
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6" id="manage-tests-container">
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
            className="w-full bg-amber-550 hover:bg-amber-600 bg-amber-500 text-white font-bold text-xs py-2 px-4 rounded-lg transition-all h-10 flex items-center justify-center gap-1.5"
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
              className="text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-100"
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
                        className="p-1 px-2.5 text-xs text-rose-600 hover:text-white border border-rose-100 hover:bg-rose-500 rounded-md transition-all font-semibold"
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
  );
}
