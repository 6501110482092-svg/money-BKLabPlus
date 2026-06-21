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

export interface DailyRecord {
  date: string; // รูปแบบ YYYY-MM-DD
  incomeItems: IncomeItem[];
  expenseItems: ExpenseItem[];
  outLabItems: OutLabItem[];
  hasOutLab: boolean; // true = มีส่งแล็บ, false = ไม่มีส่งแล็บ (ยอด Out-Lab จะถูกจำลองเป็น 0)
  cashCheck: CashCheckData;
  updatedAt?: string; // วันที่เวลาอัปเดตล่าสุดสำหรับการซิงค์เรียลไทม์
}

export interface LabTestTemplate {
  id: string;
  name: string;
  defaultPrice: number;
}
