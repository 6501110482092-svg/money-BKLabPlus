/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyRecord, LabTestTemplate } from '../types';
import { DEFAULT_LAB_TESTS } from '../constants';

const RECORDS_KEY = 'bklabplus_records';
const LAB_TESTS_KEY = 'bklabplus_labtests';

export function loadAllRecords(): Record<string, DailyRecord> {
  try {
    const data = localStorage.getItem(RECORDS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading records', error);
    return {};
  }
}

export function saveAllRecords(records: Record<string, DailyRecord>) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    // อัปโหลดขึ้นเซิร์ฟเวอร์แบบแบคกราวด์ทันทีเพื่ออัปเดตเรียลไทม์ไปยังเครื่องอื่น
    uploadRecordsToServer(records);
  } catch (error) {
    console.error('Error saving records', error);
  }
}

export async function uploadRecordsToServer(records: Record<string, DailyRecord>) {
  try {
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records)
    });
  } catch (e) {
    console.warn('Error uploading records to server (will retry later)', e);
  }
}

export async function syncRecordsWithServer(): Promise<Record<string, DailyRecord> | null> {
  try {
    const local = loadAllRecords();
    const res = await fetch('/api/records');
    if (!res.ok) throw new Error('Server offline or network error');
    const serverRecords = await res.json() as Record<string, DailyRecord>;

    // ผสานข้อมูล (Merge) เพื่อป้องกันข้อมูลสูญหาย: เอาข้อมูลที่มีอยู่ทั้งสองฝั่งมารวมกัน
    const merged = { ...local, ...serverRecords };

    // บันทึกลงเครื่อง
    localStorage.setItem(RECORDS_KEY, JSON.stringify(merged));

    // อัปเดตฝั่งเซิร์ฟเวอร์เพื่อให้ข้อมูลตรงกันทั้งหมด
    if (JSON.stringify(merged) !== JSON.stringify(serverRecords)) {
      await uploadRecordsToServer(merged);
    }

    return merged;
  } catch (error) {
    console.warn('Real-time sync records error (using local storage):', error);
    return null;
  }
}

export function loadDailyRecord(date: string): DailyRecord {
  const records = loadAllRecords();
  if (records[date]) {
    return records[date];
  }
  // ถ้ายังไม่มี ให้สร้างค่าเริ่มต้นของวันนั้นๆ
  return {
    date,
    incomeItems: [],
    expenseItems: [],
    outLabItems: [],
    hasOutLab: true,
    cashCheck: {
      countedCash: 0,
      note: '',
      isSaved: false,
    },
  };
}

export function saveDailyRecord(date: string, record: DailyRecord) {
  const records = loadAllRecords();
  records[date] = record;
  saveAllRecords(records);
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
    uploadLabTestsToServer(tests);
  } catch (error) {
    console.error('Error saving lab tests', error);
  }
}

export async function uploadLabTestsToServer(tests: LabTestTemplate[]) {
  try {
    await fetch('/api/labtests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tests)
    });
  } catch (e) {
    console.warn('Error uploading lab tests to server', e);
  }
}

export async function syncLabTestsWithServer(): Promise<LabTestTemplate[] | null> {
  try {
    const local = loadLabTests();
    const res = await fetch('/api/labtests');
    if (!res.ok) throw new Error('Server offline');
    const serverTests = await res.json() as LabTestTemplate[];

    if (serverTests && serverTests.length > 0) {
      localStorage.setItem(LAB_TESTS_KEY, JSON.stringify(serverTests));
      return serverTests;
    } else {
      if (local && local.length > 0) {
        await uploadLabTestsToServer(local);
      }
    }
    return local;
  } catch (error) {
    console.warn('Real-time sync lab tests error:', error);
    return null;
  }
}
