import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getFinancialData(uid: string) {
  const ref = doc(db, "users", uid, "financial", "data");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function saveFinancialData(uid: string, data: any) {
  const ref = doc(db, "users", uid, "financial", "data");
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
}
