/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyRecord, LabTestTemplate } from '../types';
import { DEFAULT_LAB_TESTS } from '../constants';
import { saveRecordToFirebase, saveLabTestsToFirebase } from './firebase';

const RECORDS_KEY = 'bklabplus_records';
const LAB_TESTS_KEY = 'bklabplus_labtests';


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
  } catch (error) {
    console.error('Error saving records', error);
  }
}

export async function uploadRecordsToServer(records: Record<string, DailyRecord>) {
  // ฟังก์ชันสแตนด์บาย REST: ย้ายไปใช้ Firestore เป็นฐานข้อมูลหลักคลาวด์ 100% แล้ว
}

export async function syncRecordsWithServer(): Promise<Record<string, DailyRecord> | null> {
  // บังคับคืนค่าว่างเพื่อเลี่ยงการดึงข้อมูลทับระบบคลาวด์จริงของ Firestore
  return null;
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
  const recordWithTimestamp = {
    ...record,
    updatedAt: new Date().toISOString()
  };
  records[date] = recordWithTimestamp;
  // Save locally and background sync with backup REST server
  saveAllRecords(records);
  // Real-time Sync to Firebase Firestore specific to this modified record date!
  saveRecordToFirebase(date, recordWithTimestamp);
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
