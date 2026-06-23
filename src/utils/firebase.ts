import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { DailyRecord, LabTestTemplate } from '../types';
import appletConfig from '../../firebase-applet-config.json';

// ตรวจสอบว่ามีการใส่คีย์ตั้งค่า Firebase ส่วนตัวใน Environment Variables หรือไม่
const metaEnv = (import.meta as any).env || {};
const customApiKey = metaEnv.VITE_FIREBASE_API_KEY;

const firebaseConfig = customApiKey ? {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: metaEnv.VITE_FIREBASE_APP_ID,
} : appletConfig;

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore (ใช้ Custom Database ID ของผู้ใช้หากระบุไว้ หรือใช้ค่าจาก appletConfig)
const databaseId = customApiKey 
  ? (metaEnv.VITE_FIREBASE_DATABASE_ID || undefined)
  : (appletConfig as any).firestoreDatabaseId;

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// Log ข้อมูลการเชื่อมต่อเพื่อช่วยในการตรวจสอบ
console.log(`[Firebase Connection] Initialized using ${customApiKey ? 'Custom Personal Firebase Project' : 'AI Studio Managed Sandbox'} (Project ID: ${firebaseConfig.projectId || 'N/A'})`);


// Initialize Firebase Authentication
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * ล็อกอินเข้าใช้งานด้วย Google Gmail (signInWithPopup สำหรับ iframe และอุปกรณ์ทั่วไป)
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Error signing in with Google:', err);
    throw err;
  }
}

/**
 * ออกจากระบบลบเซสชันคลื่นสัญญาณคลาวด์
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Error logging out:', err);
    throw err;
  }
}


/**
 * อัปโหลดหรืออัปเดตข้อมูลของวันนั้นๆ ไปยัง Firebase Firestore ในแบบเรียลไทม์
 */
export async function saveRecordToFirebase(date: string, record: DailyRecord) {
  try {
    console.log(`[Firestore Write] Attempting to write record for date: ${date}`, record);
    const docRef = doc(db, 'records', date);
    await setDoc(docRef, {
      ...record,
      updatedAt: new Date().toISOString()
    });
    console.log(`[Firestore Write] SUCCESS: Record for date ${date} written to 'records' collection successfully.`);
  } catch (err) {
    console.error(`[Firestore Write] ERROR: Failed to write record for date ${date}:`, err);
  }
}

/**
 * เซฟตั้งค่าชุดตรวจแล็บ (templates) ไปยัง Firebase Firestore ในแบบเรียลไทม์
 */
export async function saveLabTestsToFirebase(tests: LabTestTemplate[]) {
  try {
    console.log('[Firestore Write] Attempting to write lab tests settings', tests);
    const docRef = doc(db, 'settings', 'labtests');
    await setDoc(docRef, { tests });
    console.log('[Firestore Write] SUCCESS: Lab tests settings written to "settings/labtests" successfully.');
  } catch (err) {
    console.error('[Firestore Write] ERROR: Failed to write lab tests settings:', err);
  }
}

/**
 * ซิงค์แบบเรียลไทม์: สมัครรับข้อมูลจาก Firestore records collection
 * ส่งคืนข้อมูลอัปเดตแบบสดๆ ไปยัง UI สเตทโดยตรงทันที
 */
export function subscribeToRecords(onUpdate: (records: Record<string, DailyRecord>) => void) {
  const colRef = collection(db, 'records');
  return onSnapshot(colRef, (snapshot) => {
    const records: Record<string, DailyRecord> = {};
    snapshot.forEach((doc) => {
      records[doc.id] = doc.data() as DailyRecord;
    });
    // เรียก callback ส่งต่อให้ UI สเตท (เช่น setState ของ useState) เพื่อเรนเดอร์ใหม่ทันที
    onUpdate(records);
  }, (err) => {
    console.warn('Firestore records subscription offline or warning:', err);
  });
}

/**
 * ซิงค์แบบเรียลไทม์: สมัครรับข้อมูลกำหนดค่าชุดตรวจจาก Firestore settings
 */
export function subscribeToLabTests(onUpdate: (tests: LabTestTemplate[]) => void) {
  const docRef = doc(db, 'settings', 'labtests');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data && Array.isArray(data.tests)) {
        onUpdate(data.tests);
      }
    }
  }, (err) => {
    console.warn('Firestore settings subscription offline or warning:', err);
  });
}
