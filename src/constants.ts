/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabTestTemplate, Business } from './types';

export const DEFAULT_LAB_TESTS: LabTestTemplate[] = [];

export const DEFAULT_BUSINESSES: Business[] = [
  {
    id: 'clinic-main',
    name: 'คลินิกเวชกรรม / แผนกแพทย์',
    code: 'CLN',
    description: 'บันทึกตรวจโรค ตรวจสุขภาพทั่วไป ค่ายาและการรักษา',
    color: 'emerald',
    isDefault: true,
    fixCosts: [
      { id: 'fix-1', name: 'ค่าเช่าสถานที่ / คลินิก', amount: 15000 },
      { id: 'fix-2', name: 'ค่าไฟฟ้า (ผันแปร)', amount: 0 },
      { id: 'fix-3', name: 'ค่าน้ำประปา', amount: 350 },
      { id: 'fix-4', name: 'ค่าอินเทอร์เน็ตคลินิก', amount: 799 },
    ],
  },
  {
    id: 'lab-medical',
    name: 'ห้องปฏิบัติการเทคนิคการแพทย์ (แล็บ)',
    code: 'LAB',
    description: 'วิเคราะห์โลหิตวิทยา เคมีคลินิก และแล็บส่งนอก (Out-Lab)',
    color: 'blue',
    fixCosts: [
      { id: 'fix-lab-1', name: 'ค่าบำรุงรักษาเครื่องตรวจวิเคราะห์', amount: 5000 },
      { id: 'fix-lab-2', name: 'ค่าไฟฟ้าห้องแล็บ (ผันแปร)', amount: 0 },
      { id: 'fix-lab-3', name: 'ค่าซอฟต์แวร์ระบบ LIS / รายเดือน', amount: 1200 },
    ],
  },
  {
    id: 'company-sub',
    name: 'บริษัท / คลินิกสาขา 2',
    code: 'BR2',
    description: 'สาขาบริการเสริมและตรวจสุขภาพเคลื่อนที่',
    color: 'purple',
    fixCosts: [
      { id: 'fix-sub-1', name: 'ค่าเช่าสถานที่สาขา 2', amount: 8000 },
      { id: 'fix-sub-2', name: 'ค่าไฟฟ้าสาขา (ผันแปร)', amount: 0 },
    ],
  },
];

export function getBusinessColorClasses(color?: string): {
  bg: string;
  text: string;
  border: string;
  badge: string;
  dot: string;
} {
  switch (color) {
    case 'blue':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        badge: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
        dot: 'bg-blue-500',
      };
    case 'purple':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        badge: 'bg-purple-500/20 text-purple-400 border-purple-400/30',
        dot: 'bg-purple-500',
      };
    case 'amber':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
        dot: 'bg-amber-500',
      };
    case 'rose':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-705',
        border: 'border-rose-200',
        badge: 'bg-rose-500/20 text-rose-400 border-rose-400/30',
        dot: 'bg-rose-500',
      };
    case 'cyan':
      return {
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
        border: 'border-cyan-200',
        badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30',
        dot: 'bg-cyan-500',
      };
    case 'indigo':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-400/30',
        dot: 'bg-indigo-500',
      };
    case 'emerald':
    default:
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
        dot: 'bg-emerald-500',
      };
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumberNoDec(value: number): string {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * คำนวณวันสุดท้ายของเดือนในรูปแบบ YYYY-MM-DD
 */
export function getLastDayOfMonth(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12
  // วันที่ 0 ของเดือนถัดไป คือวันสุดท้ายของเดือนปัจจุบัน
  const lastDay = new Date(year, month, 0).getDate();
  return `${parts[0]}-${parts[1]}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * ตรวจสอบว่าวันที่ที่ส่งเข้ามาเป็นวันสุดท้ายของเดือนหรือไม่
 */
export function isLastDayOfMonth(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr === getLastDayOfMonth(dateStr);
}
