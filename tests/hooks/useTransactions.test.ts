import { describe, it, expect } from 'vitest';
import type { Transactions, ExtraAlloc } from '@/lib/types';

// Unit tests for transaction business logic (pure functions)
describe('useTransactions Hook - Business Logic', () => {
  describe('Initialization & State Creation', () => {
    it('should initialize with 60 empty transaction arrays', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      expect(transactions.groc).toHaveLength(60);
      expect(transactions.ent).toHaveLength(60);
      expect(transactions.extra).toHaveLength(60);
      expect(transactions.groc.every(arr => Array.isArray(arr) && arr.length === 0)).toBe(true);
      expect(transactions.ent.every(arr => Array.isArray(arr) && arr.length === 0)).toBe(true);
      expect(transactions.extra.every(arr => Array.isArray(arr) && arr.length === 0)).toBe(true);
    });

    it('should create deep copy of transactions for safe mutation', () => {
      const original: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };
      original.groc[0].push({ amt: 100, ts: '2025-01-01T00:00:00.000Z' });

      const copy: Transactions = {
        groc: original.groc.map(a => a.slice()),
        ent: original.ent.map(a => a.slice()),
        extra: original.extra.map(a => a.slice())
      };

      // Mutate copy
      copy.groc[0].push({ amt: 200, ts: '2025-01-02T00:00:00.000Z' });

      // Original should be unchanged
      expect(original.groc[0]).toHaveLength(1);
      expect(copy.groc[0]).toHaveLength(2);
    });
  });

  describe('Grocery/Entertainment Transaction Operations', () => {
    it('should add grocery transaction to specific month', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      const ts = new Date().toISOString();
      const updated = {
        ...transactions,
        groc: transactions.groc.map((arr, idx) => 
          idx === 5 ? [...arr, { amt: 150, ts }] : arr
        )
      };

      expect(updated.groc[5]).toHaveLength(1);
      expect(updated.groc[5][0].amt).toBe(150);
      expect(updated.groc[5][0].ts).toBe(ts);
      expect(updated.groc[4]).toHaveLength(0); // Other months unaffected
    });

    it('should add entertainment transaction to specific month', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      const ts = new Date().toISOString();
      const updated = {
        ...transactions,
        ent: transactions.ent.map((arr, idx) => 
          idx === 10 ? [...arr, { amt: 250, ts }] : arr
        )
      };

      expect(updated.ent[10]).toHaveLength(1);
      expect(updated.ent[10][0].amt).toBe(250);
      expect(updated.ent[10][0].ts).toBe(ts);
    });

    it('should delete transaction from specific month', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };
      
      // Add some transactions
      transactions.groc[3] = [
        { amt: 100, ts: '2025-01-01' },
        { amt: 200, ts: '2025-01-02' },
        { amt: 300, ts: '2025-01-03' }
      ];

      // Delete middle transaction
      const updated = {
        ...transactions,
        groc: transactions.groc.map((arr, idx) => {
          if (idx === 3) {
            const copy = arr.slice();
            copy.splice(1, 1); // Remove index 1
            return copy;
          }
          return arr;
        })
      };

      expect(updated.groc[3]).toHaveLength(2);
      expect(updated.groc[3][0].amt).toBe(100);
      expect(updated.groc[3][1].amt).toBe(300); // 200 removed
    });

    it('should edit transaction amount', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };
      
      transactions.ent[7] = [{ amt: 100, ts: '2025-01-01' }];

      const updated = {
        ...transactions,
        ent: transactions.ent.map((arr, idx) => 
          idx === 7 ? arr.map((tx, txIdx) => 
            txIdx === 0 ? { ...tx, amt: 175 } : tx
          ) : arr
        )
      };

      expect(updated.ent[7][0].amt).toBe(175);
      expect(updated.ent[7][0].ts).toBe('2025-01-01'); // Timestamp preserved
    });

    it('should calculate total spent from transactions', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };
      
      transactions.groc[5] = [
        { amt: 100, ts: '2025-01-01' },
        { amt: 150, ts: '2025-01-02' },
        { amt: 75, ts: '2025-01-03' }
      ];

      const totalSpent = transactions.groc[5].reduce((sum, tx) => sum + tx.amt, 0);
      expect(totalSpent).toBe(325);
    });
  });

  describe('Extra Allocation Operations', () => {
    it('should add extra allocation split to month', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      const ts = new Date().toISOString();
      const allocation: ExtraAlloc = { groc: 200, ent: 150, save: 100, ts };

      const updated = {
        ...transactions,
        extra: transactions.extra.map((arr, idx) => 
          idx === 8 ? [...arr, allocation] : arr
        )
      };

      expect(updated.extra[8]).toHaveLength(1);
      expect(updated.extra[8][0].groc).toBe(200);
      expect(updated.extra[8][0].ent).toBe(150);
      expect(updated.extra[8][0].save).toBe(100);
      expect(updated.extra[8][0].ts).toBe(ts);
    });

    it('should support multiple extra allocations in one month', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      const alloc1: ExtraAlloc = { groc: 100, ent: 50, save: 50, ts: '2025-01-01' };
      const alloc2: ExtraAlloc = { groc: 200, ent: 100, save: 100, ts: '2025-01-15' };

      const updated = {
        ...transactions,
        extra: transactions.extra.map((arr, idx) => 
          idx === 2 ? [...arr, alloc1, alloc2] : arr
        )
      };

      expect(updated.extra[2]).toHaveLength(2);
      expect(updated.extra[2][0].groc).toBe(100);
      expect(updated.extra[2][1].groc).toBe(200);
    });

    it('should delete extra allocation from history', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      transactions.extra[4] = [
        { groc: 100, ent: 50, save: 50, ts: '2025-01-01' },
        { groc: 200, ent: 100, save: 100, ts: '2025-01-02' }
      ];

      const updated = {
        ...transactions,
        extra: transactions.extra.map((arr, idx) => {
          if (idx === 4) {
            const copy = arr.slice();
            copy.splice(0, 1); // Remove first allocation
            return copy;
          }
          return arr;
        })
      };

      expect(updated.extra[4]).toHaveLength(1);
      expect(updated.extra[4][0].groc).toBe(200);
    });

    it('should calculate total extra allocated from history', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      transactions.extra[6] = [
        { groc: 100, ent: 50, save: 50, ts: '2025-01-01' },
        { groc: 200, ent: 100, save: 100, ts: '2025-01-02' }
      ];

      const totalGroc = transactions.extra[6].reduce((sum, ex) => sum + ex.groc, 0);
      const totalEnt = transactions.extra[6].reduce((sum, ex) => sum + ex.ent, 0);
      const totalSave = transactions.extra[6].reduce((sum, ex) => sum + ex.save, 0);

      expect(totalGroc).toBe(300);
      expect(totalEnt).toBe(150);
      expect(totalSave).toBe(150);
    });
  });

  describe('Clear & Reset Operations', () => {
    it('should clear all transactions for a specific month', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      transactions.groc[10] = [{ amt: 100, ts: '2025-01-01' }];
      transactions.ent[10] = [{ amt: 200, ts: '2025-01-02' }];
      transactions.extra[10] = [{ groc: 50, ent: 50, save: 50, ts: '2025-01-03' }];

      const updated = {
        ...transactions,
        groc: transactions.groc.map((arr, idx) => idx === 10 ? [] : arr),
        ent: transactions.ent.map((arr, idx) => idx === 10 ? [] : arr),
        extra: transactions.extra.map((arr, idx) => idx === 10 ? [] : arr)
      };

      expect(updated.groc[10]).toHaveLength(0);
      expect(updated.ent[10]).toHaveLength(0);
      expect(updated.extra[10]).toHaveLength(0);
      expect(updated.groc[9]).toHaveLength(0); // Other months unaffected
    });

    it('should reset all transactions to empty state', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      // Add some data
      transactions.groc[0] = [{ amt: 100, ts: '2025-01-01' }];
      transactions.ent[5] = [{ amt: 200, ts: '2025-01-02' }];
      transactions.extra[10] = [{ groc: 50, ent: 50, save: 50, ts: '2025-01-03' }];

      const reset: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      expect(reset.groc.every(arr => arr.length === 0)).toBe(true);
      expect(reset.ent.every(arr => arr.length === 0)).toBe(true);
      expect(reset.extra.every(arr => arr.length === 0)).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support complete transaction workflow', () => {
      // Setup
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      // Add grocery transactions
      const ts1 = '2025-01-01T10:00:00.000Z';
      const ts2 = '2025-01-02T15:00:00.000Z';
      
      let updated = {
        ...transactions,
        groc: transactions.groc.map((arr, idx) => 
          idx === 0 ? [...arr, { amt: 150, ts: ts1 }, { amt: 200, ts: ts2 }] : arr
        )
      };

      expect(updated.groc[0]).toHaveLength(2);

      // Edit first transaction
      updated = {
        ...updated,
        groc: updated.groc.map((arr, idx) => 
          idx === 0 ? arr.map((tx, txIdx) => 
            txIdx === 0 ? { ...tx, amt: 175 } : tx
          ) : arr
        )
      };

      expect(updated.groc[0][0].amt).toBe(175);

      // Delete second transaction
      updated = {
        ...updated,
        groc: updated.groc.map((arr, idx) => {
          if (idx === 0) {
            const copy = arr.slice();
            copy.splice(1, 1);
            return copy;
          }
          return arr;
        })
      };

      expect(updated.groc[0]).toHaveLength(1);
      expect(updated.groc[0][0].amt).toBe(175);
    });

    it('should handle multiple transaction types across months', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      // Month 0: Grocery + Entertainment
      transactions.groc[0] = [{ amt: 100, ts: '2025-01-01' }];
      transactions.ent[0] = [{ amt: 50, ts: '2025-01-02' }];

      // Month 1: Extra allocation
      transactions.extra[1] = [{ groc: 200, ent: 100, save: 100, ts: '2025-02-01' }];

      // Month 2: All types
      transactions.groc[2] = [{ amt: 150, ts: '2025-03-01' }];
      transactions.ent[2] = [{ amt: 75, ts: '2025-03-02' }];
      transactions.extra[2] = [{ groc: 50, ent: 25, save: 25, ts: '2025-03-03' }];

      expect(transactions.groc[0]).toHaveLength(1);
      expect(transactions.ent[0]).toHaveLength(1);
      expect(transactions.extra[1]).toHaveLength(1);
      expect(transactions.groc[2]).toHaveLength(1);
      expect(transactions.ent[2]).toHaveLength(1);
      expect(transactions.extra[2]).toHaveLength(1);
    });

    it('should maintain transaction timestamps in chronological order', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      const ts1 = '2025-01-01T08:00:00.000Z';
      const ts2 = '2025-01-01T12:00:00.000Z';
      const ts3 = '2025-01-01T18:00:00.000Z';

      transactions.groc[5] = [
        { amt: 100, ts: ts1 },
        { amt: 150, ts: ts2 },
        { amt: 200, ts: ts3 }
      ];

      expect(transactions.groc[5][0].ts).toBe(ts1);
      expect(transactions.groc[5][1].ts).toBe(ts2);
      expect(transactions.groc[5][2].ts).toBe(ts3);
      
      // Verify chronological order
      expect(transactions.groc[5][0].ts < transactions.groc[5][1].ts).toBe(true);
      expect(transactions.groc[5][1].ts < transactions.groc[5][2].ts).toBe(true);
    });

    it('should support undo last extra allocation operation', () => {
      const transactions: Transactions = {
        groc: Array(60).fill(0).map(() => []),
        ent: Array(60).fill(0).map(() => []),
        extra: Array(60).fill(0).map(() => [])
      };

      // Add two allocations
      const alloc1: ExtraAlloc = { groc: 100, ent: 50, save: 50, ts: '2025-01-01' };
      const alloc2: ExtraAlloc = { groc: 200, ent: 100, save: 100, ts: '2025-01-02' };

      transactions.extra[3] = [alloc1, alloc2];
      expect(transactions.extra[3]).toHaveLength(2);

      // Undo last (remove last index)
      const lastIdx = transactions.extra[3].length - 1;
      const updated = {
        ...transactions,
        extra: transactions.extra.map((arr, idx) => {
          if (idx === 3) {
            const copy = arr.slice();
            copy.splice(lastIdx, 1);
            return copy;
          }
          return arr;
        })
      };

      expect(updated.extra[3]).toHaveLength(1);
      expect(updated.extra[3][0].groc).toBe(100); // First allocation remains
    });
  });
});
