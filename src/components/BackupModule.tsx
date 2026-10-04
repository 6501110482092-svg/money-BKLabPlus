/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldCheck,
  Lock,
  Unlock,
  Download,
  Upload,
  KeyRound,
  HardDrive,
  FileJson,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Calendar,
  Building2,
  X,
} from 'lucide-react';
import { exportAllDataBackup, restoreDataBackup, loadBusinesses, loadAllRecordsByBusiness, loadLabTests } from '../utils/storage';
import { getTodayDateString, formatNumber } from '../constants';

const BACKUP_PASSCODE = '140763';
const SESSION_AUTH_KEY = 'bklabplus_backup_unlocked';

interface BackupModuleProps {
  onNavigateTab?: (tab: string) => void;
}

export default function BackupModule({ onNavigateTab }: BackupModuleProps) {
  // ตรวจสอบสิทธิ์การปลดล็อกในเซสชันปัจจุบัน
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
  });

  const [inputCode, setInputCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [shakeAnimation, setShakeAnimation] = useState<boolean>(false);

  // สเตทสำหรับงานสำรอง/กู้คืน
  const [backupStats, setBackupStats] = useState<{
    totalDays: number;
    totalBusinesses: number;
    totalLabTests: number;
    sizeBytes: number;
  } | null>(null);

  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error';
    title: string;
    text: string;
  } | null>(null);

  // คำนวณสถิติเมื่อปลดล็อกแล้ว
  useEffect(() => {
    if (isUnlocked) {
      try {
        const { stats } = exportAllDataBackup();
        setBackupStats(stats);
      } catch (e) {
        console.error('Failed to compute stats', e);
      }
    }
  }, [isUnlocked]);

  // จัดการการส่งรหัสผ่าน
  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputCode.trim() === BACKUP_PASSCODE) {
      setIsUnlocked(true);
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      setErrorMessage('');
      setInputCode('');
    } else {
      setErrorMessage('รหัสผ่านไม่ถูกต้อง กรุณาระบุรหัสผ่าน 6 หลักให้ถูกต้อง');
      setShakeAnimation(true);
      setTimeout(() => setShakeAnimation(false), 600);
    }
  };

  // จัดการล็อกระบบกลับ
  const handleLock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    setInputCode('');
    setErrorMessage('');
  };

  // ฟังก์ชันดาวน์โหลดไฟล์สำรอง JSON ทั้งหมด
  const handleExportJSON = () => {
    try {
      const { jsonString, stats } = exportAllDataBackup();
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = getTodayDateString();
      link.href = url;
      link.download = `BKLabPlus_FullBackup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupStats(stats);
      setActionNotice({
        type: 'success',
        title: 'ดาวน์โหลดไฟล์สำรอง (.json) สำเร็จเรียบร้อย',
        text: `บันทึกข้อมูลแล้ว ${stats.totalDays} วัน (${(stats.sizeBytes / 1024).toFixed(1)} KB) ครบถ้วนทุกบริษัทและชุดตรวจ แนะนำให้เก็บไฟล์นี้ไว้ใน Google Drive หรือ Flash Drive`,
      });
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการสร้างไฟล์สำรอง',
        text: err?.message || 'ไม่สามารถส่งออกข้อมูลได้',
      });
    }
  };

  // ฟังก์ชันส่งออกเป็นไฟล์ CSV ตารางสรุปภาพรวม
  const handleExportCSV = () => {
    try {
      const businesses = loadBusinesses();
      const allRecordsByBiz = loadAllRecordsByBusiness();
      
      const rows: string[] = [];
      rows.push(['วันที่', 'รหัสธุรกิจ', 'ชื่อธุรกิจ', 'ยอดรับเงินสด', 'ยอดรับโอน', 'รายรับรวม', 'ยอดจ่ายเงินสด', 'ยอดจ่ายโอน', 'ค่าแล็บนอก', 'รายจ่ายรวม', 'กำไรสุทธิ'].join(','));

      businesses.forEach((biz) => {
        const records = allRecordsByBiz[biz.id] || {};
        const dates = Object.keys(records).sort();
        dates.forEach((d) => {
          const rec = records[d];
          if (!rec) return;

          let cashInc = 0;
          let transInc = 0;
          (rec.incomeItems || []).forEach((inc) => {
            if (inc.type === 'cash') cashInc += inc.amount || 0;
            else transInc += inc.amount || 0;
          });
          const totalInc = cashInc + transInc;

          let cashExp = 0;
          let transExp = 0;
          let labExp = 0;
          (rec.expenseItems || []).forEach((exp) => {
            if (exp.type === 'transfer') transExp += exp.amount || 0;
            else cashExp += exp.amount || 0;
          });
          if (rec.hasOutLab !== false) {
            (rec.outLabItems || []).forEach((lab) => {
              labExp += lab.amount || 0;
            });
          }
          const totalExp = cashExp + transExp + labExp;
          const net = totalInc - totalExp;

          rows.push([
            `"${d}"`,
            `"${biz.id}"`,
            `"${biz.name}"`,
            cashInc,
            transInc,
            totalInc,
            cashExp,
            transExp,
            labExp,
            totalExp,
            net
          ].join(','));
        });
      });

      const csvContent = '\uFEFF' + rows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BKLabPlus_AuditSummary_${getTodayDateString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setActionNotice({
        type: 'success',
        title: 'ส่งออกไฟล์สรุปบัญชี CSV สำเร็จ',
        text: 'สามารถนำไฟล์นี้ไปเปิดดูใน Microsoft Excel หรือ Google Sheets เพื่อตรวจสอบและทำบัญชีภาษีได้ทันที',
      });
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการส่งออก CSV',
        text: err?.message || 'ไม่สามารถส่งออก CSV ได้',
      });
    }
  };

  // ฟังก์ชันกู้คืนข้อมูลจากไฟล์สำรอง JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const confirmed = window.confirm(
          'คำเตือนด้านความปลอดภัย:\n\nการกู้คืนข้อมูลจะนำข้อมูลจากไฟล์สำรองมาอัปเดตทับลงในระบบและ Cloud Firestore\nคุณต้องการดำเนินการต่อหรือไม่?'
        );
        if (!confirmed) {
          e.target.value = '';
          return;
        }

        const res = restoreDataBackup(content);
        if (res.success) {
          setActionNotice({
            type: 'success',
            title: 'กู้คืนข้อมูลสำเร็จเรียบร้อย!',
            text: res.message + ' ระบบกำลังทำการรีเฟรชข้อมูลล่าสุด...',
          });
          setTimeout(() => {
            window.location.reload();
          }, 1800);
        } else {
          setActionNotice({
            type: 'error',
            title: 'การกู้คืนข้อมูลล้มเหลว',
            text: res.message,
          });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 1. ถ้ายังไม่ได้ปลดล็อก: แสดงหน้าจอป้อนรหัสผ่าน (Passcode Lock Screen)
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-8 p-4">
        <div className={`bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden ${shakeAnimation ? 'animate-bounce' : ''}`}>
          {/* ส่วนหัวหน้าจอล็อก */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 text-center text-white relative">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
              <Lock className="text-amber-400" size={32} />
            </div>
            <h2 className="text-xl font-black tracking-tight">ศูนย์สำรองข้อมูลระยะยาว 20-50 ปี</h2>
            <p className="text-xs text-slate-300 mt-1.5 font-medium">
              Data Retention & Backup Center
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-semibold">
              <KeyRound size={13} />
              <span>โหมดความปลอดภัยสูง (ต้องใช้รหัสผ่าน)</span>
            </div>
          </div>

          {/* ฟอร์มป้อนรหัสผ่าน */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                กรุณาระบุรหัสผ่านเพื่อเข้าสู่ศูนย์ข้อมูล
              </label>
              <p className="text-[11px] text-slate-400">
                จำกัดเฉพาะผู้บริหารหรือผู้ดูแลระบบที่ได้รับอนุญาต
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  maxLength={10}
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="ป้อนรหัสผ่าน 6 หลัก..."
                  autoFocus
                  className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 rounded-xl border-2 border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-95 text-white font-extrabold text-sm py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock size={18} />
                <span>ปลดล็อกเข้าสู่ศูนย์สำรองข้อมูล</span>
              </button>
            </form>

            {/* แป้นพิมพ์ตัวเลขสัมผัส (Touch PIN Pad) สะดวกบนมือถือ/แท็บเล็ต */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] text-center text-slate-400 mb-2 font-medium">แป้นปุ่มกดรหัสตัวเลขด่วน</p>
              <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (inputCode.length < 10) setInputCode(prev => prev + num);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="h-11 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-base font-bold font-mono text-slate-700 transition-all cursor-pointer shadow-2xs"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setInputCode('')}
                  className="h-11 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 transition-all cursor-pointer"
                >
                  ล้าง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (inputCode.length < 10) setInputCode(prev => prev + '0');
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="h-11 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-base font-bold font-mono text-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setInputCode(prev => prev.slice(0, -1))}
                  className="h-11 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
                >
                  ⌫ ลบ
                </button>
              </div>
            </div>

            <div className="text-center">
              <span className="text-[10px] text-slate-400">
                🔒 รหัสผ่านถูกตั้งค่าความปลอดภัยไว้สำหรับระบบ BKLAB+
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. เมื่อปลดล็อกแล้ว: แสดงหน้าต่าง Dashboard ศูนย์สำรองข้อมูลเต็มรูปแบบ
  return (
    <div className="space-y-6">
      {/* การ์ดแบนเนอร์ด้านบนพร้อมปุ่มล็อกออก */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/15 shadow-inner">
              <Database className="text-emerald-400" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  ศูนย์สำรองข้อมูลระยะยาว 20-50 ปี
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <Unlock size={12} />
                  <span>ปลดล็อกแล้ว</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Data Retention & Enterprise Backup Vault • รองรับการจัดเก็บข้อมูลต่อเนื่อง 20 ถึง 50+ ปี ปลอดภัยบน Google Cloud Firestore และไฟล์สำรองในเครื่องของคุณ
              </p>
            </div>
          </div>

          {/* ปุ่มล็อกระบบเพื่อความปลอดภัย */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleLock}
              className="flex items-center gap-2 bg-white/10 hover:bg-rose-600/80 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/15 transition-all shadow-sm cursor-pointer"
              title="ล็อกโหมดนี้ทันที เพื่อไม่ให้ผู้อื่นเข้าถึงโดยไม่ใส่รหัสผ่าน"
            >
              <Lock size={15} />
              <span>ล็อกโหมดนี้ (Lock)</span>
            </button>
          </div>
        </div>
      </div>

      {/* แจ้งเตือนการดำเนินการ (Notice Box) */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all shadow-sm ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
            ) : (
              <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
            )}
            <div>
              <h4 className="text-xs font-bold">{actionNotice.title}</h4>
              <p className="text-xs mt-0.5 leading-relaxed text-slate-700">{actionNotice.text}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* สถิติตรวจสอบพื้นที่และการประเมิน 20-50 ปี */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>วันที่บันทึกในระบบ</span>
            <Calendar size={16} className="text-blue-500" />
          </div>
          <span className="text-2xl font-black text-slate-800 font-mono block">
            {backupStats?.totalDays.toLocaleString() || '0'} วัน
          </span>
          <p className="text-[10px] text-slate-400 font-medium">นับรวมทุกบริษัทและแผนก</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ขนาดข้อมูลปัจจุบัน</span>
            <HardDrive size={16} className="text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-700 font-mono block">
            {backupStats ? `${(backupStats.sizeBytes / 1024).toFixed(1)} KB` : '0 KB'}
          </span>
          <p className="text-[10px] text-emerald-600 font-medium">ปลอดภัย ไม่กินความจุเครื่อง</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ประมาณการ 20 ปี</span>
            <Sparkles size={16} className="text-indigo-500" />
          </div>
          <span className="text-2xl font-black text-indigo-700 font-mono block">
            ~25 MB
          </span>
          <p className="text-[10px] text-indigo-600 font-medium">7,300 วัน (~0.025 GB)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ประมาณการ 50 ปี</span>
            <ShieldCheck size={16} className="text-purple-500" />
          </div>
          <span className="text-2xl font-black text-purple-700 font-mono block">
            ~65 MB
          </span>
          <p className="text-[10px] text-purple-600 font-medium">18,250 วัน (ไม่เกิน 0.1 GB)</p>
        </div>
      </div>

      {/* แผงปุ่มดำเนินการสำรองและกู้คืน (Action Hub) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <HardDrive className="text-indigo-600" size={20} />
              <span>เครื่องมือสำรองข้อมูล & กู้คืนระบบ (Backup & Restore Tools)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ส่งออกสำรองข้อมูลเก็บไว้ในอุปกรณ์ของคุณ หรือนำเข้าข้อมูลเดิมกลับมาใช้งานได้ตลอดเวลา
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* การ์ด 1: ดาวน์โหลด JSON Backup ครบวงจร */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <FileJson size={22} />
              </div>
              <h4 className="font-bold text-sm text-slate-800">1. สำรองข้อมูลระบบทั้งหมด (.json)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                ดาวน์โหลดข้อมูลทั้งหมดของทุกบริษัท, ข้อมูลรายรับ-รายจ่ายย้อนหลังทุกวัน, และชุดตรวจแล็บ เก็บเป็นไฟล์ JSON มาตรฐานความปลอดภัยสูง
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={16} />
              <span>ดาวน์โหลดไฟล์สำรอง (.json)</span>
            </button>
          </div>

          {/* การ์ด 2: ส่งออก Excel / CSV สำหรับงานบัญชี */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <FileSpreadsheet size={22} />
              </div>
              <h4 className="font-bold text-sm text-slate-800">2. ส่งออกตารางบัญชี (.csv / Excel)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                ส่งออกสรุปยอดรายรับ รายจ่าย กำไรสุทธิของทุกวันเป็นไฟล์ CSV สามารถเปิดดูและคำนวณภาษีใน Microsoft Excel หรือ Google Sheets ได้
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={16} />
              <span>ส่งออกไฟล์บัญชี (.csv)</span>
            </button>
          </div>

          {/* การ์ด 3: กู้คืนข้อมูลจากไฟล์สำรอง */}
          <div className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Upload size={22} />
              </div>
              <h4 className="font-bold text-sm text-slate-800">3. กู้คืนข้อมูลจากไฟล์สำรอง</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                นำไฟล์ JSON ที่เคยสำรองไว้กลับมาบันทึกลงในระบบและซิงค์ขึ้น Cloud Firebase ใช้ในกรณีเปลี่ยนเครื่องใหม่ หรือต้องการนำข้อมูลเก่ากลับมา
              </p>
            </div>
            <label className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer text-center">
              <Upload size={16} />
              <span>เลือกไฟล์สำรองเพื่อกู้คืน</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* คำตอบและแนวทางปฏิบัติทางวิศวกรรมสำหรับการใช้งาน 20-50 ปี */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
        <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
          <Info className="text-blue-600" size={20} />
          <span>การันตีความปลอดภัยและประสิทธิภาพสำหรับการใช้งาน 20-50 ปี</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
          <div className="p-5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span>1. ฐานข้อมูล Google Cloud Enterprise</span>
            </div>
            <p className="text-emerald-950/80 leading-relaxed">
              ระบบใช้ฐานข้อมูล <strong>Google Cloud Firestore</strong> ซึ่งเป็นระบบคลาวด์มาตรฐานโลก รองรับเอกสารข้อมูลได้ระดับหลายล้านเรคคอร์ดโดยไม่มีวันหมดอายุ และแพ็กเกจฟรีให้พื้นที่มากถึง <strong>1,000 MB (1 GB)</strong> ดังนั้นการใช้งาน 50 ปี (~65 MB) ใช้พื้นที่ไม่ถึง 7% ของแพ็กเกจฟรีเลยครับ
            </p>
          </div>

          <div className="p-5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 font-black text-blue-900 text-sm">
              <Activity size={18} className="text-blue-600" />
              <span>2. ทำไมเว็บถึงไม่ค้างหรือช้าลง</span>
            </div>
            <p className="text-blue-950/80 leading-relaxed">
              สถาปัตยกรรมของโปรแกรมถูกออกแบบให้ <strong>ประมวลผลแยกเฉพาะวัน (Day-scoped)</strong> เวลาบันทึกรายรับ-รายจ่าย จะโหลดเฉพาะข้อมูลของวันนั้นๆ เข้ามา ไม่ได้โหลด 50 ปีขึ้นมาพร้อมกัน ส่วนหน้ารายงานจะคำนวณตามช่วงวันที่เลือก ทำให้เครื่องทำงานเร็วเสี้ยววินาทีเสมอ
            </p>
          </div>

          <div className="p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
              <HardDrive size={18} className="text-amber-600" />
              <span>3. คำแนะนำในการสำรองข้อมูล</span>
            </div>
            <p className="text-amber-950/80 leading-relaxed">
              เพื่อความปลอดภัยสูงสุดระดับสูงสุด 100% แนะนำให้เข้าสู่โหมดนี้แล้วกดปุ่ม <strong>"สำรองข้อมูลทั้งหมด (.json)"</strong> เป็นประจำ (เช่น ทุกสิ้นปี หรือทุก 6 เดือน) แล้วนำไฟล์ไปเก็บไว้ใน Flash Drive สำรอง หรืออัปโหลดขึ้น Google Drive ส่วนตัวของคุณ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
