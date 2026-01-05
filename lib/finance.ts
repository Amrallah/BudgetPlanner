import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { validateFinancialDoc } from './validators';
import type { FinancialDoc } from './types';

export async function getFinancialData(uid: string): Promise<FinancialDoc | null> {
  const ref = doc(db, "users", uid, "financial", "data");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const raw = snap.data();
  const validation = validateFinancialDoc(raw);
  if (!validation.valid) {
    console.warn('Financial document failed validation', { uid, errors: validation.errors });
  }
  return validation.value;
}

export async function saveFinancialData(uid: string, data: Record<string, unknown>) {
  const ref = doc(db, "users", uid, "financial", "data");
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
}
