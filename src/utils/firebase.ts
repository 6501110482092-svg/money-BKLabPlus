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
import { DailyRecord, LabTestTemplate, Business } from '../types';
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
 * แยกสมุดบันทึกตามธุรกิจ/บริษัท (Doc ID: `${businessId}_${date}`)
 */
export async function saveRecordToFirebase(date: string, record: DailyRecord, businessId?: string) {
  try {
    const targetBusinessId = businessId || record.businessId || 'clinic-main';
    const docId = `${targetBusinessId}_${date}`;
    console.log(`[Firestore Write] Attempting to write record for business: ${targetBusinessId}, date: ${date}, docId: ${docId}`, record);
    
    const docRef = doc(db, 'records', docId);
    await setDoc(docRef, {
      ...record,
      businessId: targetBusinessId,
      date,
      updatedAt: new Date().toISOString()
    });
    console.log(`[Firestore Write] SUCCESS: Record for date ${date} (Business: ${targetBusinessId}) written to 'records' collection successfully.`);
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
 * เซฟรายชื่อบริษัท / ธุรกิจ ไปยัง Firebase Firestore ในแบบเรียลไทม์
 */
export async function saveBusinessesToFirebase(businesses: Business[]) {
  try {
    console.log('[Firestore Write] Attempting to write businesses settings', businesses);
    const docRef = doc(db, 'settings', 'businesses');
    await setDoc(docRef, { 
      list: businesses,
      updatedAt: new Date().toISOString()
    });
    console.log('[Firestore Write] SUCCESS: Businesses list written to "settings/businesses" successfully.');
  } catch (err) {
    console.error('[Firestore Write] ERROR: Failed to write businesses settings:', err);
  }
}

/**
 * ซิงค์แบบเรียลไทม์: สมัครรับข้อมูลจาก Firestore records collection
 * คืนค่าทั้งแบบแยกตามบริษัท (recordsByBusiness) และแบบรวม (flatRecords)
 */
export function subscribeToRecords(
  onUpdate: (
    recordsByBusiness: Record<string, Record<string, DailyRecord>>,
    flatRecords: Record<string, DailyRecord>
  ) => void
) {
  const colRef = collection(db, 'records');
  return onSnapshot(colRef, (snapshot) => {
    const recordsByBusiness: Record<string, Record<string, DailyRecord>> = {};
    const flatRecords: Record<string, DailyRecord> = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as DailyRecord;
      flatRecords[docSnap.id] = data;

      // สกัด businessId และ date รองรับทั้งระบบใหม่ (${businessId}_${date}) และข้อมูลเก่า (${date})
      let bId = data.businessId;
      let recDate = data.date;

      if (!bId) {
        if (docSnap.id.includes('_')) {
          const firstUnderscore = docSnap.id.indexOf('_');
          bId = docSnap.id.substring(0, firstUnderscore);
          recDate = docSnap.id.substring(firstUnderscore + 1);
        } else {
          // ข้อมูลประวัติเดิมที่บันทึกไว้ก่อนมีระบบแยกบริษัท จะจัดเข้าธุรกิจหลักเริ่มต้น
          bId = 'clinic-main';
          recDate = docSnap.id;
        }
      }

      if (!recDate) {
        recDate = docSnap.id;
      }

      if (!recordsByBusiness[bId]) {
        recordsByBusiness[bId] = {};
      }

      recordsByBusiness[bId][recDate] = {
        ...data,
        date: recDate,
        businessId: bId,
      };
    });

    onUpdate(recordsByBusiness, flatRecords);
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

/**
 * ซิงค์แบบเรียลไทม์: สมัครรับข้อมูลรายชื่อบริษัท/ธุรกิจจาก Firestore settings
 */
export function subscribeToBusinesses(onUpdate: (businesses: Business[]) => void) {
  const docRef = doc(db, 'settings', 'businesses');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data && Array.isArray(data.list) && data.list.length > 0) {
        onUpdate(data.list);
      }
    }
  }, (err) => {
    console.warn('Firestore businesses subscription offline or warning:', err);
  });
}
