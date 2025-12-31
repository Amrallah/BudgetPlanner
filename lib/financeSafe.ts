import { doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

export async function saveFinancialDataSafe(uid: string, data: any, baseUpdatedAt: any = null) {
  const ref = doc(db, 'users', uid, 'financial', 'data');

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? snap.data() : null;

    if (baseUpdatedAt && current && current.updatedAt && typeof current.updatedAt.toMillis === 'function') {
      const currMs = current.updatedAt.toMillis();
      const baseMs = typeof baseUpdatedAt.toMillis === 'function' ? baseUpdatedAt.toMillis() : baseUpdatedAt;
      if (currMs !== baseMs) {
        throw new Error('conflict');
      }
    }

    tx.set(ref, { ...data, updatedAt: serverTimestamp() });
  });
}

export default saveFinancialDataSafe;
