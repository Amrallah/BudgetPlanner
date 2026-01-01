/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';

// We'll import the module under test via relative path
import { saveFinancialDataSafe } from '../../lib/financeSafe';

const mockTimestamp = { _mockTs: true, toMillis: vi.fn(() => 123456), toDate: vi.fn(() => new Date(123456)) } as unknown as any;

vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(),
    Timestamp: { now: vi.fn(() => mockTimestamp) },
    runTransaction: vi.fn(async (_db, updateFn) => {
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
    await expect(saveFinancialDataSafe('uid', { foo: 'bar' })).resolves.toEqual(mockTimestamp);
  });

  it('propagates transaction errors (e.g., conflict)', async () => {
    const mod = await import('firebase/firestore');
    // make runTransaction reject
    (mod.runTransaction as any).mockImplementationOnce(async () => { throw new Error('conflict'); });

    await expect(saveFinancialDataSafe('uid', { foo: 'bar' })).rejects.toThrow('conflict');
  });
});
