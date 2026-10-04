/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IncomeItem {
  id: string;
  description: string;
  amount: number;
  type: 'cash' | 'transfer';
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  type?: 'cash' | 'transfer'; // ช่องทางการจ่าย: 'cash' = จ่ายเงินสด, 'transfer' = จ่ายเงินโอน (ค่าเริ่มต้นเป็น 'cash')
}

export interface OutLabItem {
  id: string;
  labNumber: string; // LN (Lab Number)
  testName: string;   // Test จากระบบ Autocomplete หรือพิมพ์เอง
  amount: number;     // จำนวนเงิน
}

export interface CashCheckData {
  countedCash: number; // เงินสดที่นับได้
  note: string;        // หมายเหตุถ้าไม่ตรง
  isSaved: boolean;    // สถานะการบันทึก
}

export interface PeriodCashCheckRecord {
  startDate: string;
  endDate: string;
  businessId: string;
  countedCash: number;
  expectedCash: number;
  diff: number;
  note: string;
  savedAt: string;
}

export interface DailyRecord {
  date: string; // รูปแบบ YYYY-MM-DD
  businessId?: string; // รหัสธุรกิจ/บริษัท เพื่อแยกบันทึกไม่ให้ปนกัน
  incomeItems: IncomeItem[];
  expenseItems: ExpenseItem[];
  outLabItems: OutLabItem[];
  hasOutLab: boolean; // true = มีส่งแล็บ, false = ไม่มีส่งแล็บ (ยอด Out-Lab จะถูกจำลองเป็น 0)
  cashCheck: CashCheckData;
  updatedAt?: string; // วันที่เวลาอัปเดตล่าสุดสำหรับการซิงค์เรียลไทม์
}

export interface FixCostItem {
  id: string;
  name: string; // ชื่อรายการ เช่น ค่าเช่าคลินิก, ค่าไฟฟ้า, ค่าอินเทอร์เน็ต, เงินเดือนพนักงาน
  amount?: number; // จำนวนเงิน หากไม่ระบุ หรือ 0 หมายถึงยอดผันแปร เช่น ค่าไฟ ให้ผู้ใช้ไปกรอกทีหลัง
  note?: string; // หมายเหตุเพิ่มเติม
  type?: 'cash' | 'transfer'; // ช่องทางการจ่าย: 'cash' = เงินสด, 'transfer' = เงินโอน (ค่าเริ่มต้นเป็น 'cash')
  dueDay?: number | 'last_day'; // วันที่ในแต่ละเดือนที่กำหนดให้ลงบัญชีอัตโนมัติ: 'last_day' (วันสิ้นเดือน) หรือ 1 - 31 (ค่าเริ่มต้น: 'last_day')
  showInReport?: boolean; // แสดง/ลงในรายงาน: true = แสดง, false = ไม่แสดง (ค่าเริ่มต้น: true)
}

export interface Business {
  id: string;
  name: string;
  code?: string;
  description?: string;
  color?: string; // 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'indigo' | 'cyan'
  logoUrl?: string; // รูปภาพโลโก้ประจำธุรกิจ/คลินิก (Base64 Data URL หรือ Image URL)
  isDefault?: boolean;
  createdAt?: string;
  fixCosts?: FixCostItem[]; // รายการค่าใช้จ่ายประจำเดือน (Fix Costs)
}

export interface LabTestTemplate {
  id: string;
  name: string;
  defaultPrice: number;
}
