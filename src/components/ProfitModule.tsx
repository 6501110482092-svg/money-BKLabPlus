/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DailyRecord, PeriodCashCheckRecord } from '../types';
import { formatNumber, getTodayDateString, getLastDayOfMonth, getBusinessColorClasses } from '../constants';
import { loadPeriodCashCheck, savePeriodCashCheck, loadAllRecords } from '../utils/storage';
import {
  Save,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle,
  AlertTriangle,
  Coins,
  TrendingUp,
  ShieldAlert,
  Printer,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Building2,
  DollarSign,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfitModuleProps {
  key?: React.Key;
  currentDate: string;
  onDateChange: (date: string) => void;
  record: DailyRecord;
  onSaveRecord: (record: DailyRecord) => void;
  activeBusinessId?: string;
  businessName?: string;
  businessCode?: string;
  businessLogoUrl?: string;
  allBusinessRecords?: Record<string, DailyRecord>;
}

// ฟังก์ชันคำนวณวันเริ่มต้นของเดือน YYYY-MM-01
function getFirstDayOfMonth(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return `${parts[0]}-${parts[1]}-01`;
}

// ฟังก์ชันคำนวณช่วงเดือนก่อนหน้า
function getPreviousMonthRange(dateStr: string): { start: string; end: string } {
  const parts = (dateStr || getTodayDateString()).split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  const monthStr = String(month).padStart(2, '0');
  const start = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

// ฟังก์ชันคำนวณช่วง N วันล่าสุด
function getLastNDaysRange(days: number): { start: string; end: string } {
  const endObj = new Date();
  const startObj = new Date();
  startObj.setDate(endObj.getDate() - (days - 1));

  const formatD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { start: formatD(startObj), end: formatD(endObj) };
}

function getTodayThaiFormatted(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const beYear = d.getFullYear() + 543;
  return `${day}/${month}/${beYear}`;
}

export default function ProfitModule({
  currentDate,
  onDateChange,
  record,
  onSaveRecord,
  activeBusinessId = 'clinic-main',
  businessName = 'คลินิกเวชกรรม / แผนกแพทย์',
  businessCode = 'CLN',
  businessLogoUrl,
  allBusinessRecords,
}: ProfitModuleProps) {
  // โหมดการดู: 'day' = รายวัน (1 วัน), 'range' = เป็นช่วงวันที่ / รายเดือน
  const [viewMode, setViewMode] = useState<'day' | 'range'>(() => {
    return (localStorage.getItem('bklabplus_profit_view_mode') as 'day' | 'range') || 'day';
  });

  // ตัวเลือกพรีเซ็ตช่วงวันที่: 'this_month' | 'last_month' | '7days' | '30days' | 'custom'
  const [rangePreset, setRangePreset] = useState<string>(() => {
    return localStorage.getItem('bklabplus_profit_range_preset') || 'this_month';
  });

  const [startDate, setStartDate] = useState<string>(() => {
    const saved = localStorage.getItem('bklabplus_profit_start_date');
    if (saved) return saved;
    return getFirstDayOfMonth(currentDate || getTodayDateString());
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const saved = localStorage.getItem('bklabplus_profit_end_date');
    if (saved) return saved;
    return getLastDayOfMonth(currentDate || getTodayDateString());
  });

  // ตัวเลือกแสดงหรือไม่แสดงตารางแจกแจงรายวันในรายงาน
  const [showDailyBreakdownTable, setShowDailyBreakdownTable] = useState<boolean>(() => {
    const saved = localStorage.getItem('bklabplus_profit_show_breakdown_table');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleBreakdownTable = (val: boolean) => {
    setShowDailyBreakdownTable(val);
    localStorage.setItem('bklabplus_profit_show_breakdown_table', String(val));
  };

  const bizSuffix = activeBusinessId ? `_${activeBusinessId}` : '';

  // ข้อความใต้ลายเซ็นสำหรับโหมดรายวันเดี่ยว (แยกตามธุรกิจ)
  const [profitDaySigTitle, setProfitDaySigTitle] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_day_title${bizSuffix}`) || 'ผู้ตรวจสอบประจำวัน';
  });
  const [profitDaySigSub, setProfitDaySigSub] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_day_sub${bizSuffix}`) || businessName || 'คลินิก / แล็บวิเคราะห์';
  });

  const handleProfitDaySigTitleChange = (val: string) => {
    setProfitDaySigTitle(val);
    localStorage.setItem(`bklabplus_sig_profit_day_title${bizSuffix}`, val);
  };
  const handleProfitDaySigSubChange = (val: string) => {
    setProfitDaySigSub(val);
    localStorage.setItem(`bklabplus_sig_profit_day_sub${bizSuffix}`, val);
  };

  // ข้อความใต้ลายเซ็นสำหรับโหมดช่วงเวลา/รายเดือนสรุป (แยกตามธุรกิจ)
  const [profitRangeSigTitle, setProfitRangeSigTitle] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_range_title${bizSuffix}`) || 'ผู้ตรวจสอบรายเดือนสรุป';
  });
  const [profitRangeSigSub, setProfitRangeSigSub] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_range_sub${bizSuffix}`) || 'ฝ่ายบริหาร / บัญชีและการเงิน';
  });

  const handleProfitRangeSigTitleChange = (val: string) => {
    setProfitRangeSigTitle(val);
    localStorage.setItem(`bklabplus_sig_profit_range_title${bizSuffix}`, val);
  };
  const handleProfitRangeSigSubChange = (val: string) => {
    setProfitRangeSigSub(val);
    localStorage.setItem(`bklabplus_sig_profit_range_sub${bizSuffix}`, val);
  };

  // ข้อความใต้ลายเซ็นสำหรับผู้ตรวจสอบ / เจ้าของกิจการ (ช่องที่ 2)
  const [profitOwnerSigTitle, setProfitOwnerSigTitle] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_owner_title${bizSuffix}`) || 'ผู้ตรวจสอบ / เจ้าของกิจการ';
  });
  const [profitOwnerSigSub, setProfitOwnerSigSub] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_owner_sub${bizSuffix}`) || 'ผู้อำนวยการคลินิก';
  });

  const handleProfitOwnerSigTitleChange = (val: string) => {
    setProfitOwnerSigTitle(val);
    localStorage.setItem(`bklabplus_sig_profit_owner_title${bizSuffix}`, val);
  };
  const handleProfitOwnerSigSubChange = (val: string) => {
    setProfitOwnerSigSub(val);
    localStorage.setItem(`bklabplus_sig_profit_owner_sub${bizSuffix}`, val);
  };

  // ชื่อในวงเล็บและวันที่สำหรับผู้ลงนามช่องที่ 1
  const [profitSig1Name, setProfitSig1Name] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_name1${bizSuffix}`) || '';
  });
  const [profitSig1Date, setProfitSig1Date] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_date1${bizSuffix}`) || '';
  });

  const handleProfitSig1NameChange = (val: string) => {
    setProfitSig1Name(val);
    localStorage.setItem(`bklabplus_sig_profit_name1${bizSuffix}`, val);
  };
  const handleProfitSig1DateChange = (val: string) => {
    setProfitSig1Date(val);
    localStorage.setItem(`bklabplus_sig_profit_date1${bizSuffix}`, val);
  };

  // ชื่อในวงเล็บและวันที่สำหรับผู้ลงนามช่องที่ 2
  const [profitSig2Name, setProfitSig2Name] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_name2${bizSuffix}`) || '';
  });
  const [profitSig2Date, setProfitSig2Date] = useState<string>(() => {
    return localStorage.getItem(`bklabplus_sig_profit_date2${bizSuffix}`) || '';
  });

  const handleProfitSig2NameChange = (val: string) => {
    setProfitSig2Name(val);
    localStorage.setItem(`bklabplus_sig_profit_name2${bizSuffix}`, val);
  };
  const handleProfitSig2DateChange = (val: string) => {
    setProfitSig2Date(val);
    localStorage.setItem(`bklabplus_sig_profit_date2${bizSuffix}`, val);
  };

  // ซิงค์ลายเซ็นเมื่อเปลี่ยนธุรกิจ
  useEffect(() => {
    const sfx = activeBusinessId ? `_${activeBusinessId}` : '';
    setProfitDaySigTitle(localStorage.getItem(`bklabplus_sig_profit_day_title${sfx}`) || 'ผู้ตรวจสอบประจำวัน');
    setProfitDaySigSub(localStorage.getItem(`bklabplus_sig_profit_day_sub${sfx}`) || businessName || 'คลินิก / แล็บวิเคราะห์');
    setProfitRangeSigTitle(localStorage.getItem(`bklabplus_sig_profit_range_title${sfx}`) || 'ผู้ตรวจสอบรายเดือนสรุป');
    setProfitRangeSigSub(localStorage.getItem(`bklabplus_sig_profit_range_sub${sfx}`) || 'ฝ่ายบริหาร / บัญชีและการเงิน');
    setProfitOwnerSigTitle(localStorage.getItem(`bklabplus_sig_profit_owner_title${sfx}`) || 'ผู้ตรวจสอบ / เจ้าของกิจการ');
    setProfitOwnerSigSub(localStorage.getItem(`bklabplus_sig_profit_owner_sub${sfx}`) || 'ผู้อำนวยการคลินิก');
    setProfitSig1Name(localStorage.getItem(`bklabplus_sig_profit_name1${sfx}`) || '');
    setProfitSig1Date(localStorage.getItem(`bklabplus_sig_profit_date1${sfx}`) || '');
    setProfitSig2Name(localStorage.getItem(`bklabplus_sig_profit_name2${sfx}`) || '');
    setProfitSig2Date(localStorage.getItem(`bklabplus_sig_profit_date2${sfx}`) || '');
  }, [activeBusinessId, businessName]);

  // สถานะเปิด/ปิดแสดงผลส่วนลงนามในรายงาน
  const [showProfitSignature, setShowProfitSignature] = useState<boolean>(() => {
    const saved = localStorage.getItem(`bklabplus_profit_show_signature${bizSuffix}`);
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleProfitSignature = (val: boolean) => {
    setShowProfitSignature(val);
    localStorage.setItem(`bklabplus_profit_show_signature${bizSuffix}`, String(val));
  };

  // สถานะการนับเงินสด
  const [countedCash, setCountedCash] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [lastSavedPeriodInfo, setLastSavedPeriodInfo] = useState<PeriodCashCheckRecord | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ดึงฐานข้อมูลเรคคอร์ดทั้งหมดของธุรกิจปัจจุบัน
  const records = useMemo(() => {
    if (allBusinessRecords && Object.keys(allBusinessRecords).length > 0) {
      return allBusinessRecords;
    }
    return loadAllRecords(activeBusinessId);
  }, [allBusinessRecords, activeBusinessId]);

  // ซิงค์โหมดและวันที่ลง LocalStorage
  const handleViewModeChange = (mode: 'day' | 'range') => {
    setViewMode(mode);
    localStorage.setItem('bklabplus_profit_view_mode', mode);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setRangePreset('custom');
    localStorage.setItem('bklabplus_profit_start_date', val);
    localStorage.setItem('bklabplus_profit_range_preset', 'custom');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setRangePreset('custom');
    localStorage.setItem('bklabplus_profit_end_date', val);
    localStorage.setItem('bklabplus_profit_range_preset', 'custom');
  };

  // ทางลัดเลือกช่วงวันที่ (Quick Presets)
  const applyPreset = (preset: 'today' | 'this_month' | 'last_month' | '7days' | '30days') => {
    setRangePreset(preset);
    localStorage.setItem('bklabplus_profit_range_preset', preset);

    if (preset === 'today') {
      const today = getTodayDateString();
      setStartDate(today);
      setEndDate(today);
      localStorage.setItem('bklabplus_profit_start_date', today);
      localStorage.setItem('bklabplus_profit_end_date', today);
    } else if (preset === 'this_month') {
      const refDate = currentDate || getTodayDateString();
      const start = getFirstDayOfMonth(refDate);
      const end = getLastDayOfMonth(refDate);
      setStartDate(start);
      setEndDate(end);
      localStorage.setItem('bklabplus_profit_start_date', start);
      localStorage.setItem('bklabplus_profit_end_date', end);
    } else if (preset === 'last_month') {
      const refDate = currentDate || getTodayDateString();
      const { start, end } = getPreviousMonthRange(refDate);
      setStartDate(start);
      setEndDate(end);
      localStorage.setItem('bklabplus_profit_start_date', start);
      localStorage.setItem('bklabplus_profit_end_date', end);
    } else if (preset === '7days') {
      const { start, end } = getLastNDaysRange(7);
      setStartDate(start);
      setEndDate(end);
      localStorage.setItem('bklabplus_profit_start_date', start);
      localStorage.setItem('bklabplus_profit_end_date', end);
    } else if (preset === '30days') {
      const { start, end } = getLastNDaysRange(30);
      setStartDate(start);
      setEndDate(end);
      localStorage.setItem('bklabplus_profit_start_date', start);
      localStorage.setItem('bklabplus_profit_end_date', end);
    }
  };

  // --- คำนวณยอดเงินของโหมดรายวัน (Single Day) ---
  const dailyRecord = useMemo(() => {
    return record || records[currentDate] || {
      date: currentDate,
      incomeItems: [],
      expenseItems: [],
      outLabItems: [],
      hasOutLab: true,
      cashCheck: { countedCash: 0, note: '', isSaved: false },
    };
  }, [record, records, currentDate]);

  const dailyCashIncome = useMemo(() => {
    return (dailyRecord.incomeItems || [])
      .filter((item) => item.type === 'cash')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [dailyRecord]);

  const dailyTransferIncome = useMemo(() => {
    return (dailyRecord.incomeItems || [])
      .filter((item) => item.type === 'transfer')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [dailyRecord]);

  const dailyTotalIncome = dailyCashIncome + dailyTransferIncome;

  const dailyCashExpense = useMemo(() => {
    return (dailyRecord.expenseItems || [])
      .filter((item) => item.type !== 'transfer')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [dailyRecord]);

  const dailyTransferExpense = useMemo(() => {
    return (dailyRecord.expenseItems || [])
      .filter((item) => item.type === 'transfer')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [dailyRecord]);

  const dailyGeneralExpense = dailyCashExpense + dailyTransferExpense;

  const dailyOutLabExpense = useMemo(() => {
    if (dailyRecord.hasOutLab === false) return 0;
    return (dailyRecord.outLabItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [dailyRecord]);

  const dailyTotalExpense = dailyGeneralExpense + dailyOutLabExpense;
  const dailyNetProfit = dailyTotalIncome - dailyTotalExpense;
  // ยอดเงินสดในเกะตามระบบที่ควรจะมี = รับเงินสด - จ่ายเงินสด - Out-Lab (ไม่หักรายจ่ายเงินโอน)
  const dailyExpectedCash = dailyCashIncome - dailyCashExpense - dailyOutLabExpense;

  // --- คำนวณยอดเงินของโหมดช่วงวันที่ (Date Range / Month) ---
  const rangeData = useMemo(() => {
    const s = startDate <= endDate ? startDate : endDate;
    const e = startDate <= endDate ? endDate : startDate;

    const matchedDates = Object.keys(records)
      .filter((d) => d >= s && d <= e)
      .sort();

    let totalCashInc = 0;
    let totalTransferInc = 0;
    let totalCashExp = 0;
    let totalTransferExp = 0;
    let totalGenExp = 0;
    let totalOutLabExp = 0;
    let daysWithRecords = 0;

    const dailyBreakdown = matchedDates.map((dateStr) => {
      const rec = records[dateStr];
      if (!rec) {
        return {
          date: dateStr,
          cashIncome: 0,
          transferIncome: 0,
          totalIncome: 0,
          cashExpense: 0,
          transferExpense: 0,
          generalExpense: 0,
          outLabExpense: 0,
          totalExpense: 0,
          netProfit: 0,
          expectedCash: 0,
          countedCash: 0,
          isCounted: false,
          note: '',
        };
      }

      daysWithRecords += 1;
      const cInc = (rec.incomeItems || [])
        .filter((i) => i.type === 'cash')
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const tInc = (rec.incomeItems || [])
        .filter((i) => i.type === 'transfer')
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      const cExp = (rec.expenseItems || [])
        .filter((i) => i.type !== 'transfer')
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const tExp = (rec.expenseItems || [])
        .filter((i) => i.type === 'transfer')
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      const gExp = cExp + tExp;
      const oExp = rec.hasOutLab !== false
        ? (rec.outLabItems || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
        : 0;

      const totInc = cInc + tInc;
      const totExp = gExp + oExp;
      const profit = totInc - totExp;
      // เงินสดควรมีในเกะ = รับสด - จ่ายสด - OutLab
      const expCash = cInc - cExp - oExp;

      totalCashInc += cInc;
      totalTransferInc += tInc;
      totalCashExp += cExp;
      totalTransferExp += tExp;
      totalGenExp += gExp;
      totalOutLabExp += oExp;

      return {
        date: dateStr,
        cashIncome: cInc,
        transferIncome: tInc,
        totalIncome: totInc,
        cashExpense: cExp,
        transferExpense: tExp,
        generalExpense: gExp,
        outLabExpense: oExp,
        totalExpense: totExp,
        netProfit: profit,
        expectedCash: expCash,
        countedCash: rec.cashCheck?.countedCash || 0,
        isCounted: !!rec.cashCheck?.isSaved,
        note: rec.cashCheck?.note || '',
      };
    });

    const totalInc = totalCashInc + totalTransferInc;
    const totalExp = totalGenExp + totalOutLabExp;
    const netProf = totalInc - totalExp;
    // เงินสดสะสมควรมีในเกะ = รวมรับสด - รวมจ่ายสด - รวม Out-Lab
    const expCash = totalCashInc - totalCashExp - totalOutLabExp;

    return {
      startDate: s,
      endDate: e,
      matchedDates,
      daysWithRecords,
      totalCashIncome: totalCashInc,
      totalTransferIncome: totalTransferInc,
      totalCashExpense: totalCashExp,
      totalTransferExpense: totalTransferExp,
      totalIncome: totalInc,
      totalGeneralExpense: totalGenExp,
      totalOutLabExpense: totalOutLabExp,
      totalExpense: totalExp,
      netProfit: netProf,
      expectedCash: expCash,
      dailyBreakdown,
    };
  }, [records, startDate, endDate]);

  // ตัวเลขหลักที่จะนำมาแสดงผลขึ้นกับ viewMode
  const activeFinancials = useMemo(() => {
    if (viewMode === 'day') {
      return {
        title: `ประจำวัน (${currentDate})`,
        isRange: false,
        cashIncome: dailyCashIncome,
        transferIncome: dailyTransferIncome,
        totalIncome: dailyTotalIncome,
        cashExpense: dailyCashExpense,
        transferExpense: dailyTransferExpense,
        generalExpense: dailyGeneralExpense,
        outLabExpense: dailyOutLabExpense,
        totalExpense: dailyTotalExpense,
        netProfit: dailyNetProfit,
        expectedCash: dailyExpectedCash,
        daysCount: 1,
        activeDays: dailyRecord.incomeItems?.length || dailyRecord.expenseItems?.length ? 1 : 0,
      };
    }

    return {
      title: `ช่วงวันที่ ${rangeData.startDate} ถึง ${rangeData.endDate}`,
      isRange: true,
      cashIncome: rangeData.totalCashIncome,
      transferIncome: rangeData.totalTransferIncome,
      totalIncome: rangeData.totalIncome,
      cashExpense: rangeData.totalCashExpense,
      transferExpense: rangeData.totalTransferExpense,
      generalExpense: rangeData.totalGeneralExpense,
      outLabExpense: rangeData.totalOutLabExpense,
      totalExpense: rangeData.totalExpense,
      netProfit: rangeData.netProfit,
      expectedCash: rangeData.expectedCash,
      daysCount: rangeData.matchedDates.length,
      activeDays: rangeData.daysWithRecords,
    };
  }, [
    viewMode,
    currentDate,
    dailyCashIncome,
    dailyTransferIncome,
    dailyTotalIncome,
    dailyCashExpense,
    dailyTransferExpense,
    dailyGeneralExpense,
    dailyOutLabExpense,
    dailyTotalExpense,
    dailyNetProfit,
    dailyExpectedCash,
    dailyRecord,
    rangeData,
  ]);

  // โหลดและซิงค์ยอดเงินสดที่ตรวจนับตาม viewMode
  const prevRecordRef = useRef<string>('');

  useEffect(() => {
    if (viewMode === 'day') {
      const serialized = JSON.stringify({
        c: record?.cashCheck?.countedCash || 0,
        n: record?.cashCheck?.note || '',
        d: currentDate,
        b: activeBusinessId,
      });
      if (serialized !== prevRecordRef.current) {
        setCountedCash(record?.cashCheck?.countedCash || 0);
        setNote(record?.cashCheck?.note || '');
        setValidationError(null);
        prevRecordRef.current = serialized;
      }
    } else {
      // โหมดช่วงวันที่ / รายเดือน: ดึงประวัติการนับเงินสดประจำช่วง
      const savedPeriod = loadPeriodCashCheck(rangeData.startDate, rangeData.endDate, activeBusinessId);
      if (savedPeriod) {
        setCountedCash(savedPeriod.countedCash || 0);
        setNote(savedPeriod.note || '');
        setLastSavedPeriodInfo(savedPeriod);
      } else {
        // หากยังไม่เคยบันทึกช่วงนี้ ให้เตรียมค่าเริ่มต้น
        setCountedCash(0);
        setNote('');
        setLastSavedPeriodInfo(null);
      }
      setValidationError(null);
    }
  }, [viewMode, currentDate, record, rangeData.startDate, rangeData.endDate, activeBusinessId]);

  // คำนวณผลต่างการตรวจนับเงินสด
  const diff = countedCash - activeFinancials.expectedCash;
  const isCorrect = Math.abs(diff) < 0.01;

  // ตรวจสอบและบันทึกผลการตรวจสอบเงินสด
  const handleSave = () => {
    if (!isCorrect && note.trim() === '') {
      setValidationError('ยอดเงินจริงที่นับได้ไม่ตรงกับยอดทางบัญชี กรุณากรอก "หมายเหตุ" ชี้แจงก่อนบันทึกข้อมูล');
      return;
    }

    setValidationError(null);

    if (viewMode === 'day') {
      // บันทึกระดับรายวัน
      const updatedRecord: DailyRecord = {
        ...dailyRecord,
        cashCheck: {
          countedCash,
          note,
          isSaved: true,
        },
      };

      prevRecordRef.current = JSON.stringify({
        c: countedCash,
        n: note,
        d: currentDate,
      });

      onSaveRecord(updatedRecord);
    } else {
      // บันทึกระดับช่วงวันที่ / รายเดือน
      const periodRecord: PeriodCashCheckRecord = {
        startDate: rangeData.startDate,
        endDate: rangeData.endDate,
        businessId: activeBusinessId,
        countedCash,
        expectedCash: activeFinancials.expectedCash,
        diff,
        note,
        savedAt: new Date().toISOString(),
      };

      savePeriodCashCheck(periodRecord);
      setLastSavedPeriodInfo(periodRecord);

      // หากช่วงวันที่เป็นวันเดียวกัน (startDate === endDate) ซิงค์ไปยัง DailyRecord ด้วย
      if (rangeData.startDate === rangeData.endDate && rangeData.startDate === currentDate) {
        const updatedRecord: DailyRecord = {
          ...dailyRecord,
          cashCheck: {
            countedCash,
            note,
            isSaved: true,
          },
        };
        onSaveRecord(updatedRecord);
      }
    }

    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2800);
  };

  // คีย์ลัด F8 เพื่อบันทึก
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

  // สลับไปดูรายวันของวันที่ต้องการในตารางแจกแจง
  const handleJumpToDay = (targetDate: string) => {
    onDateChange(targetDate);
    setViewMode('day');
    localStorage.setItem('bklabplus_profit_view_mode', 'day');
  };

  return (
    <div className="space-y-6" id="profit-module-container">
      {/* ส่วนควบคุม วันที่และโหมดการประมวลผล (Header Controls) */}
      <div className="bg-white p-4 md:p-5 rounded-2xl shadow-xs border border-gray-150 space-y-4 print:hidden">
        {/* แถบด้านบน: เลือกโหมด รายวัน vs ช่วงวันที่/รายเดือน */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">โหมดการตรวจประมวลผล:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                id="btn-profit-mode-day"
                onClick={() => handleViewModeChange('day')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-white text-emerald-700 shadow-2xs font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Calendar size={14} />
                <span>รายวัน (1 วัน)</span>
              </button>
              <button
                type="button"
                id="btn-profit-mode-range"
                onClick={() => handleViewModeChange('range')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'range'
                    ? 'bg-white text-emerald-700 shadow-2xs font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <CalendarRange size={14} />
                <span>ช่วงวันที่ / รายเดือน</span>
              </button>
            </div>
          </div>

          {/* ปุ่มบันทึก & คีย์ลัด F8 & ปุ่มพิมพ์ */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs"
              title="พิมพ์ใบสรุปกำไรและนับเงินสด"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">พิมพ์รายงาน (PDF)</span>
            </button>
            <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100">
              <span className="text-amber-800 font-bold">F8:</span>
              <span className="text-amber-800">บันทึก</span>
            </span>
            <button
              onClick={handleSave}
              id="btn-save-profit"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Save size={15} />
              <span>บันทึกผลการตรวจสอบ</span>
            </button>
          </div>
        </div>

        {/* แถบด้านล่าง: ตัวเลือกวันที่ตามโหมด */}
        {viewMode === 'day' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-bold block">เลือกวันที่ตรวจสอบรายวัน</span>
                <input
                  type="date"
                  id="profit-date-picker"
                  value={currentDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="text-sm font-black text-gray-800 outline-none border border-gray-250 focus:border-emerald-500 rounded-lg px-2.5 py-1 bg-gray-50/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-bold mr-1">ปุ่มด่วน:</span>
              <button
                type="button"
                onClick={() => onDateChange(getTodayDateString())}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-all cursor-pointer"
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  onDateChange(`${y}-${m}-${day}`);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                เมื่อวาน
              </button>
            </div>

            {/* แถบเปิด/ปิดแสดงผลส่วนลงนามในรายงาน (โหมดรายวัน) */}
            <div className="w-full pt-2.5 border-t border-gray-150 flex items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showProfitSignature}
                  onChange={(e) => handleToggleProfitSignature(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 w-4 h-4"
                />
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-600" />
                  <span>แสดงส่วนลงนาม & หมายเหตุในรายงาน</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                  showProfitSignature ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  {showProfitSignature ? 'เปิดแสดง' : 'ซ่อน'}
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* ปุ่มพรีเซ็ตช่วงยอดนิยม */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                <Sparkles size={14} className="text-amber-500" />
                <span>พรีเซ็ตด่วน:</span>
              </span>
              <button
                type="button"
                onClick={() => applyPreset('this_month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  rangePreset === 'this_month'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                📅 เดือนนี้ (ทั้งเดือน)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last_month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  rangePreset === 'last_month'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ⏪ เดือนที่แล้ว
              </button>
              <button
                type="button"
                onClick={() => applyPreset('7days')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  rangePreset === '7days'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ⚡ 7 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => applyPreset('30days')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  rangePreset === '30days'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📊 30 วันล่าสุด
              </button>
            </div>

            {/* ช่องเลือกวันเริ่มต้น และ วันสิ้นสุด */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">ตั้งแต่วันที่:</span>
                <input
                  type="date"
                  id="profit-start-date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="text-xs font-bold text-gray-800 outline-none border border-gray-250 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 bg-gray-50/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">ถึงวันที่:</span>
                <input
                  type="date"
                  id="profit-end-date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="text-xs font-bold text-gray-800 outline-none border border-gray-250 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 bg-gray-50/50"
                />
              </div>

              <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                <CalendarDays size={14} className="text-emerald-600" />
                <span>
                  ช่วงเวลา {rangeData.startDate} ถึง {rangeData.endDate} (มีบันทึกข้อมูล {rangeData.daysWithRecords} วัน)
                </span>
              </div>
            </div>

            {/* แถบเปิด/ปิดแสดงผลตารางและส่วนลงนามในรายงาน */}
            <div className="pt-2.5 border-t border-gray-150 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showDailyBreakdownTable}
                    onChange={(e) => handleToggleBreakdownTable(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 w-4 h-4"
                  />
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers size={14} className="text-emerald-600" />
                    <span>แสดงตารางแจกแจงรายวันในรายงาน</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                    showDailyBreakdownTable ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {showDailyBreakdownTable ? 'เปิดแสดง' : 'ซ่อน'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showProfitSignature}
                    onChange={(e) => handleToggleProfitSignature(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 w-4 h-4"
                  />
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-600" />
                    <span>แสดงส่วนลงนาม & หมายเหตุ</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                    showProfitSignature ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {showProfitSignature ? 'เปิดแสดง' : 'ซ่อน'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ใบรายงานตัวจริง: ใช้ร่วมกันทั้งแสดงผลบนจอ และสั่ง Print / Export PDF */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-150 shadow-xs space-y-6 print:border-0 print:shadow-none print:p-0 print:m-0" id="profit-print-area">
        {/* หัวเอกสารรายงานแบรนด์ (พิมพ์ออกกระดาษ) */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-100">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {businessLogoUrl ? (
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                <img src={businessLogoUrl} alt={businessName} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold">
                <Building2 size={24} />
              </div>
            )}
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  {businessName}
                </h2>
                {businessCode && (
                  <span className="px-2 py-0.5 text-xs font-mono font-black bg-emerald-100 text-emerald-800 rounded uppercase">
                    {businessCode}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                ใบประเมินกำไรและตรวจนับเงินสด (Profit Evaluation & Cash Verification)
              </p>
              <p className="text-[11px] text-gray-400">
                โหมดการตรวจสอบ: {viewMode === 'day' ? 'สรุปรายวันเดี่ยว' : 'สรุปช่วงเวลาสะสม / รายเดือน'}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-200 self-start sm:self-auto min-w-[180px]">
            <span className="text-[10px] font-bold text-gray-400 block uppercase">ช่วงเวลาประเมินผล</span>
            <span className="text-xs md:text-sm font-black text-slate-800 block mt-0.5 font-mono">
              {viewMode === 'day' ? currentDate : `${rangeData.startDate} ~ ${rangeData.endDate}`}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
              {viewMode === 'day' ? '1 วัน' : `บันทึกข้อมูล ${rangeData.daysWithRecords} วัน`}
            </span>
          </div>
        </div>

        {/* ตารางแสดงตัวเลขหลัก 2 ฝั่ง (ฝั่งซ้าย: กระดานการเงิน / ฝั่งขวา: ตรวจสอบเงินสด) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ซีกซ้าย (7 คอลัมน์): บอร์ดการเงิน และรายได้สุทธิ */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-50/50 p-5 md:p-6 rounded-2xl border border-gray-200/80 space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm md:text-base font-extrabold text-gray-800">
                  การคำนวณรายได้สุทธิ และสถานะบัญชี
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {activeFinancials.title}
                </span>
              </div>

              {/* การวิเคราะห์แผ่นกระดาษ: รายรับ vs รายจ่าย */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* กล่องรายรับ */}
                <div className="p-4 bg-white rounded-xl border border-gray-200/90 shadow-2xs flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs text-gray-400 font-bold block mb-1">
                      รายรับทั้งหมด (เงินสด + โอน)
                    </span>
                    <span className="text-2xl font-black text-slate-800">
                      ฿ {formatNumber(activeFinancials.totalIncome)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="text-emerald-700 font-semibold">เงินสด:</span>
                      <span className="font-bold font-mono">฿ {formatNumber(activeFinancials.cashIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-semibold">เงินโอน:</span>
                      <span className="font-bold font-mono">฿ {formatNumber(activeFinancials.transferIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* กล่องรายจ่าย */}
                <div className="p-4 bg-white rounded-xl border border-gray-200/90 shadow-2xs flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs text-gray-400 font-bold block mb-1">
                      รายจ่ายรวมทั้งหมด (ทั่วไป + Out-Lab)
                    </span>
                    <span className="text-2xl font-black text-rose-600">
                      ฿ {formatNumber(activeFinancials.totalExpense)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>จ่ายเงินสด (หักจากเกะ):</span>
                      </span>
                      <span className="font-bold font-mono text-emerald-800">฿ {formatNumber(activeFinancials.cashExpense)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span>จ่ายเงินโอน (ตัดบัญชี):</span>
                      </span>
                      <span className="font-bold font-mono text-blue-800">฿ {formatNumber(activeFinancials.transferExpense)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>Out-Lab (แล็บนอก):</span>
                      </span>
                      <span className="font-bold font-mono text-rose-800">฿ {formatNumber(activeFinancials.outLabExpense)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* การ์ดรายได้สุทธิ (Net Profit) */}
              <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-900 tracking-wide uppercase block">
                      {viewMode === 'day' ? 'รายได้สุทธิประจำวัน' : 'รายได้สุทธิสะสมประจำช่วง / เดือน'}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                      สูตร: รายรับรวม (สด+โอน) - รายจ่ายรวม (ทั่วไป+OutLab)
                    </span>
                    {viewMode === 'range' && activeFinancials.activeDays > 0 && (
                      <span className="text-[10px] text-emerald-800 font-bold block mt-1">
                        เฉลี่ยวันละ ฿ {formatNumber(activeFinancials.netProfit / activeFinancials.activeDays)} (จาก {activeFinancials.activeDays} วันที่มีข้อมูล)
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right self-end sm:self-auto">
                  <span className={`text-2xl md:text-3xl font-black ${activeFinancials.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ฿ {formatNumber(activeFinancials.netProfit)}
                  </span>
                </div>
              </div>

              {/* แจ้งเตือนยอดกันเงิน Out-Lab */}
              {activeFinancials.outLabExpense > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3" id="outlab-reserve-alert">
                  <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={20} />
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-rose-900 uppercase">
                      ยอดเงินที่ต้องกันสำรองจ่าย Out-Lab!
                    </h5>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      กรุณากันเงินสำรองจ่าย Out-Lab ออกจากจำนวนเงินสด เป็นจำนวน{' '}
                      <span className="font-black text-rose-900 underline font-mono text-sm">
                        ฿ {formatNumber(activeFinancials.outLabExpense)}
                      </span>{' '}
                      เพื่อเตรียมเคลียร์ยอดส่งแล็บพาร์ทเนอร์
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ซีกขวา (5 คอลัมน์): ตรวจสอบเงินสดหน้างาน (Cash Verification Pane) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-xs border border-gray-200/90 flex flex-col justify-between h-full space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <span className="text-sm md:text-base font-extrabold text-gray-800">
                    ตรวจสอบเงินสดหน้างาน
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {viewMode === 'day' ? 'นับเงินสดรายวัน' : 'นับเงินสดประจำช่วง/เดือน'}
                  </span>
                </div>

                {/* กล่องแสดงยอดเงินสดตามระบบที่ควรจะมี */}
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                    ยอดเงินสดตามระบบที่ควรจะมี (Expected Cash)
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">
                      ฿ {formatNumber(activeFinancials.expectedCash)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      (เงินสดในเกะที่ควรมีจริง)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 pt-1.5 border-t border-slate-800 leading-relaxed font-mono space-y-1">
                    <div>
                      คำนวณจาก: รับเงินสด (฿{formatNumber(activeFinancials.cashIncome)}) - จ่ายเงินสด (฿{formatNumber(activeFinancials.cashExpense)}){activeFinancials.outLabExpense > 0 ? ` - Out-Lab (฿${formatNumber(activeFinancials.outLabExpense)})` : ''}
                    </div>
                    {activeFinancials.transferExpense > 0 && (
                      <div className="text-[10px] text-blue-300 font-sans font-semibold">
                        💡 มีรายจ่ายเงินโอน ฿{formatNumber(activeFinancials.transferExpense)} (ตัดจากบัญชีธนาคาร ไม่ได้หักจากเกะเงินสด)
                      </div>
                    )}
                  </div>
                </div>

                {/* กล่องกรอกเงินสดที่ตรวจนับได้จริง */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block flex items-center justify-between">
                    <span>เงินสดที่นับได้จริง (Counted Cash):</span>
                    {viewMode === 'range' && (
                      <span className="text-[10px] text-blue-600 font-semibold">ยอดตรวจนับ ณ สิ้นงวด/สิ้นเดือน</span>
                    )}
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3.5 top-3 text-slate-400" size={18} />
                    <input
                      type="number"
                      value={countedCash || ''}
                      id="counted-cash-input"
                      onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                      placeholder="ใส่จำนวนเงินสดที่ตรวจนับจริง"
                      className="w-full text-lg font-black pl-10 pr-8 py-2.5 border-2 border-gray-200 outline-none rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white transition-all font-mono"
                    />
                    <span className="absolute right-3.5 top-3 text-sm font-bold text-gray-400">฿</span>
                  </div>
                </div>

                {/* ผลการเปรียบเทียบ (Verification Status) */}
                <div className="pt-1">
                  {isCorrect ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 font-bold text-xs" id="status-cash-correct">
                      <CheckCircle className="text-emerald-600 shrink-0" size={18} />
                      <div>
                        <span>ยอดเงินสดถูกต้อง 100% (ตรงกับระบบ)</span>
                        <p className="text-[10px] text-emerald-600 font-medium">เงินในเกะตรงกับยอดทางบัญชีพอดี</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-1 text-rose-800 text-xs" id="status-cash-incorrect">
                      <div className="flex items-center gap-2 font-black text-rose-900">
                        <AlertTriangle className="text-rose-600 shrink-0" size={18} />
                        {diff < 0 ? (
                          <span>เงินสดขาด ฿{formatNumber(Math.abs(diff))}</span>
                        ) : (
                          <span>เงินสดเกิน ฿{formatNumber(diff)}</span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        ยอดเงินสดจริงไม่ตรงกับระบบ กรุณากรอก "หมายเหตุ" กำกับเรื่องขาดหรือเกินด้านล่าง
                      </p>
                    </div>
                  )}
                </div>

                {/* ช่องกรอกหมายเหตุ */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block flex items-center justify-between">
                    <span>หมายเหตุการตรวจนับ (Note):</span>
                    {!isCorrect && (
                      <span className="text-[10px] text-rose-600 font-black">* จำเป็นต้องระบุเหตุผล</span>
                    )}
                  </label>
                  <textarea
                    value={note}
                    id="cash-note-textarea"
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="เช่น เงินทอนผิด, จ่ายค่าส่งพัสดุด่วนยังไม่ได้คีย์, ลูกค้าให้ทิปเกิน ฯลฯ"
                    rows={2}
                    className="w-full p-2.5 border border-gray-200 outline-none rounded-xl text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 bg-gray-50/50"
                  />
                </div>

                {/* ข้อผิดพลาด Validation */}
                {validationError && (
                  <div className="p-3 bg-rose-100 border-l-4 border-rose-500 rounded text-rose-800 text-xs font-bold leading-relaxed">
                    {validationError}
                  </div>
                )}

                {/* ข้อมูลประวัติการบันทึกช่วงเวลานี้ล่าสุด */}
                {viewMode === 'range' && lastSavedPeriodInfo && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock size={12} className="text-slate-400" />
                      <span>บันทึกล่าสุด: {new Date(lastSavedPeriodInfo.savedAt).toLocaleDateString('th-TH')}</span>
                    </span>
                    <span className="font-bold text-emerald-700">
                      นับได้: ฿{formatNumber(lastSavedPeriodInfo.countedCash)}
                    </span>
                  </div>
                )}
              </div>

              {/* ปุ่มบันทึกการตรวจนับ */}
              <div className="pt-3 border-t border-gray-150 print:hidden">
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Save size={15} />
                  <span>
                    {viewMode === 'day' ? 'ยืนยันและบันทึกตรวจนับรายวัน' : 'ยืนยันและบันทึกตรวจนับประจำช่วง/เดือน'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* กรณีดูเป็นช่วงวันที่ (Date Range / Month): ตารางแจกแจงรายวัน (Daily Breakdown Table) */}
        {viewMode === 'range' && showDailyBreakdownTable && (
          <div className="mt-8 pt-6 border-t-2 border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="text-emerald-600" size={18} />
                  <span>ตารางแจกแจงรายวันในช่วงเวลา ({rangeData.startDate} ถึง {rangeData.endDate})</span>
                </h3>
                <p className="text-xs text-gray-500">
                  แสดงรายละเอียดรายรับ-รายจ่าย กำไรสุทธิ และยอดเงินสดของแต่ละวันภายในช่วงที่เลือก
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                  รวม {rangeData.matchedDates.length} วัน (มีรายการ {rangeData.daysWithRecords} วัน)
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 px-2.5 py-1 rounded-xl cursor-pointer print:hidden select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={showDailyBreakdownTable}
                    onChange={(e) => handleToggleBreakdownTable(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <span className="font-semibold text-[11px]">แสดงในรายงาน</span>
                </label>
              </div>
            </div>

            {rangeData.dailyBreakdown.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                ยังไม่มีข้อมูลบันทึกในระบบสำหรับช่วงวันที่นี้
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white uppercase text-[10px] tracking-wider">
                      <th className="p-3 font-bold">วันที่</th>
                      <th className="p-3 font-bold text-right">รับสด (฿)</th>
                      <th className="p-3 font-bold text-right">รับโอน (฿)</th>
                      <th className="p-3 font-bold text-right">รายรับรวม (฿)</th>
                      <th className="p-3 font-bold text-right text-emerald-300">จ่ายสด (฿)</th>
                      <th className="p-3 font-bold text-right text-blue-300">จ่ายโอน (฿)</th>
                      <th className="p-3 font-bold text-right">Out-Lab (฿)</th>
                      <th className="p-3 font-bold text-right">จ่ายรวม (฿)</th>
                      <th className="p-3 font-bold text-right">กำไรสุทธิ (฿)</th>
                      <th className="p-3 font-bold text-right text-emerald-300">เงินสดควรมีในเกะ (฿)</th>
                      <th className="p-3 font-bold text-center">ตรวจนับรายวัน</th>
                      <th className="p-3 font-bold text-center print:hidden">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 bg-white">
                    {rangeData.dailyBreakdown.map((item, idx) => (
                      <tr
                        key={item.date}
                        className={`hover:bg-emerald-50/40 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="p-3 font-mono text-right text-emerald-800 font-semibold">
                          {formatNumber(item.cashIncome)}
                        </td>
                        <td className="p-3 font-mono text-right text-blue-800 font-semibold">
                          {formatNumber(item.transferIncome)}
                        </td>
                        <td className="p-3 font-mono text-right font-black text-slate-900 bg-slate-50/80">
                          {formatNumber(item.totalIncome)}
                        </td>
                        <td className="p-3 font-mono text-right text-emerald-700 font-bold">
                          {formatNumber(item.cashExpense)}
                        </td>
                        <td className="p-3 font-mono text-right text-blue-700 font-bold">
                          {formatNumber(item.transferExpense)}
                        </td>
                        <td className="p-3 font-mono text-right text-rose-700 font-semibold">
                          {formatNumber(item.outLabExpense)}
                        </td>
                        <td className="p-3 font-mono text-right font-black text-rose-600 bg-slate-50/80">
                          {formatNumber(item.totalExpense)}
                        </td>
                        <td className={`p-3 font-mono text-right font-black ${
                          item.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {formatNumber(item.netProfit)}
                        </td>
                        <td className="p-3 font-mono text-right font-black text-emerald-800 bg-emerald-50/40">
                          {formatNumber(item.expectedCash)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {item.isCounted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              <CheckCircle size={11} />
                              <span>ตรวจแล้ว (฿{formatNumber(item.countedCash)})</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-semibold">
                              ยังไม่ได้บันทึก
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => handleJumpToDay(item.date)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>ตรวจรายวันนี้</span>
                            <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* แถวสรุปรวมทั้งหมด */}
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black text-xs">
                      <td className="p-3 uppercase">รวมทั้งสิ้น</td>
                      <td className="p-3 font-mono text-right text-emerald-400">
                        {formatNumber(rangeData.totalCashIncome)}
                      </td>
                      <td className="p-3 font-mono text-right text-blue-400">
                        {formatNumber(rangeData.totalTransferIncome)}
                      </td>
                      <td className="p-3 font-mono text-right text-white">
                        {formatNumber(rangeData.totalIncome)}
                      </td>
                      <td className="p-3 font-mono text-right text-emerald-300">
                        {formatNumber(rangeData.totalCashExpense)}
                      </td>
                      <td className="p-3 font-mono text-right text-blue-300">
                        {formatNumber(rangeData.totalTransferExpense)}
                      </td>
                      <td className="p-3 font-mono text-right text-rose-400">
                        {formatNumber(rangeData.totalOutLabExpense)}
                      </td>
                      <td className="p-3 font-mono text-right text-rose-400">
                        {formatNumber(rangeData.totalExpense)}
                      </td>
                      <td className="p-3 font-mono text-right text-emerald-400">
                        {formatNumber(rangeData.netProfit)}
                      </td>
                      <td className="p-3 font-mono text-right text-emerald-400">
                        {formatNumber(rangeData.expectedCash)}
                      </td>
                      <td className="p-3 text-center text-slate-400 text-[10px]">
                        ยอดรวมทั้งช่วง
                      </td>
                      <td className="p-3 text-center print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ส่วนลงชื่อตรวจสอบและหมายเหตุ (สำหรับแสดงผลบนจอ และสั่ง Print / Export PDF) */}
        {showProfitSignature && (
          <div className="grid grid-cols-2 print:grid-cols-2 gap-6 print:gap-4 pt-6 mt-6 border-t border-slate-200 text-xs break-inside-avoid print:break-inside-avoid">
            {/* ฝั่งซ้าย: ผู้ตรวจนับเงินสด / ผู้ตรวจสอบประจำวัน / รายเดือนสรุป */}
            <div className="flex flex-col items-center justify-end text-center">
              <div className="w-64 max-w-full space-y-2">
                <div className="border-b border-dashed border-gray-400 h-9 w-full"></div>
                {/* ช่องพิมพ์ชื่อ-นามสกุลในวงเล็บ */}
                <div className="flex items-center justify-center gap-0.5 text-slate-700 text-xs font-mono w-full px-1">
                  <span className="font-bold select-none text-slate-500">(</span>
                  <input
                    type="text"
                    value={profitSig1Name}
                    onChange={(e) => handleProfitSig1NameChange(e.target.value)}
                    placeholder=".........................................."
                    className="flex-1 max-w-[200px] text-center bg-transparent hover:bg-slate-100/80 focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none text-xs font-semibold text-slate-800 placeholder:text-slate-300 transition-all print:border-0 print:bg-transparent print:p-0"
                    title="พิมพ์ชื่อ-นามสกุลในวงเล็บ หรือเว้นว่างไว้เพื่อรอเซ็นชื่อ"
                  />
                  <span className="font-bold select-none text-slate-500">)</span>
                </div>
                <div className="space-y-1 group">
                  {viewMode === 'day' ? (
                    <>
                      <input
                        type="text"
                        value={profitDaySigTitle}
                        onChange={(e) => handleProfitDaySigTitleChange(e.target.value)}
                        placeholder="พิมพ์ตำแหน่งใต้ลายเซ็น เช่น ผู้ตรวจสอบประจำวัน..."
                        className="w-full text-center font-bold text-slate-800 text-xs bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md py-1 px-1.5 outline-none transition-all print:border-0 print:bg-transparent print:p-0"
                        title="คลิกเพื่อแก้ไขข้อความใต้ลายเซ็น (จำค่าเริ่มต้นไว้ให้อัตโนมัติ)"
                      />
                      <input
                        type="text"
                        value={profitDaySigSub}
                        onChange={(e) => handleProfitDaySigSubChange(e.target.value)}
                        placeholder="พิมพ์สังกัด/หน่วยงาน..."
                        className="w-full text-center text-[11px] text-slate-500 bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md py-0.5 px-1.5 outline-none transition-all print:border-0 print:bg-transparent print:p-0"
                        title="คลิกเพื่อแก้ไขสังกัด/หน่วยงาน (จำค่าเริ่มต้นไว้ให้อัตโนมัติ)"
                      />
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={profitRangeSigTitle}
                        onChange={(e) => handleProfitRangeSigTitleChange(e.target.value)}
                        placeholder="พิมพ์ตำแหน่งใต้ลายเซ็น เช่น ผู้ตรวจสอบรายเดือนสรุป..."
                        className="w-full text-center font-bold text-slate-800 text-xs bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md py-1 px-1.5 outline-none transition-all print:border-0 print:bg-transparent print:p-0"
                        title="คลิกเพื่อแก้ไขข้อความใต้ลายเซ็น (จำค่าเริ่มต้นไว้ให้อัตโนมัติ)"
                      />
                      <input
                        type="text"
                        value={profitRangeSigSub}
                        onChange={(e) => handleProfitRangeSigSubChange(e.target.value)}
                        placeholder="พิมพ์สังกัด/หน่วยงาน..."
                        className="w-full text-center text-[11px] text-slate-500 bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md py-0.5 px-1.5 outline-none transition-all print:border-0 print:bg-transparent print:p-0"
                        title="คลิกเพื่อแก้ไขสังกัด/หน่วยงาน (จำค่าเริ่มต้นไว้ให้อัตโนมัติ)"
                      />
                    </>
                  )}
                  <p className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                    ✏️ คลิกพิมพ์เปลี่ยนข้อความได้ (จำค่าเริ่มต้นอัตโนมัติ)
                  </p>
                </div>
                {/* วันที่ใต้ชื่อ สามารถพิมพ์ตัวเลขเองได้ หรือกดปุ่ม 'วันนี้' */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                  <span className="font-medium text-slate-600">วันที่:</span>
                  <input
                    type="text"
                    value={profitSig1Date}
                    onChange={(e) => handleProfitSig1DateChange(e.target.value)}
                    placeholder="....... / ....... / ............"
                    className="w-24 text-center bg-transparent hover:bg-slate-100/80 focus:bg-white border-b border-dashed border-gray-300 hover:border-slate-400 focus:border-emerald-500 outline-none text-[11px] text-slate-700 transition-all print:border-0 print:bg-transparent print:p-0"
                    title="พิมพ์วันที่หรือตัวเลขกำกับ (หรือกดปุ่ม 'วันนี้')"
                  />
                  <button
                    type="button"
                    onClick={() => handleProfitSig1DateChange(getTodayThaiFormatted())}
                    className="px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-all cursor-pointer shadow-2xs print:hidden active:scale-95"
                    title="กดเพื่อใส่วันที่ปัจจุบันทันที"
                  >
                    📅 วันนี้
                  </button>
                  {profitSig1Date && (
                    <button
                      type="button"
                      onClick={() => handleProfitSig1DateChange('')}
                      className="text-[10px] text-slate-400 hover:text-rose-600 px-1 py-0.5 print:hidden cursor-pointer"
                      title="ล้างวันที่เพื่อเว้นว่างไว้เขียนมือ"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ฝั่งขวา: ผู้ตรวจสอบ / เจ้าของกิจการ */}
            <div className="flex flex-col items-center justify-end text-center">
              <div className="w-64 max-w-full space-y-2">
                <div className="border-b border-dashed border-gray-400 h-9 w-full"></div>
                {/* ช่องพิมพ์ชื่อ-นามสกุลในวงเล็บ */}
                <div className="flex items-center justify-center gap-0.5 text-slate-700 text-xs font-mono w-full px-1">
                  <span className="font-bold select-none text-slate-500">(</span>
                  <input
                    type="text"
                    value={profitSig2Name}
                    onChange={(e) => handleProfitSig2NameChange(e.target.value)}
                    placeholder=".........................................."
                    className="flex-1 max-w-[200px] text-center bg-transparent hover:bg-slate-100/80 focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none text-xs font-semibold text-slate-800 placeholder:text-slate-300 transition-all print:border-0 print:bg-transparent print:p-0"
                    title="พิมพ์ชื่อ-นามสกุลในวงเล็บ หรือเว้นว่างไว้เพื่อรอเซ็นชื่อ"
                  />
                  <span className="font-bold select-none text-slate-500">)</span>
                </div>
                <div className="space-y-1 group">
                  <input
                    type="text"
                    value={profitOwnerSigTitle}
                    onChange={(e) => handleProfitOwnerSigTitleChange(e.target.value)}
                    placeholder="พิมพ์ตำแหน่ง เช่น ผู้ตรวจสอบ / เจ้าของกิจการ..."
                    className="w-full text-center font-bold text-slate-800 text-xs bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md py-1 px-1.5 outline-none transition-all print:border-0 print:bg-transparent print:p-0"
                    title="คลิกเพื่อแก้ไขข้อความใต้ลายเซ็น (จำค่าเริ่มต้นไว้ให้อัตโนมัติ)"
                  />
                  <input
                    type="text"
                    value={profitOwnerSigSub}
                    onChange={(e) => handleProfitOwnerSigSubChange(e.target.value)}
                    placeholder="พิมพ์สังกัด/หน่วยงาน..."
                    className="w-full text-center text-[11px] text-slate-500 bg-transparent hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded-md py-0.5 px-1.5 outline-none transition-all print:border-0 print:bg-transparent print:p-0"
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
                    value={profitSig2Date}
                    onChange={(e) => handleProfitSig2DateChange(e.target.value)}
                    placeholder="....... / ....... / ............"
                    className="w-24 text-center bg-transparent hover:bg-slate-100/80 focus:bg-white border-b border-dashed border-gray-300 hover:border-slate-400 focus:border-emerald-500 outline-none text-[11px] text-slate-700 transition-all print:border-0 print:bg-transparent print:p-0"
                    title="พิมพ์วันที่หรือตัวเลขกำกับ (หรือกดปุ่ม 'วันนี้')"
                  />
                  <button
                    type="button"
                    onClick={() => handleProfitSig2DateChange(getTodayThaiFormatted())}
                    className="px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-all cursor-pointer shadow-2xs print:hidden active:scale-95"
                    title="กดเพื่อใส่วันที่ปัจจุบันทันที"
                  >
                    📅 วันนี้
                  </button>
                  {profitSig2Date && (
                    <button
                      type="button"
                      onClick={() => handleProfitSig2DateChange('')}
                      className="text-[10px] text-slate-400 hover:text-rose-600 px-1 py-0.5 print:hidden cursor-pointer"
                      title="ล้างวันที่เพื่อเว้นว่างไว้เขียนมือ"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* กล่องข้อความ Toast แจ้งเตือนเมื่อบันทึกสำเร็จ */}
      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <CheckCircle className="text-emerald-400" size={22} />
            <div>
              <p className="text-xs font-black">
                {viewMode === 'day' ? 'ตรวจสอบเงินสดประจำวันเรียบร้อย' : 'ตรวจสอบเงินสดประจำช่วงเวลา/เดือนเรียบร้อย'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                เก็บบันทึกข้อมูลการนับ ผลต่าง และหมายเหตุลงในระบบเรียบร้อยแล้ว
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
