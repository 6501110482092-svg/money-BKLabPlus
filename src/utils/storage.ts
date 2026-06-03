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
  } catch (error) {
    console.error('Error saving records', error);
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
  } catch (error) {
    console.error('Error saving lab tests', error);
  }
}
