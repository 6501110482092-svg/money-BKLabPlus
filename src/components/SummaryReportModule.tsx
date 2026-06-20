/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DailyRecord } from '../types';
import { formatNumber } from '../constants';
import { loadAllRecords } from '../utils/storage';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Calendar,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  CreditCard,
  Building,
  HeartPulse,
  ChevronDown,
  BarChart3,
  ListOrdered,
} from 'lucide-react';

interface SummaryReportProps {
  currentDate: string;
}

export default function SummaryReportModule({ currentDate }: SummaryReportProps) {
  // วันที่เริ่มต้น-สิ้นสุด สำหรับภาพรวม
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [records, setRecords] = useState<Record<string, DailyRecord>>({});

  useEffect(() => {
    // โหลดประวัติทั้งหมด
    setRecords(loadAllRecords());

    // เซ็ตค่าช่วงเริ่มต้นเป็น 7 วันที่ผ่านมา ถึงวันนี้
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    setStartDate(formatDate(lastWeek));
    setEndDate(formatDate(today));
  }, [currentDate]);

  // หาลิสต์วันที่ตามระยะห่าง (Range)
  const getDateRangeList = (startStr: string, endStr: string) => {
    const list: string[] = [];
    if (!startStr || !endStr) return list;

    const start = new Date(startStr);
    const end = new Date(endStr);
    const current = new Date(start);

    // ป้องกันหน้าเว็บค้างถ้าเผลอคีย์สลับฝั่ง
    if (start > end) return list;

    const limit = 1000; // ลิมิตจำนวนวันเพื่อความปลอดภัย
    let count = 0;
    while (current <= end && count < limit) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      list.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return list;
  };

  const datesInRange = getDateRangeList(startDate, endDate);

  // คำนวณสรุปยอดสะสม
  let totalRangeIncome = 0;
  let totalRangeGeneralExpense = 0;
  let totalRangeOutLab = 0;

  // รวบรวมข้อมูล Out-Lab แยกตาม Test
  interface GroupedOutLab {
    testName: string;
    unitPrice: number;
    count: number;
    totalAmount: number;
  }

  const outLabGroups: Record<string, { count: number; totalAmount: number; prices: number[] }> = {};

  // จัดช่วงวันที่ดึงข้อมูล
  datesInRange.forEach((date) => {
    const rec = records[date];
    if (rec) {
      // รายรับ
      const incomeList = rec.incomeItems || [];
      incomeList.forEach((item) => {
        totalRangeIncome += Number(item.amount) || 0;
      });

      // รายจ่ายทั่วไป
      const expenseList = rec.expenseItems || [];
      expenseList.forEach((item) => {
        totalRangeGeneralExpense += Number(item.amount) || 0;
      });

      // ดึงฝั่ง Out-Lab
      if (rec.hasOutLab !== false) {
        const outLabList = rec.outLabItems || [];
        outLabList.forEach((item) => {
          const amt = Number(item.amount) || 0;
          totalRangeOutLab += amt;

          const testName = (item.testName || 'ส่งแล็บทั่วไป (อื่นๆ)').trim();
          if (!outLabGroups[testName]) {
            outLabGroups[testName] = { count: 0, totalAmount: 0, prices: [] };
          }
          outLabGroups[testName].count += 1;
          outLabGroups[testName].totalAmount += amt;
          outLabGroups[testName].prices.push(amt);
        });
      }
    }
  });

  const totalRangeExpense = totalRangeGeneralExpense + totalRangeOutLab;

  // แปลง Out-Lab Groups เป็นลิสต์และจัดเรียง (Sorting จากจำนวนมากไปน้อย)
  const sortedOutLabList: GroupedOutLab[] = Object.keys(outLabGroups).map((name) => {
    const group = outLabGroups[name];
    // คำนวณราราเฉลี่ยต่อหน่วย
    const unitPrice = group.count > 0 ? group.totalAmount / group.count : 0;
    return {
      testName: name,
      unitPrice,
      count: group.count,
      totalAmount: group.totalAmount,
    };
  });

  // เรียงลำดับ: จำนวนมาก -> น้อย
  sortedOutLabList.sort((a, b) => b.count - a.count);

  // หาผลรวมตารางท้าย Out-Lab
  const totalOutLabCount = sortedOutLabList.reduce((sum, item) => sum + item.count, 0);
  const totalOutLabAmountSum = sortedOutLabList.reduce((sum, item) => sum + item.totalAmount, 0);

  // --- ข้อมูลสำหรับ Recharts กราฟ ---
  const chartData = datesInRange.map((date) => {
    const rec = records[date];
    let inc = 0;
    let expGeneral = 0;
    let expLab = 0;

    if (rec) {
      inc = (rec.incomeItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      expGeneral = (rec.expenseItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      if (rec.hasOutLab !== false) {
        expLab = (rec.outLabItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      }
    }

    // ฟอร์แมตวันที่พองาม d/m
    const parts = date.split('-');
    const formattedDate = `${parts[2]}/${parts[1]}`;

    return {
      dateLabel: formattedDate,
      fullDate: date,
      'รายรับ': inc,
      'รายจ่าย': expGeneral + expLab,
      'ทั่วไป': expGeneral,
      'Out-Lab': expLab,
    };
  });

  // --- ส่งออก Excel ภาพรวมสะสม ---
  const handleExportExcel = () => {
    const filename = `ClinicLab_SummaryReport_${startDate}_to_${endDate}.xlsx`;

    // 1. หัวตาราง
    const headerRow = [
      ['สรุปผลรายงานภาพรวมบัญชีสะสม คลินิกและแล็บ'],
      [`ช่วงวันที่: ${startDate} ถึง ${endDate}`],
      [],
    ];

    // 2. สรุปภาพการเงิน
    const metricsRow = [
      ['ข้อมูลสรุปภาพรวมทางการเงิน'],
      ['ตัวชี้วัดหลัก', 'ยอดเงินรวมสะสม (บาท)'],
      ['รายรับรวมสะสม', totalRangeIncome],
      ['รายจ่ายทั่วไปรวมสะสม', totalRangeGeneralExpense],
      ['รายจ่าย Out-Lab รวมสะสม', totalRangeOutLab],
      ['ค่าใช้จ่ายรวมทั้งหมดสะสม', totalRangeExpense],
      ['รายได้สุทธิสะสม (Net Profit)', totalRangeIncome - totalRangeExpense],
      [],
    ];

    // 3. ตารางแจกแจง Out-Lab
    const outLabHeader = [
      ['รายละเอียดรายการตรวจส่งแล็บนอก (Out-Lab) - เรียงลำดับจากใช้บริการบ่อยที่สุด'],
      ['วิเคราะห์วิจัย / Test', 'ราคาเฉลี่ยต่อหน่วย (บาท)', 'จำนวนครั้งส่งตรวจ', 'รวมเงินสะสม (บาท)'],
    ];

    const outLabRows = sortedOutLabList.map((item) => [
      item.testName,
      item.unitPrice,
      item.count,
      item.totalAmount,
    ]);

    const outLabFooter = [['รวมบริการส่งตรวจทั้งหมด', '', totalOutLabCount, totalOutLabAmountSum]];

    // รวมข้อมูล
    const allAOA = [
      ...headerRow,
      ...metricsRow,
      ...outLabHeader,
      ...outLabRows,
      ...outLabFooter,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(allAOA);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'สรุปภาพรวม');

    XLSX.writeFile(workbook, filename);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="summary-report-module">
      {/* พาเนลควบคุมช่วงวันที่ */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-150 flex flex-wrap gap-4 items-center justify-between print:hidden">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">ตั้งแต่</span>
            <input
              type="date"
              id="summary-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-bold text-gray-700 border border-gray-200 focus:border-blue-500 outline-none rounded-lg px-2 py-1.5 bg-gray-50/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">ถึง</span>
            <input
              type="date"
              id="summary-end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold text-gray-700 border border-gray-200 focus:border-blue-500 outline-none rounded-lg px-2 py-1.5 bg-gray-50/50"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {/* พิมพ์ PDF ภาพรวม */}
          <button
            onClick={handlePrintPDF}
            id="btn-print-summary"
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs transition-all shadow-xs"
          >
            <Printer size={14} />
            <span>พิมพ์รายงานภาพรวม (PDF)</span>
          </button>

          {/* ส่งออกภาพรวม Excel */}
          <button
            onClick={handleExportExcel}
            id="btn-excel-summary"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs"
          >
            <FileSpreadsheet size={14} />
            <span>ส่งออก Excel ภาพรวม</span>
          </button>
        </div>
      </div>

      {/* ใบรายงานทางการแพทย์สะสม */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 space-y-8 print:border-0 print:shadow-none print:p-0">
        {/* หัวแบรนด์เอกสาร */}
        <div className="flex justify-between items-center pb-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-8 bg-blue-600 rounded-md"></span>
              <span className="text-xl md:text-2xl font-black text-slate-900">Clinic Ledger</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">
              Cumulative Comprehensive Performance & Out-Lab Audit Report
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="text-gray-400 block font-semibold uppercase">สรุปช่วงวันที่สะสม</span>
            <span className="font-bold text-gray-800">
              {startDate} ถึง {endDate}
            </span>
          </div>
        </div>

        {/* ยอดไฮไลต์สะสม */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-gray-400 block mb-1">รายรับสะสมรวม</span>
            <span className="text-xl font-black text-emerald-600">฿ {formatNumber(totalRangeIncome)}</span>
            <span className="text-[10px] text-gray-405 block mt-1">จากบริการแล็บทั้งหมด</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-gray-400 block mb-1">รายจ่ายทั่วไปสะสม</span>
            <span className="text-xl font-black text-rose-500">฿ {formatNumber(totalRangeGeneralExpense)}</span>
            <span className="text-[10px] text-gray-405 block mt-1">ค่าน้ำ ยา เวชภัณฑ์ และอื่นๆ</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-semibold text-gray-400 block mb-1">รายจ่าย Out-Lab รวม</span>
            <span className="text-xl font-black text-amber-500">฿ {formatNumber(totalRangeOutLab)}</span>
            <span className="text-[10px] text-gray-410 block mt-1">ส่งพาร์ทเนอร์แล็บนอก</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-55/40 border border-emerald-100 text-emerald-950">
            <span className="text-xs font-semibold text-emerald-800 block mb-1">รายได้สุทธิสะสม</span>
            <span className="text-xl font-black">฿ {formatNumber(totalRangeIncome - totalRangeExpense)}</span>
            <span className="text-[10px] text-emerald-700 block mt-1">รวมรับหักประมวลผลจ่าย</span>
          </div>
        </div>

        {/* ตารางแสดงภาพรวมส่งตรวจแล็บ (Out-Lab list) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <ListOrdered size={16} className="text-slate-500" />
              <span>สรุปรายละเอียดส่งแล็บนอก (Sorted by quantity)</span>
            </h4>
            <span className="text-[10px] text-gray-400">
              * เรียงลำดับจากรายการที่ส่งตรวจมากสุดไปหาน้อยที่สุด
            </span>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-gray-150">
                  <th className="py-3 px-4">รายการวิเคราะห์โรค / Test</th>
                  <th className="py-3 px-4 text-center">ราคาเฉลี่ยต่อหน่วย (บาท)</th>
                  <th className="py-3 px-4 text-center">จำนวนที่ส่ง (ครั้ง)</th>
                  <th className="py-3 px-4 text-right">ยอดเงินรวมพิกัด (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {sortedOutLabList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">
                      ไม่พบประวัติส่งแล็บนอกในช่วงวันที่เลือก
                    </td>
                  </tr>
                ) : (
                  sortedOutLabList.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>{item.testName}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-gray-500">
                        ฿{formatNumber(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-full">
                          {item.count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                        ฿{formatNumber(item.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/80 font-black text-xs text-slate-800 border-t border-gray-200">
                  <td colSpan={2} className="py-3 px-4 text-right">
                    สรุปผลรวมแล็บนอก:
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-amber-800 font-extrabold">{totalOutLabCount} ครั้ง</span>
                  </td>
                  <td className="py-3 px-4 text-right text-amber-800 font-mono">
                    ฿{formatNumber(totalOutLabAmountSum)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* แดชบอร์ดกราฟแสดงข้อมูลพฤติกรรม (Chart UI) */}
        {datesInRange.length > 0 && (
          <div className="space-y-6 pt-4 print:hidden" id="financial-charts-block">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <BarChart3 size={16} className="text-blue-500" />
              <h4 className="font-bold text-sm text-slate-800">
                กราฟพฤติกรรมการเงินรายวัน (Financial Charts)
              </h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* (1) กราฟรายรับ */}
              <div className="bg-white p-4 border border-gray-100 rounded-2xl shadow-2xs space-y-3">
                <span className="text-xs font-bold text-gray-500 block">กราฟรายรับรายวัน</span>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="รายรับ"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorInc)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* (2) กราฟรายจ่าย */}
              <div className="bg-white p-4 border border-gray-100 rounded-2xl shadow-2xs space-y-3">
                <span className="text-xs font-bold text-gray-500 block">กราฟรายจ่ายรายวัน (ทั่วไป + Out-Lab)</span>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="ทั่วไป" stackId="a" fill="#f43f5e" />
                      <Bar dataKey="Out-Lab" stackId="a" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
