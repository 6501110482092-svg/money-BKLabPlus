/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyRecord, LabTestTemplate, Business, PeriodCashCheckRecord } from '../types';
import { DEFAULT_LAB_TESTS, DEFAULT_BUSINESSES, isLastDayOfMonth } from '../constants';
import { saveRecordToFirebase, saveLabTestsToFirebase, saveBusinessesToFirebase } from './firebase';

const RECORDS_KEY = 'bklabplus_records';
const LAB_TESTS_KEY = 'bklabplus_labtests';
const BUSINESSES_KEY = 'bklabplus_businesses';
const ACTIVE_BUSINESS_KEY = 'bklabplus_active_business';

// จัดการรายชื่อบริษัท / ธุรกิจ
export function loadBusinesses(): Business[] {
  try {
    const data = localStorage.getItem(BUSINESSES_KEY);
    if (!data) {
      localStorage.setItem(BUSINESSES_KEY, JSON.stringify(DEFAULT_BUSINESSES));
      return DEFAULT_BUSINESSES;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // ล้างข้อมูลดัมมี่ Fix Costs อัตโนมัติ (เช่น fix-lab-1, fix-1) ถ้าผู้ใช้ไม่ได้ตั้งใจเพิ่มเอง
      const cleaned = parsed.map((b: Business) => {
        const fc = (b.fixCosts || []).filter(
          (item) => !item.id.startsWith('fix-') || item.id.startsWith('fix-user-')
        );
        return { ...b, fixCosts: fc };
      });
      return cleaned;
    }
    return DEFAULT_BUSINESSES;
  } catch (error) {
    console.error('Error loading businesses', error);
    return DEFAULT_BUSINESSES;
  }
}

export function saveBusinesses(businesses: Business[]) {
  try {
    localStorage.setItem(BUSINESSES_KEY, JSON.stringify(businesses));
    saveBusinessesToFirebase(businesses);
  } catch (error) {
    console.error('Error saving businesses', error);
  }
}

export function loadActiveBusinessId(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_BUSINESS_KEY);
    if (saved) return saved;
    const businesses = loadBusinesses();
    return businesses[0]?.id || 'clinic-main';
  } catch (error) {
    return 'clinic-main';
  }
}

export function saveActiveBusinessId(id: string) {
  try {
    localStorage.setItem(ACTIVE_BUSINESS_KEY, id);
  } catch (error) {
    console.error('Error saving active business id', error);
  }
}

// ดึง Base URL อัตโนมัติให้เครื่องอื่นชี้มาที่ Cloud Run ได้พอร์ตตรงกันแม้เปิดจาก Vercel หรือสมาร์ทโฟน
export function getApiUrl(endpoint: string): string {
  const origin = window.location.origin;
  const isCloudRunOrLocal = origin.includes('asia-east1.run.app') || origin.includes('localhost') || origin.includes('127.0.0.1');
  if (isCloudRunOrLocal) {
    return endpoint;
  }
  // URL หลักของเซิร์ฟเวอร์สำรองบน Cloud Run 
  const backendBase = 'https://ais-pre-j4rvcnyqui2upprrutnqz5-749090705145.asia-east1.run.app';
  return `${backendBase}${endpoint}`;
}

export function loadAllRecords(businessId?: string): Record<string, DailyRecord> {
  try {
    const targetBizId = businessId || 'clinic-main';
    const key = `${RECORDS_KEY}_${targetBizId}`;
    const data = localStorage.getItem(key);
    let parsed: Record<string, DailyRecord> = data ? JSON.parse(data) : {};

    // ตรวจสอบและดึงข้อมูลเดิม (Legacy records) เผื่อไว้เสมอ เพื่อไม่ให้ข้อมูลหายเวลาสลับธุรกิจไปมา
    const legacyData = localStorage.getItem(RECORDS_KEY);
    if (legacyData) {
      try {
        const legacyParsed = JSON.parse(legacyData);
        if (legacyParsed && typeof legacyParsed === 'object') {
          // ดึงเฉพาะข้อมูลของธุรกิจนั้น หรือถ้าเป็น clinic-main ให้ดึงข้อมูลทั้งหมดที่ไม่มี businessId ระบุชัดเจน
          Object.keys(legacyParsed).forEach((d) => {
            const rec = legacyParsed[d];
            if (rec) {
              const recBizId = rec.businessId || 'clinic-main';
              if (recBizId === targetBizId && !parsed[d]) {
                parsed[d] = { ...rec, businessId: targetBizId };
              }
            }
          });
        }
      } catch (err) {
        // ignore legacy parse error
      }
    }

    return parsed;
  } catch (error) {
    console.error('Error loading records', error);
    return {};
  }
}

export function saveAllRecords(records: Record<string, DailyRecord>, businessId?: string) {
  try {
    const targetBizId = businessId || 'clinic-main';
    const key = `${RECORDS_KEY}_${targetBizId}`;
    localStorage.setItem(key, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving records', error);
  }
}

/**
 * ดึงข้อมูลเรคคอร์ดทั้งหมดแยกตามบริษัทในคราวเดียว เพื่อให้สลับไปมาได้ลื่นไหล ไม่ต้องรอ
 */
export function loadAllRecordsByBusiness(): Record<string, Record<string, DailyRecord>> {
  try {
    const businesses = loadBusinesses();
    const byBiz: Record<string, Record<string, DailyRecord>> = {};

    businesses.forEach((b) => {
      byBiz[b.id] = loadAllRecords(b.id);
    });

    if (!byBiz['clinic-main']) {
      byBiz['clinic-main'] = loadAllRecords('clinic-main');
    }

    return byBiz;
  } catch (error) {
    console.error('Error loading all records by business', error);
    return { 'clinic-main': loadAllRecords('clinic-main') };
  }
}

export async function uploadRecordsToServer(records: Record<string, DailyRecord>) {
  // ฟังก์ชันสแตนด์บาย REST: ย้ายไปใช้ Firestore เป็นฐานข้อมูลหลักคลาวด์ 100% แล้ว
}

export async function syncRecordsWithServer(): Promise<Record<string, DailyRecord> | null> {
  // บังคับคืนค่าว่างเพื่อเลี่ยงการดึงข้อมูลทับระบบคลาวด์จริงของ Firestore
  return null;
}

export function deduplicateExpenseItems(items: any[]): any[] {
  if (!items || items.length <= 1) return items || [];
  const map = new Map<string, any>();
  for (const item of items) {
    const descKey = (item.description || '').trim().toLowerCase();
    if (!descKey) {
      map.set(item.id || Math.random().toString(), item);
      continue;
    }
    if (!map.has(descKey)) {
      map.set(descKey, item);
    } else {
      const existing = map.get(descKey)!;
      if ((!existing.amount || existing.amount === 0) && item.amount && item.amount > 0) {
        map.set(descKey, item);
      }
    }
  }
  return Array.from(map.values());
}

export function loadDailyRecord(date: string, businessId?: string): DailyRecord {
  const targetBizId = businessId || 'clinic-main';
  const records = loadAllRecords(targetBizId);
  const businesses = loadBusinesses();
  const currentBiz = businesses.find((b) => b.id === targetBizId) || businesses[0];
  const fixCosts = currentBiz?.fixCosts || [];

  if (records[date]) {
    const existing = records[date];
    const cleanedExpenses = deduplicateExpenseItems(existing.expenseItems || []);

    // ถ้าเป็นวันสิ้นเดือน และมี fix costs ที่ยังไม่เคยลงใน record ให้เติมเพิ่มไว้รอ (ไม่มีรายการซ้ำเด็ดขาด)
    if (isLastDayOfMonth(date) && fixCosts.length > 0) {
      const existingNames = new Set(
        cleanedExpenses.map((item) => (item.description || '').trim().toLowerCase())
      );
      const missing = fixCosts.filter((fc) => !existingNames.has(fc.name.trim().toLowerCase()));
      if (missing.length > 0) {
        const injected = missing.map((fc, idx) => ({
          id: `fix-${fc.id || Date.now()}-${idx}`,
          description: fc.name,
          amount: fc.amount || 0,
        }));
        return {
          ...existing,
          expenseItems: deduplicateExpenseItems([...cleanedExpenses, ...injected]),
        };
      }
    }
    return {
      ...existing,
      expenseItems: cleanedExpenses,
    };
  }

  // ถ้ายังไม่มี และเป็นวันสิ้นเดือน ให้ใส่ fix costs ไว้รอเลย
  const initialExpenseItems =
    isLastDayOfMonth(date) && fixCosts.length > 0
      ? deduplicateExpenseItems(
          fixCosts.map((fc, idx) => ({
            id: `fix-${fc.id || Date.now()}-${idx}`,
            description: fc.name,
            amount: fc.amount || 0,
          }))
        )
      : [];

  return {
    date,
    businessId: targetBizId,
    incomeItems: [],
    expenseItems: initialExpenseItems,
    outLabItems: [],
    hasOutLab: true,
    cashCheck: {
      countedCash: 0,
      note: '',
      isSaved: false,
    },
  };
}

export function saveDailyRecord(date: string, record: DailyRecord, businessId?: string) {
  const targetBizId = businessId || record.businessId || 'clinic-main';
  const records = loadAllRecords(targetBizId);
  const recordWithTimestamp: DailyRecord = {
    ...record,
    businessId: targetBizId,
    date,
    updatedAt: new Date().toISOString()
  };
  records[date] = recordWithTimestamp;
  // Save locally per business
  saveAllRecords(records, targetBizId);

  // บันทึกซิงค์สำรองคีย์หลักเพื่อความเข้ากันได้
  if (targetBizId === 'clinic-main') {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    } catch (e) {
      // ignore
    }
  }

  // Real-time Sync to Firebase Firestore specific to this modified record date and business!
  saveRecordToFirebase(date, recordWithTimestamp, targetBizId);
}

export function loadLabTests(): LabTestTemplate[] {
  try {
    const data = localStorage.getItem(LAB_TESTS_KEY);
    if (!data) {
      localStorage.setItem(LAB_TESTS_KEY, JSON.stringify(DEFAULT_LAB_TESTS));
      return DEFAULT_LAB_TESTS;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading lab tests', error);
    return DEFAULT_LAB_TESTS;
  }
}

export function saveLabTests(tests: LabTestTemplate[]) {
  try {
    localStorage.setItem(LAB_TESTS_KEY, JSON.stringify(tests));
    // อัปเดตสูตรชุดตรวจไปยัง Firebase Firestore แบบเรียลไทม์ 100%
    saveLabTestsToFirebase(tests);
  } catch (error) {
    console.error('Error saving lab tests', error);
  }
}

export async function uploadLabTestsToServer(tests: LabTestTemplate[]) {
  // ฟังก์ชันสแตนด์บาย REST: ย้ายไปใช้ Firestore เป็นฐานข้อมูลหลักคลาวด์ 100% แล้ว
}

export async function syncLabTestsWithServer(): Promise<LabTestTemplate[] | null> {
  return null;
}

// ตรวจสอบและบันทึกการนับเงินสดประจำช่วงเวลา / ประจำเดือน
export function loadPeriodCashCheck(startDate: string, endDate: string, businessId?: string): PeriodCashCheckRecord | null {
  try {
    const bId = businessId || 'clinic-main';
    const key = `bklabplus_period_cash_${bId}_${startDate}_${endDate}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function savePeriodCashCheck(record: PeriodCashCheckRecord) {
  try {
    const key = `bklabplus_period_cash_${record.businessId}_${record.startDate}_${record.endDate}`;
    localStorage.setItem(key, JSON.stringify(record));

    // บันทึกเข้าประวัติการตรวจนับช่วงเวลา
    const historyKey = `bklabplus_period_cash_history_${record.businessId}`;
    const existingHistoryStr = localStorage.getItem(historyKey);
    let history: PeriodCashCheckRecord[] = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
    history = history.filter((h) => !(h.startDate === record.startDate && h.endDate === record.endDate));
    history.unshift(record);
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving period cash check', e);
  }
}

