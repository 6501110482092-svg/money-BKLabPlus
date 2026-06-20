import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection
} from 'firebase/firestore';
import { DailyRecord, LabTestTemplate } from '../types';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyD7LYNFGuyFUHL0J5StLLTq4hXnN8YokxA",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0736833511.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0736833511",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0736833511.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "231494143590",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:231494143590:web:4b452ddef21f3632d827a7"
};

const databaseId = metaEnv.VITE_FIREBASE_DATABASE_ID || "ai-studio-21202fcf-ba03-493a-a9c9-03f288c62ec2";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore specifying custom Database ID assigned to AI Studio environment or (default) if overridden
export const db = getFirestore(app, databaseId);

/**
 * อัปโหลดหรืออัปเดตข้อมูลของวันนั้นๆ ไปยัง Firebase Firestore ในแบบเรียลไทม์
 */
export async function saveRecordToFirebase(date: string, record: DailyRecord) {
  try {
    const docRef = doc(db, 'records', date);
    await setDoc(docRef, {
      ...record,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error saving record to Firebase:', err);
  }
}

/**
 * เซฟตั้งค่าชุดตรวจแล็บ (templates) ไปยัง Firebase Firestore ในแบบเรียลไทม์
 */
export async function saveLabTestsToFirebase(tests: LabTestTemplate[]) {
  try {
    const docRef = doc(db, 'settings', 'labtests');
    await setDoc(docRef, { tests });
  } catch (err) {
    console.error('Error saving lab tests to Firebase:', err);
  }
}

/**
 * ซิงค์แบบเรียลไทม์: สมัครรับข้อมูลจาก Firestore records collection
 * เมื่อมีการเปลี่ยนแปลงจากเครื่องอื่น คืนค่าอัปเดตทันทีและจัดเก็บลง LocalStorage เพื่อความทนทาน
 */
export function subscribeToRecords(onUpdate: (records: Record<string, DailyRecord>) => void) {
  const colRef = collection(db, 'records');
  return onSnapshot(colRef, (snapshot) => {
    const records: Record<string, DailyRecord> = {};
    snapshot.forEach((doc) => {
      records[doc.id] = doc.data() as DailyRecord;
    });
    // สำรองข้อมูลลง LocalStorage เผื่อกรณีขาดการเชื่อมต่อ
    localStorage.setItem('bklabplus_records', JSON.stringify(records));
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
        localStorage.setItem('bklabplus_labtests', JSON.stringify(data.tests));
        onUpdate(data.tests);
      }
    }
  }, (err) => {
    console.warn('Firestore settings subscription offline or warning:', err);
  });
}
