/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DailyRecord } from '../types';
import { formatNumber } from '../constants';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  ArrowRightLeft,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Bookmark,
  ClipboardList,
  Wallet,
  Receipt,
  FlaskConical,
  Layers,
  Edit3,
} from 'lucide-react';

interface DailyReportModuleProps {
  key?: React.Key;
  currentDate: string;
  onDateChange: (date: string) => void;
  record: DailyRecord;
  activeBusinessId?: string;
  businessName?: string;
  businessCode?: string;
  businessLogoUrl?: string;
}

function getTodayThaiFormatted(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const beYear = d.getFullYear() + 543;
  return `${day}/${month}/${beYear}`;
}

export default function DailyReportModule({
  currentDate,
  onDateChange,
  record,
  activeBusinessId,
  businessName = 'คลินิกเวชกรรม / แผนกแพทย์',
  businessCode = 'CLN',
  businessLogoUrl,
}: DailyReportModuleProps) {
  const bizSuffix = activeBusinessId ? `_${activeBusinessId}` : '';

  const [customDailyTitle, setCustomDailyTitle] = React.useState<string>(() => {
    return localStorage.getItem(`bklabplus_daily_custom_title${bizSuffix}`) || '';
  });

  const handleCustomDailyTitleChange = (val: string) => {
    setCustomDailyTitle(val);
    localStorage.setItem(`bklabplus_daily_custom_title${bizSuffix}`, val);
  };

  // ข้อความใต้ลายเซ็นประจำวัน (บันทึกเป็นค่าเริ่มต้นอัตโนมัติแยกตามธุรกิจ)
  const [signatureTitle, setSignatureTitle] = React.useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_daily_title${bizSuffix}`) || 'ผู้ตรวจสอบประจำวัน';
  });
  const [signatureSubtitle, setSignatureSubtitle] = React.useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_daily_sub${bizSuffix}`) || businessName || 'คลินิก / แล็บวิเคราะห์';
  });
  const [signatureSignerName, setSignatureSignerName] = React.useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_daily_name${bizSuffix}`) || '';
  });
  const [signatureDate, setSignatureDate] = React.useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_daily_date${bizSuffix}`) || '';
  });

  // ซิงค์ข้อความลายเซ็นและชื่อเมื่อเปลี่ยนธุรกิจ
  React.useEffect(() => {
    const sfx = activeBusinessId ? `_${activeBusinessId}` : '';
    setCustomDailyTitle(localStorage.getItem(`bklabplus_daily_custom_title${sfx}`) || '');
    setSignatureTitle(localStorage.getItem(`bklabplus_sig_daily_title${sfx}`) || 'ผู้ตรวจสอบประจำวัน');
    setSignatureSubtitle(localStorage.getItem(`bklabplus_sig_daily_sub${sfx}`) || businessName || 'คลินิก / แล็บวิเคราะห์');
    setSignatureSignerName(localStorage.getItem(`bklabplus_sig_daily_name${sfx}`) || '');
    setSignatureDate(localStorage.getItem(`bklabplus_sig_daily_date${sfx}`) || '');
  }, [activeBusinessId, businessName]);

  const handleSignatureTitleChange = (val: string) => {
    setSignatureTitle(val);
    localStorage.setItem(`bklabplus_sig_daily_title${bizSuffix}`, val);
  };

  const handleSignatureSubtitleChange = (val: string) => {
    setSignatureSubtitle(val);
    localStorage.setItem(`bklabplus_sig_daily_sub${bizSuffix}`, val);
  };

  const handleSignatureSignerNameChange = (val: string) => {
    setSignatureSignerName(val);
    localStorage.setItem(`bklabplus_sig_daily_name${bizSuffix}`, val);
  };

  const handleSignatureDateChange = (val: string) => {
    setSignatureDate(val);
    localStorage.setItem(`bklabplus_sig_daily_date${bizSuffix}`, val);
  };

  // สถานะเปิด/ปิดแสดงผลแต่ละตารางในรายงาน
  const [showIncomeTable, setShowIncomeTable] = React.useState<boolean>(true);
  const [showExpenseTable, setShowExpenseTable] = React.useState<boolean>(true);
  const [showOutLabTable, setShowOutLabTable] = React.useState<boolean>(true);
  const [showNoteSummary, setShowNoteSummary] = React.useState<boolean>(true);
  const [showSignatureSection, setShowSignatureSection] = React.useState<boolean>(true);

  const incomeItems = record?.incomeItems || [];
  const expenseItems = record?.expenseItems || [];
  const outLabItems = record?.outLabItems || [];
  const hasOutLab = record?.hasOutLab !== false;

  const handleSelectAllTables = () => {
    setShowIncomeTable(true);
    setShowExpenseTable(true);
    setShowOutLabTable(true);
    setShowNoteSummary(true);
    setShowSignatureSection(true);
  };

  const handleHideEmptyTables = () => {
    if (incomeItems.length === 0) setShowIncomeTable(false);
    if (expenseItems.length === 0) setShowExpenseTable(false);
    if (!hasOutLab || outLabItems.length === 0) setShowOutLabTable(false);
  };

  // แบ่งฝั่งรายรับ
  const cashIncome = incomeItems
    .filter((item) => item.type === 'cash')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const transferIncome = incomeItems
    .filter((item) => item.type === 'transfer')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalIncome = cashIncome + transferIncome;

  // แบ่งฝั่งรายจ่าย
  const cashGeneralExpense = expenseItems
    .filter((item) => item.type !== 'transfer')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const transferGeneralExpense = expenseItems
    .filter((item) => item.type === 'transfer')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalGeneralExpense = cashGeneralExpense + transferGeneralExpense;
  const totalOutLab = hasOutLab ? outLabItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : 0;
  const totalExpense = totalGeneralExpense + totalOutLab;

  // กำไรสุทธิและการตรวจสอบเงินสด
  const netProfit = totalIncome - totalExpense;
  // ยอดเงินสดในเกะตามระบบที่ควรจะมี = รับเงินสด - จ่ายเงินสด - Out-Lab (ไม่หักรายจ่ายเงินโอน)
  const expectedCash = cashIncome - cashGeneralExpense - totalOutLab;
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
    const filename = `${businessCode || 'BIZ'}_DailyReport_${currentDate}.xlsx`;

    // 1. หัวตาราง
    const headerRow = [
      ['รายงานประจำวัน - บันทึกรายรับ-รายจ่าย'],
      [`บริษัท/ธุรกิจ: ${businessName} (${businessCode})`],
      [`วันที่: ${currentDate}`],
      [],
    ];

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

    // ผสานข้อมูลทั้งหมดลงอาร์เรย์เดียวตามตารางที่เลือกแสดง
    const allData = [
      ...headerRow,
      ...(showIncomeTable ? incomeRows : []),
      ...(showExpenseTable ? expenseRows : []),
      ...(showOutLabTable ? outLabRows : []),
      ...(showNoteSummary ? summaryRows : []),
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
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Printer size={15} />
            <span>พิมพ์รายงาน / บันทึก PDF (ไทย 100%)</span>
          </button>

          {/* ปุ่มดาวน์โหลด Excel */}
          <button
            onClick={handleExportExcel}
            id="btn-excel-report"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>ส่งออกตาราง Excel</span>
          </button>
        </div>

        {/* แถบตัวเลือกเปิด/ปิดการแสดงผลตาราง (Checkboxes for table display in report) */}
        <div className="w-full pt-3 border-t border-gray-150 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Layers size={15} className="text-blue-600" />
              <span>เลือกตารางที่ต้องการแสดงในรายงาน:</span>
            </span>

            {/* Checkbox: ตารางรายรับ */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
              showIncomeTable
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={showIncomeTable}
                onChange={(e) => setShowIncomeTable(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <span className="flex items-center gap-1">
                <Wallet size={13} className={showIncomeTable ? 'text-emerald-600' : 'text-gray-400'} />
                <span>ตารางรายรับ</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                incomeItems.length > 0 ? 'bg-emerald-200/70 text-emerald-900 font-bold' : 'bg-gray-200 text-gray-600'
              }`}>
                {incomeItems.length}
              </span>
            </label>

            {/* Checkbox: ตารางรายจ่ายทั่วไป */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
              showExpenseTable
                ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={showExpenseTable}
                onChange={(e) => setShowExpenseTable(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
              />
              <span className="flex items-center gap-1">
                <Receipt size={13} className={showExpenseTable ? 'text-rose-600' : 'text-gray-400'} />
                <span>ตารางรายจ่ายทั่วไป</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                expenseItems.length > 0 ? 'bg-rose-200/70 text-rose-900 font-bold' : 'bg-gray-200 text-gray-600'
              }`}>
                {expenseItems.length}
              </span>
            </label>

            {/* Checkbox: ตารางส่งแล็บนอก Out-Lab */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
              showOutLabTable
                ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={showOutLabTable}
                onChange={(e) => setShowOutLabTable(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
              />
              <span className="flex items-center gap-1">
                <FlaskConical size={13} className={showOutLabTable ? 'text-amber-600' : 'text-gray-400'} />
                <span>ตารางส่งแล็บนอก</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                hasOutLab && outLabItems.length > 0 ? 'bg-amber-200/70 text-amber-900 font-bold' : 'bg-gray-200 text-gray-600'
              }`}>
                {hasOutLab ? outLabItems.length : 0}
              </span>
            </label>

            {/* Checkbox: หมายเหตุการตรวจสอบ */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
              showNoteSummary
                ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={showNoteSummary}
                onChange={(e) => setShowNoteSummary(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
              />
              <span className="flex items-center gap-1">
                <Edit3 size={13} className={showNoteSummary ? 'text-amber-600' : 'text-gray-400'} />
                <span>หมายเหตุ</span>
              </span>
            </label>

            {/* Checkbox: ส่วนลงนาม */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
              showSignatureSection
                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={showSignatureSection}
                onChange={(e) => setShowSignatureSection(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <span className="flex items-center gap-1">
                <CheckCircle size={13} className={showSignatureSection ? 'text-indigo-600' : 'text-gray-400'} />
                <span>ส่วนลงนาม</span>
              </span>
            </label>
          </div>

          {/* ปุ่มตัวช่วยเร็ว */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHideEmptyTables}
              className="text-[11px] font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="ซ่อนตารางที่ไม่มีข้อมูล เพื่อไม่ให้มีตารางว่างในรายงาน"
            >
              ซ่อนตารางที่ว่าง
            </button>
            <button
              type="button"
              onClick={handleSelectAllTables}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              เลือกแสดงทั้งหมด
            </button>
          </div>
        </div>
      </div>

      {/* ใบรายงานประเมินผลตัวจริงสำหรับ Print */}
      {/* ใช้ CSS หน้าพิมพ์ที่จะจัดเรียงฟิกให้อัตโนมัติเมื่อกดพิมพ์ */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-8 print:border-0 print:shadow-none print:p-0" id="daily-print-area">
        {/* Header แบรนด์ */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-100">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              {businessLogoUrl ? (
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  <img src={businessLogoUrl} alt={businessName} className="w-full h-full object-contain" />
                </div>
              ) : (
                <span className="w-4 h-8 bg-blue-600 rounded-md shrink-0"></span>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl md:text-2xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Daily Ledger
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    {businessName}
                  </span>
                </div>
              </div>
            </div>

            {/* ช่องพิมพ์หัวข้อเอกสาร / เดือน / กะการทำงาน ลงมาอยู่ใต้ชื่อบริษัท */}
            <div className="space-y-1">
              <div className="print:hidden">
                <input
                  type="text"
                  value={customDailyTitle}
                  onChange={(e) => handleCustomDailyTitleChange(e.target.value)}
                  placeholder="คลิกพิมพ์หัวข้อ เช่น ประจำเดือน กันยายน / เวรเช้า"
                  className="text-xs font-black text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-2.5 py-1 outline-none shadow-2xs w-full max-w-sm"
                />
              </div>
              {customDailyTitle && (
                <h3 className="hidden print:block text-base font-black text-slate-900">
                  {customDailyTitle}
                </h3>
              )}
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
                Income-Expense Daily Report • {businessName}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0 bg-slate-50 p-2.5 px-3.5 rounded-xl border border-slate-150 self-start sm:self-auto min-w-[150px]">
            <span className="text-[11px] font-bold text-gray-400 block uppercase">เอกสารสรุปยอดรายวัน</span>
            <span className="text-sm font-black text-slate-800 block mt-0.5 font-mono">{currentDate}</span>
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
        <div className={`grid gap-8 pt-2 ${
          showIncomeTable && showExpenseTable ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}>
          {/* 1. ตารางรายรับ */}
          {showIncomeTable && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-800 border-l-4 border-emerald-500 pl-2">
                  1. รายรับทั้งหมด (Income Details)
                </h4>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 cursor-pointer print:hidden select-none bg-slate-50 hover:bg-emerald-50 px-2 py-0.5 rounded-lg border border-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={showIncomeTable}
                    onChange={(e) => setShowIncomeTable(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <span className="text-[11px] font-medium">แสดงในรายงาน</span>
                </label>
              </div>
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
          )}

          {/* 2. ตารางรายจ่ายทั่วไป */}
          {showExpenseTable && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-800 border-l-4 border-rose-500 pl-2">
                  2. รายจ่ายทั่วไป (General Expenses)
                </h4>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-700 cursor-pointer print:hidden select-none bg-slate-50 hover:bg-rose-50 px-2 py-0.5 rounded-lg border border-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={showExpenseTable}
                    onChange={(e) => setShowExpenseTable(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                  />
                  <span className="text-[11px] font-medium">แสดงในรายงาน</span>
                </label>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-gray-100">
                      <th className="py-2.5 px-3">รายการรายจ่าย</th>
                      <th className="py-2.5 px-3 text-center">ช่องทาง</th>
                      <th className="py-2.5 px-3 text-right">จำนวน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {expenseItems.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-400">
                          ไม่มีค่าใช้จ่ายทั่วไปสะสม
                        </td>
                      </tr>
                    ) : (
                      expenseItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-medium">{item.description || '-'}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.type === 'transfer'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.type === 'transfer' ? 'โอน' : 'สด'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-rose-600">
                            {formatNumber(item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/20 text-[11px] text-gray-700 border-t border-gray-150">
                      <td colSpan={2} className="py-1.5 px-3 text-right font-medium">รวมจ่ายเงินสด (หักเกะ):</td>
                      <td className="py-1.5 px-3 text-right text-emerald-800 font-mono font-bold">
                        {formatNumber(cashGeneralExpense)}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/20 text-[11px] text-gray-700 border-t border-gray-100">
                      <td colSpan={2} className="py-1.5 px-3 text-right font-medium">รวมจ่ายเงินโอน (ตัดบัญชี):</td>
                      <td className="py-1.5 px-3 text-right text-blue-800 font-mono font-bold">
                        {formatNumber(transferGeneralExpense)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-xs text-slate-800 border-t-2 border-gray-200">
                      <td colSpan={2} className="py-2.5 px-3 text-right">ยอดรวมรายจ่ายทั่วไป:</td>
                      <td className="py-2.5 px-3 text-right text-rose-700 font-mono">
                        {formatNumber(totalGeneralExpense)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 3. ตาราง Out-Lab */}
        {showOutLabTable && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800 border-l-4 border-amber-500 pl-2">
                3. รายจ่ายส่งแล็บนอก (Out-Lab Status)
              </h4>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-700 cursor-pointer print:hidden select-none bg-slate-50 hover:bg-amber-50 px-2 py-0.5 rounded-lg border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={showOutLabTable}
                  onChange={(e) => setShowOutLabTable(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                />
                <span className="text-[11px] font-medium">แสดงในรายงาน</span>
              </label>
            </div>
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
        )}

        {/* กรณีผู้ใช้ติ๊กปิดทุกตาราง */}
        {!showIncomeTable && !showExpenseTable && !showOutLabTable && (
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 space-y-2">
            <p className="text-sm font-bold text-slate-600">
              ทุกตารางรายละเอียดถูกซ่อนอยู่ตามที่คุณเลือก
            </p>
            <p className="text-xs text-gray-400">
              สามารถติ๊กเครื่องหมายถูกที่แถบด้านบน เพื่อเลือกแสดงตารางรายรับ, รายจ่าย, หรือ Out-Lab ในรายงานได้ทันที
            </p>
            <button
              type="button"
              onClick={handleSelectAllTables}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              เลือกแสดงตารางทั้งหมดอีกครั้ง
            </button>
          </div>
        )}

        {/* ส่วนหมายเหตุการตรวจสอบ (แยกจากส่วนลงนาม) */}
        {showNoteSummary && (
          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-gray-100 break-inside-avoid print:break-inside-avoid text-xs text-gray-600 mb-6">
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
        )}

        {/* ส่วนลงชื่อตรวจสอบ (แยกจากหมายเหตุ) */}
        {showSignatureSection && (
          <div className="pt-6 border-t border-slate-100 text-xs text-gray-600 break-inside-avoid print:break-inside-avoid flex justify-end">
            <div className="w-64 max-w-full text-center space-y-2">
              <div className="border-b border-dashed border-gray-400 h-9 w-full"></div>
              {/* ช่องพิมพ์ชื่อ-นามสกุลในวงเล็บ */}
              <div className="flex items-center justify-center gap-0.5 text-slate-700 text-xs font-mono w-full px-1">
                <span className="font-bold select-none text-slate-500">(</span>
                <input
                  type="text"
                  value={signatureSignerName}
                  onChange={(e) => handleSignatureSignerNameChange(e.target.value)}
                  placeholder=".........................................."
                  className="flex-1 max-w-[200px] text-center bg-transparent hover:bg-slate-100/80 focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-blue-400 outline-none text-xs font-semibold text-slate-800 placeholder:text-slate-300 transition-all print:border-0 print:bg-transparent print:p-0"
                  title="พิมพ์ชื่อ-นามสกุลในวงเล็บ หรือเว้นว่างไว้เพื่อรอเซ็นชื่อ"
                />
                <span className="font-bold select-none text-slate-500">)</span>
              </div>
              {/* ตำแหน่งและสังกัด */}
              <div className="space-y-1 group">
                <input
                  type="text"
                  value={signatureTitle}
                  onChange={(e) => handleSignatureTitleChange(e.target.value)}
                  placeholder="พิมพ์ตำแหน่งใต้ลายเซ็น เช่น ผู้ตรวจสอบประจำวัน..."
                  className="w-full text-center font-bold text-slate-800 text-xs bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 rounded-md py-1 px-1.5 outline-none transition-all print:border-0 print:bg-transparent print:p-0"
                  title="คลิกเพื่อแก้ไขข้อความใต้ลายเซ็น (จำค่าเริ่มต้นไว้ให้อัตโนมัติ)"
                />
                <input
                  type="text"
                  value={signatureSubtitle}
                  onChange={(e) => handleSignatureSubtitleChange(e.target.value)}
                  placeholder="พิมพ์สังกัด/หน่วยงาน..."
                  className="w-full text-center text-[11px] text-slate-500 bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 rounded-md py-0.5 px-1.5 outline-none transition-all print:border-0 print:bg-transparent print:p-0"
                  title="คลิกเพื่อแก้ไขสังกัด/หน่วยงาน (จำค่าเริ่มต้นไว้ให้อัตโนมัติ)"
                />
                <p className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                  ✏️ คลิกพิมพ์เปลี่ยนข้อความได้ (จำค่าเริ่มต้นอัตโนมัติ)
                </p>
              </div>
              {/* วันที่ใต้ชื่อ สามารถพิมพ์ตัวเลขเองได้ หรือกดปุ่ม 'วันนี้' */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                <span className="font-medium text-slate-600">วันที่:</span>
                <input
                  type="text"
                  value={signatureDate}
                  onChange={(e) => handleSignatureDateChange(e.target.value)}
                  placeholder="....... / ....... / ............"
                  className="w-24 text-center bg-transparent hover:bg-slate-100/80 focus:bg-white border-b border-dashed border-gray-300 hover:border-slate-400 focus:border-blue-400 outline-none text-[11px] text-slate-700 transition-all print:border-0 print:bg-transparent print:p-0"
                  title="พิมพ์วันที่หรือตัวเลขกำกับ (หรือกดปุ่ม 'วันนี้')"
                />
                <button
                  type="button"
                  onClick={() => handleSignatureDateChange(getTodayThaiFormatted())}
                  className="px-1.5 py-0.5 text-[9px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all cursor-pointer shadow-2xs print:hidden active:scale-95"
                  title="กดเพื่อใส่วันที่ปัจจุบันทันที"
                >
                  📅 วันนี้
                </button>
                {signatureDate && (
                  <button
                    type="button"
                    onClick={() => handleSignatureDateChange('')}
                    className="text-[10px] text-slate-400 hover:text-rose-600 px-1 py-0.5 print:hidden cursor-pointer"
                    title="ล้างวันที่เพื่อเว้นว่างไว้เขียนมือ"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
