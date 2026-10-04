/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { DailyRecord, Business } from '../types';
import { formatNumber } from '../constants';
import { loadBusinesses, loadAllRecords, loadAllRecordsByBusiness } from '../utils/storage';
import { subscribeToRecords, subscribeToBusinesses } from '../utils/firebase';
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
  Building2,
  CheckSquare,
  Square,
  Wallet,
  Receipt,
  FlaskConical,
  Eye,
  EyeOff,
  Layers,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Edit3,
  Clock,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface SummaryReportProps {
  currentDate: string;
  activeBusinessId?: string;
  businesses?: Business[];
}

interface DetailedIncomeItem {
  id: string;
  date: string;
  description: string;
  type: 'cash' | 'transfer';
  amount: number;
}

interface DetailedExpenseItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type?: 'cash' | 'transfer';
}

interface DetailedOutLabItem {
  id: string;
  date: string;
  labNumber: string;
  testName: string;
  amount: number;
}

interface GroupedOutLab {
  testName: string;
  unitPrice: number;
  count: number;
  totalAmount: number;
}

interface GroupedIncome {
  description: string;
  count: number;
  totalAmount: number;
  cashAmount: number;
  transferAmount: number;
}

interface GroupedExpense {
  description: string;
  count: number;
  totalAmount: number;
  cashAmount?: number;
  transferAmount?: number;
}

export default function SummaryReportModule({
  currentDate,
  activeBusinessId,
  businesses: propBusinesses,
}: SummaryReportProps) {
  const THAI_MONTH_NAMES = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // วันที่เริ่มต้น-สิ้นสุด สำหรับภาพรวม โดยจดจำค่าที่เคยเลือกไว้ ไม่กลับไปค้าง 7 วันก่อน
  const [startDate, setStartDate] = useState<string>(() => {
    const saved = localStorage.getItem('bklabplus_summary_start_date');
    if (saved) return saved;
    // ค่าเริ่มต้นเป็นวันที่ 1 ของเดือนปัจจุบัน
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const saved = localStorage.getItem('bklabplus_summary_end_date');
    if (saved) return saved;
    // ค่าเริ่มต้นเป็นวันสิ้นเดือนของเดือนปัจจุบัน (หรือวันนี้)
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val) localStorage.setItem('bklabplus_summary_start_date', val);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (val) localStorage.setItem('bklabplus_summary_end_date', val);
  };

  // หัวข้อเอกสาร / ประจำเดือน กำหนดเองได้
  const [customReportTitle, setCustomReportTitle] = useState<string>(() => {
    const saved = localStorage.getItem('bklabplus_summary_custom_title');
    if (saved !== null) return saved;
    return 'ประจำเดือน กันยายน 2569';
  });

  const handleCustomTitleChange = (val: string) => {
    setCustomReportTitle(val);
    localStorage.setItem('bklabplus_summary_custom_title', val);
  };

  // แนะนำชื่อเดือนตาม startDate อัตโนมัติ
  const suggestedMonthTitle = useMemo(() => {
    if (!startDate) return '';
    const parts = startDate.split('-');
    if (parts.length >= 2) {
      const mIdx = parseInt(parts[1], 10) - 1;
      const beYear = parseInt(parts[0], 10) + 543;
      const thMonth = THAI_MONTH_NAMES[mIdx] || '';
      return `ประจำเดือน ${thMonth} ${beYear}`;
    }
    return '';
  }, [startDate]);

  // ฟังก์ชันเลือกช่วงวันที่ด่วน เช่น เดือนที่แล้ว (01/09/26 - 30/09/26)
  const handleSetDatePreset = (preset: 'last_month' | 'this_month' | 'last_7_days' | 'last_30_days' | 'this_year') => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let start = '';
    let end = '';

    if (preset === 'last_month') {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      start = fmt(firstDay);
      end = fmt(lastDay);
    } else if (preset === 'this_month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      start = fmt(firstDay);
      end = fmt(lastDay);
    } else if (preset === 'last_7_days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      start = fmt(past);
      end = fmt(today);
    } else if (preset === 'last_30_days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 29);
      start = fmt(past);
      end = fmt(today);
    } else if (preset === 'this_year') {
      start = `${year}-01-01`;
      end = `${year}-12-31`;
    }

    if (start && end) {
      setStartDate(start);
      setEndDate(end);
      localStorage.setItem('bklabplus_summary_start_date', start);
      localStorage.setItem('bklabplus_summary_end_date', end);

      const startParts = start.split('-');
      const mIdx = parseInt(startParts[1], 10) - 1;
      const beYear = parseInt(startParts[0], 10) + 543;
      const thMonth = THAI_MONTH_NAMES[mIdx] || '';
      if (thMonth) {
        const title = `ประจำเดือน ${thMonth} ${beYear}`;
        setCustomReportTitle(title);
        localStorage.setItem('bklabplus_summary_custom_title', title);
      }
    }
  };

  const [businesses, setBusinesses] = useState<Business[]>(() => propBusinesses || loadBusinesses());
  const [selectedBiz, setSelectedBiz] = useState<string>(activeBusinessId || 'all');

  // ตัวเลือกแสดง/ซ่อนรายละเอียดแต่ละตาราง (ตามที่ผู้ใช้ต้องการ: เพื่อจะได้ไม่ต้องแสดงตารางเปล่า)
  const [showIncomeDetails, setShowIncomeDetails] = useState<boolean>(true);
  const [showExpenseDetails, setShowExpenseDetails] = useState<boolean>(true);
  const [showOutLabDetails, setShowOutLabDetails] = useState<boolean>(true);

  // ข้อความใต้ลายเซ็นสำหรับรายงานสรุป / รายเดือน (บันทึกเป็นค่าเริ่มต้นถาวรอัตโนมัติ)
  const [signatureTitle, setSignatureTitle] = useState<string>(() => {
    return localStorage.getItem('bklabplus_sig_summary_title') || 'ผู้ตรวจสอบรายเดือนสรุป';
  });
  const [signatureSubtitle, setSignatureSubtitle] = useState<string>(() => {
    return localStorage.getItem('bklabplus_sig_summary_sub') || 'คลินิก / แล็บวิเคราะห์';
  });
  const [showSignatureSection, setShowSignatureSection] = useState<boolean>(() => {
    const saved = localStorage.getItem('bklabplus_sig_summary_show');
    return saved !== null ? saved === 'true' : true;
  });

  const handleSignatureTitleChange = (val: string) => {
    setSignatureTitle(val);
    localStorage.setItem('bklabplus_sig_summary_title', val);
  };

  const handleSignatureSubtitleChange = (val: string) => {
    setSignatureSubtitle(val);
    localStorage.setItem('bklabplus_sig_summary_sub', val);
  };

  const handleToggleSignatureSection = (val: boolean) => {
    setShowSignatureSection(val);
    localStorage.setItem('bklabplus_sig_summary_show', String(val));
  };

  // สลับโหมดมุมมอง: รายการทั้งหมด (Itemized) หรือ จัดกลุ่มตามชื่อรายการ (Grouped)
  const [incomeViewMode, setIncomeViewMode] = useState<'itemized' | 'grouped'>('itemized');
  const [expenseViewMode, setExpenseViewMode] = useState<'itemized' | 'grouped'>('itemized');
  const [outLabViewMode, setOutLabViewMode] = useState<'grouped' | 'itemized'>('grouped');

  // ช่องค้นหาเพิ่มเติม
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [recordsByBusiness, setRecordsByBusiness] = useState<Record<string, Record<string, DailyRecord>>>(() => {
    return loadAllRecordsByBusiness();
  });
  const [, setFlatRecords] = useState<Record<string, DailyRecord>>({});

  useEffect(() => {
    if (propBusinesses && propBusinesses.length > 0) {
      setBusinesses(propBusinesses);
    }
  }, [propBusinesses]);

  useEffect(() => {
    if (activeBusinessId) {
      setSelectedBiz(activeBusinessId);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    // สมัครเชื่อมสัญญาณสดเรียลไทม์จากค่ายระบบคลาวด์ Firebase
    const unsubscribeRecords = subscribeToRecords((byBiz, flat) => {
      setRecordsByBusiness((prev) => {
        const merged: Record<string, Record<string, DailyRecord>> = { ...prev };
        Object.keys(byBiz).forEach((bId) => {
          merged[bId] = { ...(merged[bId] || {}), ...(byBiz[bId] || {}) };
        });
        return merged;
      });
      setFlatRecords(flat);
    });

    const unsubscribeBusinesses = subscribeToBusinesses((updatedList) => {
      if (updatedList && updatedList.length > 0) {
        setBusinesses(updatedList);
      }
    });

    return () => {
      unsubscribeRecords();
      unsubscribeBusinesses();
    };
  }, []);

  // คำนวณ records ตามบริษัทที่เลือกกรอง
  const records = useMemo(() => {
    if (selectedBiz !== 'all') {
      const bizRecs = recordsByBusiness[selectedBiz];
      if (bizRecs && Object.keys(bizRecs).length > 0) {
        return bizRecs;
      }
      return loadAllRecords(selectedBiz);
    }

    // กรณีเลือก "รวมทุกบริษัท (Consolidated)" ให้รวมข้อมูลแต่ละวันเข้าด้วยกัน
    const aggregated: Record<string, DailyRecord> = {};

    Object.keys(recordsByBusiness).forEach((bId) => {
      const bizRecords = recordsByBusiness[bId] || {};
      Object.keys(bizRecords).forEach((d) => {
        const rec = bizRecords[d];
        if (!aggregated[d]) {
          aggregated[d] = {
            date: d,
            incomeItems: [...(rec.incomeItems || [])],
            expenseItems: [...(rec.expenseItems || [])],
            outLabItems: [...(rec.outLabItems || [])],
            hasOutLab: rec.hasOutLab !== false,
            cashCheck: {
              countedCash: rec.cashCheck?.countedCash || 0,
              note: rec.cashCheck?.note || '',
              isSaved: rec.cashCheck?.isSaved || false,
            },
          };
        } else {
          aggregated[d].incomeItems = [
            ...aggregated[d].incomeItems,
            ...(rec.incomeItems || []),
          ];
          aggregated[d].expenseItems = [
            ...aggregated[d].expenseItems,
            ...(rec.expenseItems || []),
          ];
          aggregated[d].outLabItems = [
            ...aggregated[d].outLabItems,
            ...(rec.outLabItems || []),
          ];
          if (rec.hasOutLab !== false) {
            aggregated[d].hasOutLab = true;
          }
          aggregated[d].cashCheck.countedCash += rec.cashCheck?.countedCash || 0;
        }
      });
    });

    return aggregated;
  }, [selectedBiz, recordsByBusiness]);

  const activeBizObj = businesses.find((b) => b.id === selectedBiz);
  // ชื่อแล็บ/ธุรกิจสำหรับแสดงในหัวกระดาษเอกสารและรายงาน
  const activeBizTitle =
    selectedBiz === 'all'
      ? 'รวมทุกบริษัท / ธุรกิจ (Consolidated Ledger)'
      : activeBizObj?.name || 'คลินิกและแล็บ';

  // หาลิสต์วันที่ตามระยะห่าง (Range)
  const getDateRangeList = (startStr: string, endStr: string) => {
    const list: string[] = [];
    if (!startStr || !endStr) return list;

    const start = new Date(startStr);
    const end = new Date(endStr);
    const current = new Date(start);

    // ป้องกันหน้าเว็บค้างถ้าเผลอคีย์สลับฝั่ง
    if (start > end) return list;

    const limit = 1000;
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

  const datesInRange = useMemo(() => getDateRangeList(startDate, endDate), [startDate, endDate]);

  // คำนวณรวบรวมรายการทั้งหมด
  const {
    allIncomeItems,
    allExpenseItems,
    allOutLabItems,
    totalRangeIncome,
    totalRangeIncomeCash,
    totalRangeIncomeTransfer,
    totalRangeGeneralExpense,
    totalRangeGeneralExpenseCash,
    totalRangeGeneralExpenseTransfer,
    totalRangeOutLab,
    sortedOutLabList,
    groupedIncomeList,
    groupedExpenseList,
  } = useMemo(() => {
    const incomes: DetailedIncomeItem[] = [];
    const expenses: DetailedExpenseItem[] = [];
    const outLabs: DetailedOutLabItem[] = [];

    let sumIncome = 0;
    let sumIncomeCash = 0;
    let sumIncomeTransfer = 0;
    let sumGeneralExp = 0;
    let sumGeneralExpCash = 0;
    let sumGeneralExpTransfer = 0;
    let sumOutLabExp = 0;

    const outLabGroupMap: Record<string, { count: number; totalAmount: number; prices: number[] }> = {};
    const incomeGroupMap: Record<string, { count: number; totalAmount: number; cashAmount: number; transferAmount: number }> = {};
    const expenseGroupMap: Record<string, { count: number; totalAmount: number; cashAmount: number; transferAmount: number }> = {};

    datesInRange.forEach((date) => {
      const rec = records[date];
      if (rec) {
        // 1. รายรับ
        (rec.incomeItems || []).forEach((item, idx) => {
          const amt = Number(item.amount) || 0;
          const pType = item.type === 'transfer' ? 'transfer' : 'cash';
          sumIncome += amt;
          if (pType === 'cash') {
            sumIncomeCash += amt;
          } else {
            sumIncomeTransfer += amt;
          }

          const desc = (item.description || 'ไม่ได้ระบุชื่อรายการ').trim();
          incomes.push({
            id: item.id || `${date}-inc-${idx}`,
            date,
            description: desc,
            type: pType,
            amount: amt,
          });

          if (!incomeGroupMap[desc]) {
            incomeGroupMap[desc] = { count: 0, totalAmount: 0, cashAmount: 0, transferAmount: 0 };
          }
          incomeGroupMap[desc].count += 1;
          incomeGroupMap[desc].totalAmount += amt;
          if (pType === 'cash') {
            incomeGroupMap[desc].cashAmount += amt;
          } else {
            incomeGroupMap[desc].transferAmount += amt;
          }
        });

        // 2. รายจ่ายทั่วไป
        (rec.expenseItems || []).forEach((item, idx) => {
          const amt = Number(item.amount) || 0;
          sumGeneralExp += amt;
          const eType = item.type === 'transfer' ? 'transfer' : 'cash';

          const desc = (item.description || 'ไม่ได้ระบุชื่อรายการ').trim();
          expenses.push({
            id: item.id || `${date}-exp-${idx}`,
            date,
            description: desc,
            amount: amt,
            type: eType,
          });

          if (!expenseGroupMap[desc]) {
            expenseGroupMap[desc] = { count: 0, totalAmount: 0, cashAmount: 0, transferAmount: 0 };
          }
          expenseGroupMap[desc].count += 1;
          expenseGroupMap[desc].totalAmount += amt;
          if (eType === 'cash') {
            sumGeneralExpCash += amt;
            expenseGroupMap[desc].cashAmount = (expenseGroupMap[desc].cashAmount || 0) + amt;
          } else {
            sumGeneralExpTransfer += amt;
            expenseGroupMap[desc].transferAmount = (expenseGroupMap[desc].transferAmount || 0) + amt;
          }
        });

        // 3. Out-Lab
        if (rec.hasOutLab !== false) {
          (rec.outLabItems || []).forEach((item, idx) => {
            const amt = Number(item.amount) || 0;
            sumOutLabExp += amt;
            const tName = (item.testName || 'ส่งแล็บทั่วไป (อื่นๆ)').trim();

            outLabs.push({
              id: item.id || `${date}-lab-${idx}`,
              date,
              labNumber: item.labNumber || '-',
              testName: tName,
              amount: amt,
            });

            if (!outLabGroupMap[tName]) {
              outLabGroupMap[tName] = { count: 0, totalAmount: 0, prices: [] };
            }
            outLabGroupMap[tName].count += 1;
            outLabGroupMap[tName].totalAmount += amt;
            outLabGroupMap[tName].prices.push(amt);
          });
        }
      }
    });

    // เรียง Out-Lab ตามความถี่มากไปน้อย
    const sortedOutLabs: GroupedOutLab[] = Object.keys(outLabGroupMap).map((name) => {
      const g = outLabGroupMap[name];
      const unitPrice = g.count > 0 ? g.totalAmount / g.count : 0;
      return {
        testName: name,
        unitPrice,
        count: g.count,
        totalAmount: g.totalAmount,
      };
    });
    sortedOutLabs.sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount);

    // เรียงจัดกลุ่มรายได้
    const sortedIncomeGroups: GroupedIncome[] = Object.keys(incomeGroupMap).map((desc) => {
      const g = incomeGroupMap[desc];
      return {
        description: desc,
        count: g.count,
        totalAmount: g.totalAmount,
        cashAmount: g.cashAmount,
        transferAmount: g.transferAmount,
      };
    });
    sortedIncomeGroups.sort((a, b) => b.totalAmount - a.totalAmount);

    // เรียงจัดกลุ่มรายจ่าย
    const sortedExpenseGroups: GroupedExpense[] = Object.keys(expenseGroupMap).map((desc) => {
      const g = expenseGroupMap[desc];
      return {
        description: desc,
        count: g.count,
        totalAmount: g.totalAmount,
        cashAmount: g.cashAmount || 0,
        transferAmount: g.transferAmount || 0,
      };
    });
    sortedExpenseGroups.sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      allIncomeItems: incomes,
      allExpenseItems: expenses,
      allOutLabItems: outLabs,
      totalRangeIncome: sumIncome,
      totalRangeIncomeCash: sumIncomeCash,
      totalRangeIncomeTransfer: sumIncomeTransfer,
      totalRangeGeneralExpense: sumGeneralExp,
      totalRangeGeneralExpenseCash: sumGeneralExpCash,
      totalRangeGeneralExpenseTransfer: sumGeneralExpTransfer,
      totalRangeOutLab: sumOutLabExp,
      sortedOutLabList: sortedOutLabs,
      groupedIncomeList: sortedIncomeGroups,
      groupedExpenseList: sortedExpenseGroups,
    };
  }, [datesInRange, records]);

  const totalRangeExpense = totalRangeGeneralExpense + totalRangeOutLab;
  const netProfit = totalRangeIncome - totalRangeExpense;

  // ผลรวมท้ายตาราง Out-Lab
  const totalOutLabCount = sortedOutLabList.reduce((sum, item) => sum + item.count, 0);
  const totalOutLabAmountSum = sortedOutLabList.reduce((sum, item) => sum + item.totalAmount, 0);

  // ฟิลเตอร์ค้นหาในตาราง
  const filteredIncomeItems = useMemo(() => {
    if (!searchTerm.trim()) return allIncomeItems;
    const term = searchTerm.toLowerCase();
    return allIncomeItems.filter(
      (item) =>
        item.description.toLowerCase().includes(term) ||
        item.date.includes(term) ||
        (item.type === 'cash' ? 'เงินสด' : 'โอน').includes(term)
    );
  }, [allIncomeItems, searchTerm]);

  const filteredExpenseItems = useMemo(() => {
    if (!searchTerm.trim()) return allExpenseItems;
    const term = searchTerm.toLowerCase();
    return allExpenseItems.filter(
      (item) =>
        item.description.toLowerCase().includes(term) ||
        item.date.includes(term) ||
        (item.type === 'transfer' ? 'เงินโอน โอน' : 'เงินสด สด').includes(term)
    );
  }, [allExpenseItems, searchTerm]);

  // ฟอร์แมตวันที่แบบไทยย่อ
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // --- ข้อมูลสำหรับ Recharts กราฟ ---
  const chartData = useMemo(() => {
    return datesInRange.map((date) => {
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

      const parts = date.split('-');
      const formattedDate = `${parts[2]}/${parts[1]}`;

      return {
        dateLabel: formattedDate,
        fullDate: date,
        รายรับ: inc,
        รายจ่าย: expGeneral + expLab,
        ทั่วไป: expGeneral,
        'Out-Lab': expLab,
      };
    });
  }, [datesInRange, records]);

  // --- ส่งออก Excel ภาพรวมสะสม ---
  const handleExportExcel = () => {
    const bizPrefix = selectedBiz === 'all' ? 'AllBiz' : activeBizObj?.code || 'BIZ';
    const filename = `${bizPrefix}_SummaryReport_${startDate}_to_${endDate}.xlsx`;

    // 1. หัวตารางเอกสาร ระบุชื่อแล็บ/ธุรกิจและหัวข้อประจำเดือนชัดเจน
    const headerRow: (string | number)[][] = [
      ['รายงานสรุปภาพรวมรายได้-รายจ่าย และรายละเอียดการเงินสะสม'],
      ...(customReportTitle ? [[`หัวข้อเอกสาร / ประจำเดือน: ${customReportTitle}`]] : []),
      [`ชื่อสถานพยาบาล / แล็บ (สมุดบัญชีธุรกิจ): ${activeBizTitle}`],
      [`ช่วงวันที่: ${startDate} ถึง ${endDate} (รวม ${datesInRange.length} วัน)`],
      [],
    ];

    // 2. สรุปภาพรวมการเงิน
    const metricsRow: (string | number)[][] = [
      ['ข้อมูลสรุปภาพรวมทางการเงินสะสม'],
      ['ตัวชี้วัด', 'ยอดเงินรวมสะสม (บาท)'],
      ['รายรับรวมสะสม (ทั้งหมด)', totalRangeIncome],
      ['- รายรับเงินสดสะสม', totalRangeIncomeCash],
      ['- รายรับเงินโอนสะสม', totalRangeIncomeTransfer],
      ['รายจ่ายทั่วไปรวมสะสม', totalRangeGeneralExpense],
      ['- รายจ่ายเงินสดสะสม', totalRangeGeneralExpenseCash],
      ['- รายจ่ายเงินโอนสะสม', totalRangeGeneralExpenseTransfer],
      ['รายจ่ายส่งแล็บนอก (Out-Lab) สะสม', totalRangeOutLab],
      ['ค่าใช้จ่ายรวมทั้งหมดสะสม', totalRangeExpense],
      ['รายได้สุทธิสะสม (Net Profit)', netProfit],
      [],
    ];

    const dataSections: (string | number)[][] = [];

    // 3. ตารางรายละเอียดรายได้ (ถ้าเลือกแสดง)
    if (showIncomeDetails) {
      dataSections.push(
        ['[1] รายละเอียดรายการรายได้ (Income Details)'],
        ['ลำดับ', 'วันที่', 'ชื่อรายการ', 'ช่องทางชำระเงิน', 'จำนวนเงิน (บาท)']
      );
      allIncomeItems.forEach((item, index) => {
        dataSections.push([
          index + 1,
          item.date,
          item.description,
          item.type === 'cash' ? 'เงินสด' : 'เงินโอน',
          item.amount,
        ]);
      });
      dataSections.push(
        ['รวมรายรับเงินสด', '', '', '', totalRangeIncomeCash],
        ['รวมรายรับเงินโอน', '', '', '', totalRangeIncomeTransfer],
        ['รวมรายรับทั้งหมด', '', '', '', totalRangeIncome],
        []
      );
    }

    // 4. ตารางรายละเอียดรายจ่าย (ถ้าเลือกแสดง)
    if (showExpenseDetails) {
      dataSections.push(
        ['[2] รายละเอียดรายการรายจ่ายทั่วไป (General Expense Details)'],
        ['ลำดับ', 'วันที่', 'ชื่อรายการรายจ่าย', 'ช่องทางชำระเงิน', 'จำนวนเงิน (บาท)']
      );
      allExpenseItems.forEach((item, index) => {
        dataSections.push([
          index + 1,
          item.date,
          item.description,
          item.type === 'transfer' ? 'เงินโอน' : 'เงินสด',
          item.amount,
        ]);
      });
      dataSections.push(
        ['รวมรายจ่ายเงินสด', '', '', '', totalRangeGeneralExpenseCash],
        ['รวมรายจ่ายเงินโอน', '', '', '', totalRangeGeneralExpenseTransfer],
        ['รวมรายจ่ายทั่วไปทั้งหมด', '', '', '', totalRangeGeneralExpense],
        []
      );
    }

    // 5. ตารางแจกแจง Out-Lab (ถ้าเลือกแสดง)
    if (showOutLabDetails) {
      dataSections.push(
        ['[3] รายละเอียดรายการตรวจส่งแล็บนอก (Out-Lab Details)'],
        ['รายการวิเคราะห์วิจัย / Test', 'ราคาเฉลี่ยต่อหน่วย (บาท)', 'จำนวนครั้งส่งตรวจ', 'รวมเงินสะสม (บาท)']
      );
      sortedOutLabList.forEach((item) => {
        dataSections.push([
          item.testName,
          item.unitPrice,
          item.count,
          item.totalAmount,
        ]);
      });
      dataSections.push(
        ['รวมบริการส่งตรวจ Out-Lab ทั้งหมด', '', totalOutLabCount, totalOutLabAmountSum],
        []
      );
    }

    // รวมข้อมูลลงชีตเดียว
    const allAOA = [...headerRow, ...metricsRow, ...dataSections];

    const worksheet = XLSX.utils.aoa_to_sheet(allAOA);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'สรุปภาพรวม');

    XLSX.writeFile(workbook, filename);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // ตัวช่วยจัดการปิดตารางที่ว่างอัตโนมัติ
  const handleHideEmptyTables = () => {
    setShowIncomeDetails(allIncomeItems.length > 0);
    setShowExpenseDetails(allExpenseItems.length > 0);
    setShowOutLabDetails(sortedOutLabList.length > 0);
  };

  const handleSelectAllTables = () => {
    setShowIncomeDetails(true);
    setShowExpenseDetails(true);
    setShowOutLabDetails(true);
    setShowSignatureSection(true);
  };

  return (
    <div className="space-y-6" id="summary-report-module">
      {/* พาเนลควบคุมช่วงวันที่ และเลือกฟิลเตอร์ธุรกิจ */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-150 space-y-4 print:hidden">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* ตัวเลือกฟิลเตอร์ธุรกิจ */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Building2 size={16} className="text-blue-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700">สมุดบัญชีธุรกิจ:</span>
              <select
                value={selectedBiz}
                onChange={(e) => setSelectedBiz(e.target.value)}
                className="text-xs font-bold text-blue-700 bg-white border border-blue-200 focus:border-blue-500 outline-none rounded-lg px-2.5 py-1 cursor-pointer"
              >
                <option value="all">🏢 รวมทุกบริษัท/ธุรกิจ (Consolidated)</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code || 'BIZ'})
                  </option>
                ))}
              </select>
            </div>

            {/* เลือกช่วงวันที่ และปุ่มเลือกช่วงเวลาด่วน */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar size={15} className="text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-500">ตั้งแต่</span>
              <input
                type="date"
                id="summary-start-date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="text-xs font-bold text-gray-700 border border-gray-200 focus:border-blue-500 outline-none rounded-lg px-2 py-1 bg-white cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-500">ถึง</span>
              <input
                type="date"
                id="summary-end-date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="text-xs font-bold text-gray-700 border border-gray-200 focus:border-blue-500 outline-none rounded-lg px-2 py-1 bg-white cursor-pointer"
              />

              {/* ปุ่มลัดเลือกช่วงเวลา */}
              <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('last_month')}
                  className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition-colors cursor-pointer"
                  title="เลือกเดือนที่แล้ว เช่น 01/09/2026 - 30/09/2026"
                >
                  📅 เดือนที่แล้ว (ก.ย.)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('this_month')}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 transition-colors cursor-pointer"
                  title="เลือกเดือนนี้"
                >
                  เดือนนี้
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('last_30_days')}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition-colors cursor-pointer hidden lg:inline-block"
                >
                  30 วันล่าสุด
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDatePreset('this_year')}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition-colors cursor-pointer hidden lg:inline-block"
                >
                  ทั้งปีนี้
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {/* พิมพ์ PDF ภาพรวม */}
            <button
              onClick={handlePrintPDF}
              id="btn-print-summary"
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Printer size={15} />
              <span>พิมพ์รายงาน (PDF)</span>
            </button>

            {/* ส่งออกภาพรวม Excel */}
            <button
              onClick={handleExportExcel}
              id="btn-excel-summary"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>ส่งออก Excel</span>
            </button>
          </div>
        </div>

        {/* แถบตัวเลือกเปิด/ปิดการแสดงผลตาราง (Checkboxes for table display) */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Layers size={15} className="text-indigo-600" />
              <span>เลือกตารางที่ต้องการแสดงในรายงาน:</span>
            </span>

            {/* Checkbox: รายละเอียดรายได้ */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
              showIncomeDetails
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={showIncomeDetails}
                onChange={(e) => setShowIncomeDetails(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Wallet size={13} className={showIncomeDetails ? 'text-emerald-600' : 'text-gray-400'} />
                <span>รายละเอียดรายได้</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                allIncomeItems.length > 0
                  ? 'bg-emerald-200/70 text-emerald-900 font-bold'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {allIncomeItems.length} รายการ
              </span>
            </label>

            {/* Checkbox: รายละเอียดรายจ่าย */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
              showExpenseDetails
                ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={showExpenseDetails}
                onChange={(e) => setShowExpenseDetails(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Receipt size={13} className={showExpenseDetails ? 'text-rose-600' : 'text-gray-400'} />
                <span>รายละเอียดรายจ่าย</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                allExpenseItems.length > 0
                  ? 'bg-rose-200/70 text-rose-900 font-bold'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {allExpenseItems.length} รายการ
              </span>
            </label>

            {/* Checkbox: รายละเอียดส่งแล็บนอก (Out-Lab) */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
              showOutLabDetails
                ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={showOutLabDetails}
                onChange={(e) => setShowOutLabDetails(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <FlaskConical size={13} className={showOutLabDetails ? 'text-amber-600' : 'text-gray-400'} />
                <span>รายละเอียดส่งแล็บนอก (Out-Lab)</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                sortedOutLabList.length > 0
                  ? 'bg-amber-200/70 text-amber-900 font-bold'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {sortedOutLabList.length} ชนิด / {totalOutLabCount} ครั้ง
              </span>
            </label>

            {/* Checkbox: สรุปภาพรวมและลายเซ็นท้ายรายงาน */}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all ${
              showSignatureSection
                ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={showSignatureSection}
                onChange={(e) => handleToggleSignatureSection(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <CheckCircle size={13} className={showSignatureSection ? 'text-blue-600' : 'text-gray-400'} />
                <span>สรุปหมายเหตุ & ลายเซ็น</span>
              </span>
            </label>
          </div>

          {/* ปุ่มตัวช่วยเร็ว */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHideEmptyTables}
              className="text-[11px] font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="ซ่อนตารางที่ไม่มีข้อมูลทันที เพื่อไม่ให้มีตารางว่าง"
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

      {/* เอกสารรายงานสรุปสะสม (พิมพ์ / แสดงผล) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-150 shadow-xs space-y-8 print:border-0 print:shadow-none print:p-0">
        
        {/* หัวกระดาษเอกสาร: ชื่อบริษัท + หัวข้อเอกสารอยู่ด้านซ้าย, ช่วงวันที่อยู่มุมขวาบนอย่างเป็นระเบียบเรียบร้อย */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-slate-800/10">
          
          {/* ซีกซ้าย: โลโก้ + ชื่อบริษัท/ธุรกิจ + หัวข้อเอกสารใต้ชื่อบริษัท */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            {activeBizObj?.logoUrl ? (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white border border-slate-200 shadow-xs shrink-0 mt-0.5 overflow-hidden p-1">
                <img
                  src={activeBizObj.logoUrl}
                  alt={activeBizTitle}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 mt-0.5 ${
                selectedBiz === 'all'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-700'
                  : 'bg-gradient-to-br from-blue-600 to-indigo-700'
              }`}>
                {selectedBiz === 'all' ? <Building2 size={24} /> : <HeartPulse size={24} />}
              </div>
            )}

            <div className="space-y-2 flex-1 min-w-0">
              {/* แถวชื่อบริษัท + รหัส */}
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  {activeBizTitle}
                </h1>
                {activeBizObj?.code && (
                  <span className="px-2 py-0.5 text-xs font-black bg-blue-100 text-blue-800 rounded-md uppercase font-mono">
                    {activeBizObj.code}
                  </span>
                )}
              </div>

              {/* หัวข้อเอกสาร: ลงมาอยู่ใต้ชื่อบริษัทตามที่ต้องการ */}
              <div className="space-y-1.5 pt-0.5">
                {/* กล่องพิมพ์หัวข้อเอกสารบนหน้าจอ */}
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <div className="relative inline-flex items-center">
                    <input
                      type="text"
                      id="summary-custom-month-title-input"
                      value={customReportTitle}
                      onChange={(e) => handleCustomTitleChange(e.target.value)}
                      placeholder="คลิกพิมพ์หัวข้อเอกสาร เช่น ประจำเดือน กันยายน 2569"
                      className="text-sm md:text-base font-extrabold text-blue-900 bg-blue-50/70 hover:bg-blue-50 focus:bg-white border border-blue-200 focus:border-blue-500 rounded-xl px-3 py-1.5 outline-none transition-all shadow-2xs min-w-[260px] sm:min-w-[340px]"
                    />
                  </div>

                  {/* ปุ่มด่วนใช้ชื่อเดือนแนะนำตามช่วงวันที่ */}
                  {suggestedMonthTitle && customReportTitle !== suggestedMonthTitle && (
                    <button
                      type="button"
                      onClick={() => handleCustomTitleChange(suggestedMonthTitle)}
                      className="text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                      title="คลิกเพื่อใช้ชื่อเดือนอัตโนมัติตามช่วงวันที่"
                    >
                      <Sparkles size={11} className="text-amber-500" />
                      <span>ใช้: {suggestedMonthTitle}</span>
                    </button>
                  )}
                  {customReportTitle && (
                    <button
                      type="button"
                      onClick={() => handleCustomTitleChange('')}
                      className="text-[11px] font-medium text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      title="ล้างหัวข้อ"
                    >
                      ล้าง
                    </button>
                  )}
                </div>

                {/* แสดงหัวข้อตัวจริงตอนพิมพ์ PDF */}
                {customReportTitle && (
                  <h2 className="hidden print:block text-base md:text-lg font-black text-slate-900">
                    {customReportTitle}
                  </h2>
                )}

                {/* รายละเอียดย่อย / คำอธิบาย */}
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
                  รายงานสรุปภาพรวมรายได้-รายจ่าย และรายละเอียดการเงินสะสม
                </p>
                {activeBizObj?.description && (
                  <p className="text-[11px] text-gray-400">
                    {activeBizObj.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ซีกขวา: ช่วงวันที่บันทึกสะสม อยู่มุมขวาบนอย่างเรียบร้อย ไม่ตกบรรทัด */}
          <div className="text-left sm:text-right bg-slate-50 p-3 sm:py-2.5 sm:px-4 rounded-2xl border border-slate-200/90 shrink-0 self-start sm:self-auto min-w-[190px]">
            <span className="text-[11px] text-slate-500 block font-bold uppercase tracking-wider">
              ช่วงวันที่บันทึกสะสม
            </span>
            <span className="text-sm md:text-base font-black text-slate-900 block mt-0.5 font-mono">
              {formatThaiDate(startDate)} — {formatThaiDate(endDate)}
            </span>
            <span className="text-[11px] text-blue-600 font-bold block mt-0.5">
              รวมทั้งสิ้น {datesInRange.length} วัน
            </span>
          </div>

        </div>

        {/* ยอดไฮไลต์สะสม 4 มิติทางการเงิน */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 border border-emerald-150">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
              <span>รายรับสะสมรวม</span>
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">
              ฿{formatNumber(totalRangeIncome)}
            </div>
            <div className="text-[11px] text-emerald-700/80 mt-1 flex items-center justify-between font-medium">
              <span>เงินสด: ฿{formatNumber(totalRangeIncomeCash)}</span>
              <span>โอน: ฿{formatNumber(totalRangeIncomeTransfer)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/70 to-rose-100/30 border border-rose-150">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800 mb-1">
              <span>รายจ่ายทั่วไปสะสม</span>
              <Receipt size={16} className="text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600">
              ฿{formatNumber(totalRangeGeneralExpense)}
            </div>
            <div className="text-[11px] text-rose-700/80 mt-1 flex items-center justify-between font-medium">
              <span>เงินสด: ฿{formatNumber(totalRangeGeneralExpenseCash)}</span>
              <span>โอน: ฿{formatNumber(totalRangeGeneralExpenseTransfer)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-amber-100/30 border border-amber-150">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-1">
              <span>รายจ่าย Out-Lab สะสม</span>
              <FlaskConical size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">
              ฿{formatNumber(totalRangeOutLab)}
            </div>
            <span className="text-[11px] text-amber-700/80 block mt-1 font-medium">
              ส่งแล็บนอก {totalOutLabCount} ครั้ง ({sortedOutLabList.length} รายการตรวจ)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
              <span>รายได้สุทธิสะสม (Net Profit)</span>
              <Wallet size={16} className="text-emerald-400" />
            </div>
            <div className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ฿{formatNumber(netProfit)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1 font-medium">
              รายรับหักลบรายจ่ายทั้งหมด (฿{formatNumber(totalRangeExpense)})
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* [1] ส่วนตารางรายละเอียดรายได้ (Income Details Table) */}
        {/* ============================================================== */}
        {showIncomeDetails && (
          <div className="space-y-3 pt-2" id="income-details-section">
            <div className="flex flex-wrap justify-between items-center pb-2 border-b border-gray-150 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Wallet size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm md:text-base text-slate-900">
                    สรุปรายละเอียดรายได้ (Income Details)
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    ชื่อรายการ ช่องทางการชำระ (เงินสดหรือโอน) และจำนวนเงิน
                  </p>
                </div>
              </div>

              {/* ยอดสรุปย่อย & ปุ่มสลับโหมด */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    💵 เงินสด: ฿{formatNumber(totalRangeIncomeCash)}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
                    📱 โอน: ฿{formatNumber(totalRangeIncomeTransfer)}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-black border border-slate-200">
                    รวม: ฿{formatNumber(totalRangeIncome)}
                  </span>
                </div>

                <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 print:hidden">
                  <button
                    type="button"
                    onClick={() => setIncomeViewMode('itemized')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      incomeViewMode === 'itemized'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    รายวัน ({filteredIncomeItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncomeViewMode('grouped')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      incomeViewMode === 'grouped'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    สรุปตามชื่อรายการ ({groupedIncomeList.length})
                  </button>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 cursor-pointer print:hidden select-none bg-slate-50 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={showIncomeDetails}
                    onChange={(e) => setShowIncomeDetails(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <span className="text-[11px] font-semibold">แสดงในรายงาน</span>
                </label>
              </div>
            </div>

            {/* ตัวตารางรายได้ */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              {incomeViewMode === 'itemized' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-emerald-50/80 text-emerald-950 font-bold border-b border-emerald-200">
                      <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                      <th className="py-2.5 px-3 w-28">วันที่</th>
                      <th className="py-2.5 px-4">ชื่อรายการรายได้</th>
                      <th className="py-2.5 px-3 text-center w-32">เงินสดหรือโอน</th>
                      <th className="py-2.5 px-4 text-right w-36">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-slate-700">
                    {filteredIncomeItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          ไม่พบรายการรายได้ในช่วงวันที่เลือก
                        </td>
                      </tr>
                    ) : (
                      filteredIncomeItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                            {formatThaiDate(item.date)}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.type === 'cash' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                💵 เงินสด
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                📱 โอนเงิน
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            ฿{formatNumber(item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/60 font-black text-slate-900 border-t-2 border-emerald-200">
                      <td colSpan={3} className="py-3 px-4 text-right">
                        สรุปผลรวมรายได้ ({filteredIncomeItems.length} รายการ):
                      </td>
                      <td className="py-3 px-3 text-center text-[11px] text-slate-600">
                        สด: ฿{formatNumber(totalRangeIncomeCash)} | โอน: ฿{formatNumber(totalRangeIncomeTransfer)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-800 text-sm">
                        ฿{formatNumber(totalRangeIncome)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                /* โหมดสรุปตามชื่อรายการรายได้ (Grouped by Description) */
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-emerald-50/80 text-emerald-950 font-bold border-b border-emerald-200">
                      <th className="py-2.5 px-4">ชื่อรายการรายได้</th>
                      <th className="py-2.5 px-3 text-center">จำนวนครั้ง</th>
                      <th className="py-2.5 px-4 text-right">ยอดเงินสด</th>
                      <th className="py-2.5 px-4 text-right">ยอดเงินโอน</th>
                      <th className="py-2.5 px-4 text-right">ยอดรวม (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-slate-700">
                    {groupedIncomeList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          ไม่พบรายการรายได้ในช่วงวันที่เลือก
                        </td>
                      </tr>
                    ) : (
                      groupedIncomeList.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{item.description}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-full text-[11px]">
                              {item.count}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                            ฿{formatNumber(item.cashAmount)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-blue-700">
                            ฿{formatNumber(item.transferAmount)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                            ฿{formatNumber(item.totalAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/60 font-black text-slate-900 border-t-2 border-emerald-200">
                      <td className="py-3 px-4 text-right">สรุปผลรวมรายได้ทั้งหมด:</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {allIncomeItems.length} ครั้ง
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        ฿{formatNumber(totalRangeIncomeCash)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-700">
                        ฿{formatNumber(totalRangeIncomeTransfer)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-800 text-sm">
                        ฿{formatNumber(totalRangeIncome)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* [2] ส่วนตารางรายละเอียดรายจ่ายทั่วไป (Expense Details Table) */}
        {/* ============================================================== */}
        {showExpenseDetails && (
          <div className="space-y-3 pt-2" id="expense-details-section">
            <div className="flex flex-wrap justify-between items-center pb-2 border-b border-gray-150 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Receipt size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm md:text-base text-slate-900">
                    สรุปรายละเอียดรายจ่ายทั่วไป (General Expense Details)
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    ชื่อรายการค่าใช้จ่าย และจำนวนเงิน
                  </p>
                </div>
              </div>

              {/* ยอดสรุปย่อย & ปุ่มสลับโหมด */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-800 font-black border border-rose-200 text-xs">
                  รวมรายจ่ายทั่วไป: ฿{formatNumber(totalRangeGeneralExpense)}
                </span>

                <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 print:hidden">
                  <button
                    type="button"
                    onClick={() => setExpenseViewMode('itemized')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      expenseViewMode === 'itemized'
                        ? 'bg-white text-rose-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    รายวัน ({filteredExpenseItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseViewMode('grouped')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      expenseViewMode === 'grouped'
                        ? 'bg-white text-rose-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    สรุปตามชื่อรายการ ({groupedExpenseList.length})
                  </button>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-rose-700 cursor-pointer print:hidden select-none bg-slate-50 hover:bg-rose-50 px-2 py-1 rounded-lg border border-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={showExpenseDetails}
                    onChange={(e) => setShowExpenseDetails(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                  />
                  <span className="text-[11px] font-semibold">แสดงในรายงาน</span>
                </label>
              </div>
            </div>

            {/* ตัวตารางรายจ่าย */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              {expenseViewMode === 'itemized' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-rose-50/80 text-rose-950 font-bold border-b border-rose-200">
                      <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                      <th className="py-2.5 px-3 w-28">วันที่</th>
                      <th className="py-2.5 px-4">ชื่อรายการรายจ่าย</th>
                      <th className="py-2.5 px-3 text-center w-24">ช่องทาง</th>
                      <th className="py-2.5 px-4 text-right w-40">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-slate-700">
                    {filteredExpenseItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          ไม่พบรายการรายจ่ายทั่วไปในช่วงวันที่เลือก
                        </td>
                      </tr>
                    ) : (
                      filteredExpenseItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                            {formatThaiDate(item.date)}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.type === 'transfer'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.type === 'transfer' ? '📲 โอน' : '💵 สด'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                            ฿{formatNumber(item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50/30 text-[11px] text-gray-700 border-t border-rose-150">
                      <td colSpan={4} className="py-1.5 px-4 text-right font-medium">รวมจ่ายเงินสด (Cash Expense):</td>
                      <td className="py-1.5 px-4 text-right text-emerald-800 font-mono font-bold">
                        ฿{formatNumber(totalRangeGeneralExpenseCash)}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/30 text-[11px] text-gray-700 border-t border-rose-100">
                      <td colSpan={4} className="py-1.5 px-4 text-right font-medium">รวมจ่ายเงินโอน (Transfer Expense):</td>
                      <td className="py-1.5 px-4 text-right text-blue-800 font-mono font-bold">
                        ฿{formatNumber(totalRangeGeneralExpenseTransfer)}
                      </td>
                    </tr>
                    <tr className="bg-rose-50/60 font-black text-slate-900 border-t-2 border-rose-200">
                      <td colSpan={4} className="py-3 px-4 text-right">
                        สรุปผลรวมรายจ่ายทั่วไป ({filteredExpenseItems.length} รายการ):
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 text-sm">
                        ฿{formatNumber(totalRangeGeneralExpense)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                /* โหมดสรุปตามชื่อรายการรายจ่าย (Grouped by Description) */
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-rose-50/80 text-rose-950 font-bold border-b border-rose-200">
                      <th className="py-2.5 px-4">ชื่อรายการรายจ่าย</th>
                      <th className="py-2.5 px-3 text-center">จำนวนครั้ง</th>
                      <th className="py-2.5 px-4 text-right">เงินสด (บาท)</th>
                      <th className="py-2.5 px-4 text-right">เงินโอน (บาท)</th>
                      <th className="py-2.5 px-4 text-right">ยอดรวม (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-slate-700">
                    {groupedExpenseList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          ไม่พบรายการรายจ่ายทั่วไปในช่วงวันที่เลือก
                        </td>
                      </tr>
                    ) : (
                      groupedExpenseList.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>{item.description}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-full text-[11px]">
                              {item.count}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                            ฿{formatNumber(item.cashAmount || 0)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-blue-700">
                            ฿{formatNumber(item.transferAmount || 0)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700">
                            ฿{formatNumber(item.totalAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-rose-50/60 font-black text-slate-900 border-t-2 border-rose-200">
                      <td className="py-3 px-4 text-right">สรุปผลรวมรายจ่ายทั่วไป:</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {allExpenseItems.length} ครั้ง
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        ฿{formatNumber(totalRangeGeneralExpenseCash)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-700">
                        ฿{formatNumber(totalRangeGeneralExpenseTransfer)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 text-sm">
                        ฿{formatNumber(totalRangeGeneralExpense)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* [3] ส่วนตารางรายละเอียดส่งแล็บนอก (Out-Lab Details Table) */}
        {/* ============================================================== */}
        {showOutLabDetails && (
          <div className="space-y-3 pt-2" id="outlab-details-section">
            <div className="flex flex-wrap justify-between items-center pb-2 border-b border-gray-150 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <FlaskConical size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm md:text-base text-slate-900">
                    สรุปรายละเอียดส่งแล็บนอก (Out-Lab Details)
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    จำแนกตามรายการตรวจวิเคราะห์โรค เรียงลำดับจากส่งตรวจบ่อยที่สุด
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 font-black border border-amber-200 text-xs">
                  รวม Out-Lab: ฿{formatNumber(totalRangeOutLab)} ({totalOutLabCount} ครั้ง)
                </span>

                <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 print:hidden">
                  <button
                    type="button"
                    onClick={() => setOutLabViewMode('grouped')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      outLabViewMode === 'grouped'
                        ? 'bg-white text-amber-800 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    สรุปตามรายการตรวจ ({sortedOutLabList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutLabViewMode('itemized')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      outLabViewMode === 'itemized'
                        ? 'bg-white text-amber-800 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    รายวัน LN ({allOutLabItems.length})
                  </button>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-amber-700 cursor-pointer print:hidden select-none bg-slate-50 hover:bg-amber-50 px-2 py-1 rounded-lg border border-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={showOutLabDetails}
                    onChange={(e) => setShowOutLabDetails(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                  />
                  <span className="text-[11px] font-semibold">แสดงในรายงาน</span>
                </label>
              </div>
            </div>

            {/* ตัวตาราง Out-Lab */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              {outLabViewMode === 'grouped' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200">
                      <th className="py-2.5 px-4">รายการวิเคราะห์โรค / Test</th>
                      <th className="py-2.5 px-4 text-center">ราคาเฉลี่ยต่อหน่วย (บาท)</th>
                      <th className="py-2.5 px-4 text-center">จำนวนที่ส่ง (ครั้ง)</th>
                      <th className="py-2.5 px-4 text-right">ยอดเงินรวมพิกัด (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-slate-700">
                    {sortedOutLabList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          ไม่พบประวัติส่งแล็บนอกในช่วงวันที่เลือก
                        </td>
                      </tr>
                    ) : (
                      sortedOutLabList.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>{item.testName}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-gray-500">
                            ฿{formatNumber(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-full">
                              {item.count}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                            ฿{formatNumber(item.totalAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50/60 font-black text-slate-900 border-t-2 border-amber-200">
                      <td colSpan={2} className="py-3 px-4 text-right">
                        สรุปผลรวมส่งแล็บนอกทั้งหมด:
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-amber-800 font-extrabold">{totalOutLabCount} ครั้ง</span>
                      </td>
                      <td className="py-3 px-4 text-right text-amber-800 font-mono text-sm">
                        ฿{formatNumber(totalOutLabAmountSum)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                /* โหมดรายวัน LN (Itemized) */
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200">
                      <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                      <th className="py-2.5 px-3 w-28">วันที่</th>
                      <th className="py-2.5 px-3 w-28">LN (เลขแล็บ)</th>
                      <th className="py-2.5 px-4">ชื่อรายการวิเคราะห์ / Test</th>
                      <th className="py-2.5 px-4 text-right w-36">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-slate-700">
                    {allOutLabItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          ไม่พบประวัติส่งแล็บนอกในช่วงวันที่เลือก
                        </td>
                      </tr>
                    ) : (
                      allOutLabItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                            {formatThaiDate(item.date)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                            {item.labNumber}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {item.testName}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                            ฿{formatNumber(item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-50/60 font-black text-slate-900 border-t-2 border-amber-200">
                      <td colSpan={4} className="py-3 px-4 text-right">
                        สรุปผลรวมรายการส่งแล็บ ({allOutLabItems.length} รายการ):
                      </td>
                      <td className="py-3 px-4 text-right text-amber-800 font-mono text-sm">
                        ฿{formatNumber(totalRangeOutLab)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}

        {/* กรณีผู้ใช้ติ๊กปิดทุกตาราง */}
        {!showIncomeDetails && !showExpenseDetails && !showOutLabDetails && (
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 space-y-2">
            <p className="text-sm font-bold text-slate-600">
              ทุกตารางรายละเอียดถูกซ่อนอยู่ตามที่คุณเลือก
            </p>
            <p className="text-xs text-gray-400">
              สามารถติ๊กเครื่องหมายถูกที่แถบด้านบน เพื่อเลือกแสดงรายละเอียดรายได้, รายจ่าย, หรือ Out-Lab ได้ทันที
            </p>
            <button
              type="button"
              onClick={handleSelectAllTables}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              แสดงตารางทั้งหมดอีกครั้ง
            </button>
          </div>
        )}

        {/* ส่วนลงชื่อตรวจสอบและหมายเหตุ (สำคัญมาก สำหรับ Print & ตรวจสอบ) */}
        {showSignatureSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 text-xs text-gray-600">
            {/* สรุปข้อมูลภาพรวมของช่วงเวลา */}
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-gray-150">
              <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/80">
                <span className="font-extrabold text-slate-800 text-xs">
                  สรุปผลการเงินช่วงเวลา ({customReportTitle})
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-gray-200 font-semibold">
                  {datesInRange.length} วันที่มีการลงบัญชี
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">ยอดรายรับสะสมรวม:</span>
                  <span className="font-mono font-bold text-emerald-700">฿{formatNumber(totalRangeIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">ยอดรายจ่ายรวม (ทั่วไป + Out-Lab):</span>
                  <span className="font-mono font-bold text-rose-600">฿{formatNumber(totalRangeExpense)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-dashed border-gray-200">
                  <span className="font-extrabold text-slate-800">ผลกำไรสุทธิรวม (Net Profit):</span>
                  <span className={`font-mono font-black text-sm ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ฿{formatNumber(netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* ส่วนลายเซ็นและชื่อตำแหน่งใต้ลายเซ็น (พิมพ์เองและจำค่าเริ่มต้นอัตโนมัติ) */}
            <div className="flex flex-col justify-end items-end h-full">
              <div className="w-64 text-center space-y-3">
                <div className="border-b border-dashed border-gray-400 h-10 w-full"></div>
                <p className="text-slate-400 text-xs font-mono select-none">
                  (........................................................)
                </p>
                <div className="space-y-1 group">
                  <input
                    type="text"
                    value={signatureTitle}
                    onChange={(e) => handleSignatureTitleChange(e.target.value)}
                    placeholder="พิมพ์ตำแหน่งใต้ลายเซ็น เช่น ผู้ตรวจสอบรายเดือนสรุป..."
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
              </div>
            </div>
          </div>
        )}

        {/* แดชบอร์ดกราฟแสดงข้อมูลพฤติกรรม (Chart UI) */}
        {datesInRange.length > 0 && (
          <div className="space-y-6 pt-4 print:hidden" id="financial-charts-block">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-150">
              <BarChart3 size={16} className="text-blue-500" />
              <h4 className="font-extrabold text-sm text-slate-800">
                กราฟพฤติกรรมการเงินรายวัน (Daily Financial Trends)
              </h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* (1) กราฟรายรับ */}
              <div className="bg-white p-4 border border-gray-150 rounded-2xl shadow-2xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">กราฟรายรับรายวัน</span>
                  <span className="text-[11px] font-mono text-emerald-600 font-bold">
                    รวม ฿{formatNumber(totalRangeIncome)}
                  </span>
                </div>
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
              <div className="bg-white p-4 border border-gray-150 rounded-2xl shadow-2xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">กราฟรายจ่ายรายวัน (ทั่วไป + Out-Lab)</span>
                  <span className="text-[11px] font-mono text-rose-600 font-bold">
                    รวม ฿{formatNumber(totalRangeExpense)}
                  </span>
                </div>
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
