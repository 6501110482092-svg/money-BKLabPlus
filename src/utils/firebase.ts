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

// Initialize Firebase App
const app = initializeApp(appletConfig);

// Initialize Firestore specifying custom Database ID assigned to AI Studio environment
export const db = getFirestore(app, appletConfig.firestoreDatabaseId);

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
