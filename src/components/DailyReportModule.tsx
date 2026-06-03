/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DailyRecord } from '../types';
import { formatNumber } from '../constants';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Printer, Calendar, ArrowRightLeft, TrendingUp, CheckCircle, AlertCircle, Bookmark, ClipboardList } from 'lucide-react';

interface DailyReportModuleProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  record: DailyRecord;
}

export default function DailyReportModule({
  currentDate,
  onDateChange,
  record,
}: DailyReportModuleProps) {
  const incomeItems = record.incomeItems || [];
  const expenseItems = record.expenseItems || [];
  const outLabItems = record.outLabItems || [];
  const hasOutLab = record.hasOutLab !== false;

  // แบ่งฝั่งรายรับ
  const cashIncome = incomeItems
    .filter((item) => item.type === 'cash')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const transferIncome = incomeItems
    .filter((item) => item.type === 'transfer')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalIncome = cashIncome + transferIncome;

  // แบ่งฝั่งรายจ่าย
  const totalGeneralExpense = expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalOutLab = hasOutLab ? outLabItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : 0;
  const totalExpense = totalGeneralExpense + totalOutLab;

  // กำไรสุทธิและการตรวจสอบเงินสด
  const netProfit = totalIncome - totalExpense;
  const expectedCash = cashIncome - totalGeneralExpense - totalOutLab;
  const countedCash = record.cashCheck?.countedCash || 0;
  const diff = countedCash - expectedCash;
  const isCorrect = Math.abs(diff) < 0.01;

  let cashStatusText = 'ไม่ได้ระบุตรวจสอบเงินสด';
  let cashStatusColor = 'text-gray-500 bg-gray-50';
  let cashStatusTextExact = 'ถูกต้อง';

  if (record.cashCheck?.isSaved) {
    if (Math.abs(diff) < 0.01) {
      cashStatusText = 'เงินถูกต้อง';
      cashStatusColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
    } else if (diff < 0) {
      cashStatusText = `เงินขาด ${formatNumber(Math.abs(diff))} บาท`;
      cashStatusColor = 'text-rose-705 bg-rose-50 border-rose-100';
      cashStatusTextExact = `ขาด ${formatNumber(Math.abs(diff))} บ.`;
    } else {
      cashStatusText = `เงินเกิน ${formatNumber(diff)} บาท`;
      cashStatusColor = 'text-amber-705 bg-amber-50 border-amber-100';
      cashStatusTextExact = `เกิน ${formatNumber(diff)} บ.`;
    }
  }

  // --- ส่งออกไฟล์ Excel ---
  const handleExportExcel = () => {
    const filename = `BKLabPlus_DailyReport_${currentDate}.xlsx`;

    // 1. หัวตาราง
    const headerRow = [['BKLabPlus Daily Report - รายงานสรุปประจำวัน'], [`วันที่: ${currentDate}`], []];

    // 2. ข้อมูลรายรับ
    const incomeRows = [
      ['[1] รายการรายรับ (Income)'],
      ['รายการ / ข้อมูล', 'ประเภทเงิน', 'จำนวนเงิน (บาท)'],
      ...incomeItems.map((item) => [
        item.description || 'ไม่ได้ระบุ',
        item.type === 'cash' ? 'เงินสด' : 'เงินโอน',
        item.amount,
      ]),
      ['รวมยอดเงินสดรับ', '', cashIncome],
      ['รวมยอดโอนเงินรับ', '', transferIncome],
      ['รวมรายรับทั้งหมด', '', totalIncome],
      [],
    ];

    // 3. ข้อมูลรายจ่าย
    const expenseRows = [
      ['[2] รายการรายจ่ายทั่วไป (General Expenses)'],
      ['รายการรายจ่าย', '', 'จำนวนเงิน (บาท)'],
      ...expenseItems.map((item) => [item.description || 'ไม่ได้ระบุ', '', item.amount]),
      ['รวมรายจ่ายทั่วไป', '', totalGeneralExpense],
      [],
    ];

    // 4. ข้อมูล Out-Lab
    const outLabRows = [
      ['[3] รายการส่งแล็บนอก (Out-Lab)'],
      ['LN (เลขแล็บ)', 'ชื่อรายการวิเคราะห์ / Test', 'จำนวนเงิน (บาท)'],
      ...(hasOutLab
        ? outLabItems.map((item) => [item.labNumber || '-', item.testName || '-', item.amount])
        : [['ไม่มีส่งแล็บในวันนี้', '', 0]]),
      ['รวมยอด Out-Lab', '', totalOutLab],
      [],
    ];

    // 5. บทสรุปการเงิน
    const summaryRows = [
      ['[4] บทสรุปทางการเงิน (Financial Summary)'],
      ['ตัวชี้วัด', '', 'จำนวนเงิน (บาท)'],
      ['รายรับทั้งหมด (เงินสด + โอน)', '', totalIncome],
      ['รายจ่ายทั้งหมด (ทั่วไป + Out-Lab)', '', totalExpense],
      ['รายได้สุทธิประจำวัน (Net Profit)', '', netProfit],
      ['ยอดเงินสดทางบัญชีที่ควรจะมี', '', expectedCash],
      ['ยอดเงินสดจากการตรวจสอบจริง', '', countedCash],
      ['ผลต่างการตรวจสอบเงิน (ขาด/เกิน)', '', diff],
      ['สถานะเงินสดวันนี้น์', '', record.cashCheck?.isSaved ? (Math.abs(diff) < 0.01 ? 'เงินถูกต้อง' : diff < 0 ? 'เงินขาด' : 'เงินเกิน') : 'ยังไม่ได้ตรวจสอบ'],
      ['หมายเหตุพิเศษ', '', record.cashCheck?.note || '-'],
    ];

    // ผสานข้อมูลทั้งหมดลงอาร์เรย์เดียว
    const allData = [
      ...headerRow,
      ...incomeRows,
      ...expenseRows,
      ...outLabRows,
      ...summaryRows,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(allData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานรายวัน');

    // เขียนไฟล์
    XLSX.writeFile(workbook, filename);
  };

  // --- ส่งออก PDF ด้วยเบราว์เซอร์ Print Layout ---
  const handlePrintPDF = () => {
    // ซ่อนแถบบอร์ดและเมนูของเว็บ แล้วสั่งพิมพ์
    window.print();
  };

  return (
    <div className="space-y-6" id="daily-report-module">
      {/* แถบควบคุมและส่งออก */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-150 flex flex-wrap gap-4 items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-medium block">ดูข้อมูลตรวจสอบของวันที่</span>
            <input
              type="date"
              id="report-date-picker"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-sm font-semibold text-gray-700 outline-none border border-gray-250 focus:border-blue-500 rounded px-2.5 py-1 bg-gray-50/50"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {/* ปุ่มพิมพ์ PDF เกรดพรีเมียม */}
          <button
            onClick={handlePrintPDF}
            id="btn-print-report"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-semibold text-xs transition-all shadow-xs"
          >
            <Printer size={15} />
            <span>พิมพ์รายงาน / บันทึก PDF (ไทย 100%)</span>
          </button>

          {/* ปุ่มดาวน์โหลด Excel */}
          <button
            onClick={handleExportExcel}
            id="btn-excel-report"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all shadow-xs"
          >
            <FileSpreadsheet size={15} />
            <span>ส่งออกตาราง Excel</span>
          </button>
        </div>
      </div>

      {/* ใบรายงานประเมินผลตัวจริงสำหรับ Print */}
      {/* ใช้ CSS หน้าพิมพ์ที่จะจัดเรียงฟิกให้อัตโนมัติเมื่อกดพิมพ์ */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-8 print:border-0 print:shadow-none print:p-0" id="daily-print-area">
        {/* Header แบรนด์ */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b-2 border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-8 bg-blue-600 rounded-md"></span>
              <span className="text-2xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                BKLabPlus
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
              Clinical & Lab Accounting Summary Report
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-left md:text-right">
            <span className="text-xs font-bold text-gray-400 block uppercase">เอกสารสรุปยอดรายวัน</span>
            <span className="text-sm font-black text-slate-800">{currentDate}</span>
          </div>
        </div>

        {/* ยอดไฮไลต์การเงิน (ตลับด้านบน) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
            <span className="text-[11px] font-bold text-blue-800 block mb-1">รายรับทั้งหมด</span>
            <span className="text-xl font-black text-blue-900">฿ {formatNumber(totalIncome)}</span>
            <div className="text-[10px] text-gray-450 mt-1.5 flex justify-between">
              <span>สด ฿{formatNumber(cashIncome)}</span>
              <span>โอน ฿{formatNumber(transferIncome)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50">
            <span className="text-[11px] font-bold text-rose-800 block mb-1">รายจ่ายรวม</span>
            <span className="text-xl font-black text-rose-900">฿ {formatNumber(totalExpense)}</span>
            <div className="text-[10px] text-gray-450 mt-1.5 flex justify-between">
              <span>ทั่วไป ฿{formatNumber(totalGeneralExpense)}</span>
              <span>แล็บนอก ฿{formatNumber(totalOutLab)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
            <span className="text-[11px] font-bold text-emerald-800 block mb-1">รายได้สุทธิ (Net)</span>
            <span className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-950 font-black' : 'text-rose-900'}`}>
              ฿ {formatNumber(netProfit)}
            </span>
            <span className="text-[9px] text-gray-400 block mt-1">รายรับหักรายจ่ายทั้งหมด</span>
          </div>

          <div className={`p-4 rounded-2xl border ${cashStatusColor}`}>
            <span className="text-[11px] font-bold text-slate-705 block mb-1">สถานะเงินสด</span>
            <span className="text-sm font-black block truncate">{cashStatusText}</span>
            <div className="text-[9px] text-gray-455 mt-1.5 flex items-center gap-1">
              <span>นับได้จริง ฿{formatNumber(countedCash)}</span>
            </div>
          </div>
        </div>

        {/* ยอดรวมสรุปแยกประเภท เงินสด VS เงินโอน เด่นชัด */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50/30 border border-emerald-100/60 rounded-2xl shadow-xs flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                สด
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 block">ยอดสรุป (เงินสด)</span>
                <span className="text-[10px] text-gray-400 block font-medium">รวมเงินสดที่เก็บหน้าร้านวันนี้</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-900 font-mono">฿ {formatNumber(cashIncome)}</span>
            </div>
          </div>

          <div className="p-4 bg-blue-50/30 border border-blue-100/60 rounded-2xl shadow-xs flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                โอน
              </div>
              <div>
                <span className="text-xs font-bold text-blue-800 block">ยอดสรุป (เงินโอน)</span>
                <span className="text-[10px] text-gray-400 block font-medium font-medium">รวมชำระผ่านพร้อมเพย์/คิวอาร์</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-blue-900 font-mono">฿ {formatNumber(transferIncome)}</span>
            </div>
          </div>
        </div>

        {/* 3 ตารางหลักแสดงข้อมูล */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
          {/* 1. ตารางรายรับ */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-800 border-l-4 border-emerald-500 pl-2">
              1. รายรับทั้งหมด (Income Details)
            </h4>
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-gray-100">
                    <th className="py-2.5 px-3">รายการรับ</th>
                    <th className="py-2.5 px-3 text-center">ประเภท</th>
                    <th className="py-2.5 px-3 text-right">จำนวน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {incomeItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">
                        ไม่มีข้อมูลบันทึกรายรับ
                      </td>
                    </tr>
                  ) : (
                    incomeItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-medium">{item.description || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.type === 'cash'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                : 'bg-blue-50 text-blue-800 border border-blue-105'
                            }`}
                          >
                            {item.type === 'cash' ? 'เงินสด' : 'เงินโอน'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium">
                          {formatNumber(item.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50/20 text-[11px] text-gray-700 border-t border-gray-150">
                    <td colSpan={2} className="py-2 px-3 text-right font-medium">รวมยอดเงินสด (Cash Subtotal):</td>
                    <td className="py-2 px-3 text-right text-emerald-800 font-mono font-bold">
                      {formatNumber(cashIncome)}
                    </td>
                  </tr>
                  <tr className="bg-blue-50/20 text-[11px] text-gray-700 border-t border-gray-100">
                    <td colSpan={2} className="py-2 px-3 text-right font-medium">รวมยอดเงินโอน (Transfer Subtotal):</td>
                    <td className="py-2 px-3 text-right text-blue-800 font-mono font-bold">
                      {formatNumber(transferIncome)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-xs text-slate-800 border-t-2 border-gray-200">
                    <td colSpan={2} className="py-2.5 px-3 text-right">
                      ยอดรวมรายรับทั้งหมด:
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-mono text-sm">
                      {formatNumber(totalIncome)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 2. ตารางรายจ่ายทั่วไป */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-800 border-l-4 border-rose-500 pl-2">
              2. รายจ่ายทั่วไป (General Expenses)
            </h4>
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-gray-100">
                    <th className="py-2.5 px-3">รายการรายจ่าย</th>
                    <th className="py-2.5 px-3 text-right">จำนวน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {expenseItems.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-gray-400">
                        ไม่มีค่าใช้จ่ายทั่วไปสะสม
                      </td>
                    </tr>
                  ) : (
                    expenseItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-medium">{item.description || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-rose-600">
                          {formatNumber(item.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-xs text-slate-800 border-t border-gray-150">
                    <td className="py-2.5 px-3 text-right">ยอดรวมรายจ่ายทั่วไป:</td>
                    <td className="py-2.5 px-3 text-right text-rose-700 font-mono">
                      {formatNumber(totalGeneralExpense)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* 3. ตาราง Out-Lab */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-sm text-slate-800 border-l-4 border-amber-500 pl-2">
            3. รายจ่ายส่งแล็บนอก (Out-Lab Status)
          </h4>
          <div className="border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-gray-100">
                  <th className="py-2.5 px-3 text-center">LN (เลขแล็บ)</th>
                  <th className="py-2.5 px-3">รายการส่งตรวจ (Test)</th>
                  <th className="py-2.5 px-3 text-right">ค่าบริการแล็บ (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {!hasOutLab ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 font-medium">
                      ไม่มีส่ง Lab (ยอด Out-Lab บันทึกเป็น 0)
                    </td>
                  </tr>
                ) : outLabItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">
                      ไม่มีรายละเอียดส่งแล็บ
                    </td>
                  </tr>
                ) : (
                  outLabItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">
                        {item.labNumber || '-'}
                      </td>
                      <td className="py-2 px-3 font-semibold">{item.testName || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-rose-500">
                        {formatNumber(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold text-xs text-slate-800 border-t border-gray-150">
                  <td colSpan={2} className="py-2.5 px-3 text-right">
                    ยอดรวมค่าส่งแล็บนอกทั้งหมด:
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-800 font-mono">
                    {formatNumber(totalOutLab)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ส่วนลงชื่อตรวจสอบและหมายเหตุ (สำคัญมาก สำหรับ Print) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 text-xs text-gray-600">
          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-gray-100">
            <span className="font-bold text-slate-800 block text-xs">สรุปหมายเหตุการตรวจสอบการเงิน</span>
            <div className="space-y-1">
              <p>
                <strong>ยอดเงินสดทับจริงที่นับได้:</strong> ฿{formatNumber(countedCash)}
              </p>
              <p>
                <strong>ยอดลอจิกความคลาดเคลื่อน:</strong>{' '}
                {isCorrect ? (
                  <span className="text-emerald-700 font-semibold">ถูกต้องตามระบบบัญชี</span>
                ) : (
                  <span className="text-rose-600 font-semibold font-mono">
                    {diff < 0 ? `ขาด ${formatNumber(Math.abs(diff))} บ.` : `เกิน ${formatNumber(diff)} บ.`}
                  </span>
                )}
              </p>
              <p className="mt-1">
                <strong>บันทึกกำกับหมายเหตุ:</strong> {record.cashCheck?.note || '-'}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-end items-end h-full">
            <div className="w-56 text-center space-y-6">
              <div className="border-b border-dashed border-gray-300 h-10 w-full"></div>
              <div>
                <p className="font-semibold text-slate-800">ผู้ตรวจสอบและสรุปยอดประจำวัน</p>
                <p className="text-[10px] text-gray-400 mt-0.5">คลินิก / แล็บวิเคราะห์</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
