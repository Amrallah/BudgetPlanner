import { doc, serverTimestamp, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function saveFinancialDataSafe(uid: string, data: unknown, baseUpdatedAt: Timestamp | null = null) {
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

    const payload = (data && typeof data === 'object') ? data as Record<string, unknown> : {};
    tx.set(ref, { ...payload, updatedAt: serverTimestamp() });
  });
}

export default saveFinancialDataSafe;
