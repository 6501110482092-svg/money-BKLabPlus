/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabTestTemplate } from './types';

export const DEFAULT_LAB_TESTS: LabTestTemplate[] = [];

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
