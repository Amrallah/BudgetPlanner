/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';

// We'll import the module under test via relative path
import { saveFinancialDataSafe } from '../../lib/financeSafe';

vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _mockTs: true })),
    runTransaction: vi.fn(async (db, updateFn) => {
      // default: invoke the update function with a mock transaction object
      const tx = {
        get: vi.fn(async () => ({ exists: () => false })),
        set: vi.fn(),
      };
      return updateFn(tx);
    }),
  };
});

describe('saveFinancialDataSafe', () => {
  it('resolves when transaction succeeds', async () => {
    await expect(saveFinancialDataSafe('uid', { foo: 'bar' })).resolves.toBeUndefined();
  });

  it('propagates transaction errors (e.g., conflict)', async () => {
    const mod = await import('firebase/firestore');
    // make runTransaction reject
    (mod.runTransaction as any).mockImplementationOnce(async () => { throw new Error('conflict'); });

    await expect(saveFinancialDataSafe('uid', { foo: 'bar' })).rejects.toThrow('conflict');
  });
});
