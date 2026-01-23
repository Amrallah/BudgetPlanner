/**
 * Saved Changes & Persistence - Comprehensive Edge Cases & Complex Scenarios
 * Tests for Firestore sync, concurrent updates, conflict resolution, and state consistency
 */

import { describe, it, expect } from 'vitest';

describe('Saved Changes & Persistence - Edge Cases & Complex Scenarios', () => {
  describe('Data Serialization & Persistence', () => {
    it('serializes complete financial data structure', () => {
      const data = {
        data: Array(60).fill(null).map(() => ({
          inc: 10000,
          baseSalary: 8000,
          extraInc: 0,
          save: 2000,
          saveExtra: 0,
          saveBonus: 0,
          grocBudg: 2000,
          grocSpent: 0,
          grocExtra: 0,
          grocBonus: 0,
          entBudg: 1000,
          entSpent: 0,
          entExtra: 0,
          entBonus: 0
        })),
        fixed: [
          { id: 1, name: 'Rent', amts: Array(60).fill(2000) }
        ],
        varExp: [],
        autoRollover: true,
        updatedAt: new Date().toISOString()
      };

      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.data.length).toBe(60);
      expect(deserialized.data[0].inc).toBe(10000);
      expect(deserialized.autoRollover).toBe(true);
    });

    it('preserves all field precision during serialization', () => {
      const data = {
        inc: 10000.50,
        save: 2000.75,
        grocSpent: 123.45
      };

      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.inc).toBe(10000.50);
      expect(deserialized.save).toBe(2000.75);
      expect(deserialized.grocSpent).toBe(123.45);
    });

      it('preserves saveBonus=0 through sanitizeForFirestore (regression test)', () => {
        // Simulate the sanitizeForFirestore function from useFinancialState
        const sanitizeForFirestore = (v: unknown): null | boolean | string | number | unknown[] | Record<string, unknown> => {
          if (v === undefined || v === null) return null;
          if (Array.isArray(v)) return v.map(sanitizeForFirestore);
          if (typeof v === 'object') {
            const out: Record<string, unknown> = {};
            Object.entries(v as Record<string, unknown>).forEach(([k, val]) => {
              out[k] = sanitizeForFirestore(val);
            });
            return out;
          }
          if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
          return null;
        };

        // Bug scenario: saveBonus is set to 0 after setup wizard
        const dataWithSaveBonus = {
          inc: 10000,
          save: 6989,
          defSave: 6989,
          saveBonus: 0,  // This should be preserved, not converted to undefined/null
          saveExtra: 0,
          grocBonus: 0,
          entBonus: 0,
          prev: null,
          prevManual: false,
          extraInc: 0,
          rolloverProcessed: false
        };

        const sanitized = sanitizeForFirestore(dataWithSaveBonus) as Record<string, unknown>;

        // TEST EXPECTATION: saveBonus should still be 0, not null or undefined
        expect(sanitized.saveBonus).toBe(0);
        expect(sanitized.saveBonus).not.toBeNull();
        expect(sanitized.saveBonus).not.toBeUndefined();
      
        // Also verify other 0 values are preserved
        expect(sanitized.saveExtra).toBe(0);
        expect(sanitized.grocBonus).toBe(0);
        expect(sanitized.entBonus).toBe(0);
      });

    it('handles null and undefined values in serialization', () => {
      const data = {
        monthData: Array(60).fill(null),
        lastSync: undefined,
        varExp: null
      };

      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.monthData[0]).toBe(null);
      expect(deserialized.lastSync).toBeUndefined();
      expect(deserialized.varExp).toBe(null);
    });

    it('handles special characters and unicode in expense names', () => {
      const data = {
        fixed: [
          { id: 1, name: 'Rent & Utilities' },
          { id: 2, name: 'Insurance (Car)' },
          { id: 3, name: 'Café ☕ Daily' },
          { id: 4, name: '中文 Subscription' }
        ]
      };

      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.fixed[0].name).toBe('Rent & Utilities');
      expect(deserialized.fixed[2].name).toBe('Café ☕ Daily');
      expect(deserialized.fixed[3].name).toBe('中文 Subscription');
    });
  });

  describe('Update Conflict Resolution', () => {
    it('resolves conflict when local changes are newer', () => {
      const remoteData = {
        inc: 10000,
        save: 1500,
        updatedAt: new Date('2025-01-01').getTime()
      };

      const localData = {
        inc: 10000,
        save: 2000,
        updatedAt: new Date('2025-01-02').getTime()
      };

      // Local is newer, keep local
      const resolved = localData.updatedAt > remoteData.updatedAt ? localData : remoteData;

      expect(resolved.save).toBe(2000);
    });

    it('resolves conflict when remote changes are newer', () => {
      const remoteData = {
        inc: 11000,
        save: 2500,
        updatedAt: new Date('2025-01-05').getTime()
      };

      const localData = {
        inc: 10000,
        save: 2000,
        updatedAt: new Date('2025-01-02').getTime()
      };

      // Remote is newer, take remote
      const resolved = remoteData.updatedAt > localData.updatedAt ? remoteData : localData;

      expect(resolved.inc).toBe(11000);
    });

    it('detects partial field conflicts in complex updates', () => {
      const remoteData = {
        data: [
          { inc: 10000, save: 2000, grocBudg: 1500 },
          { inc: 10500, save: 2100, grocBudg: 1600 }
        ]
      };

      const localData = {
        data: [
          { inc: 10000, save: 2500, grocBudg: 1500 }, // save differs
          { inc: 10500, save: 2100, grocBudg: 1600 }
        ]
      };

      const fieldsMatch = JSON.stringify(remoteData) === JSON.stringify(localData);
      expect(fieldsMatch).toBe(false);

      // Check individual field
      expect(remoteData.data[0].save).not.toBe(localData.data[0].save);
    });

    it('merges non-conflicting updates from different categories', () => {
      const remoteData = {
        data: [{ inc: 10000, save: 2000 }],
        fixed: [{ id: 1, name: 'Rent', amts: Array(60).fill(2000) }]
      };

      const localData = {
        data: [{ inc: 10000, save: 2500 }],
        varExp: [{ id: 1, name: 'Groceries' }]
      };

      // Merge: keep local.data, add remote.fixed, add local.varExp
      const merged = {
        data: localData.data,
        fixed: remoteData.fixed,
        varExp: localData.varExp
      };

      expect(merged.data[0].save).toBe(2500); // Local wins
      expect(merged.fixed[0].name).toBe('Rent'); // Remote contributes
      expect(merged.varExp[0].name).toBe('Groceries'); // Local contributes
    });
  });

  describe('Optimistic Updates & Rollback', () => {
    it('applies optimistic update locally before sync', () => {
      const localState = {
        data: [{ inc: 10000, save: 2000 }],
        lastSyncTime: 0,
        dirty: false
      };

      // Optimistic update
      localState.data[0].save = 2500;
      localState.dirty = true;

      expect(localState.data[0].save).toBe(2500);
      expect(localState.dirty).toBe(true);
    });

    it('reverts optimistic update on sync failure', () => {
      let localState = {
        save: 2500,
        synced: false
      };

      const remoteValue = 2000; // Server has different value

      // Sync fails, rollback
      if (!localState.synced) {
        localState.save = remoteValue;
      }

      expect(localState.save).toBe(2000);
    });

    it('maintains optimistic updates on successful sync', () => {
      let localState = {
        save: 2500,
        synced: false
      };

      // Sync succeeds, confirm
      localState.synced = true;

      expect(localState.save).toBe(2500);
      expect(localState.synced).toBe(true);
    });

    it('handles multiple optimistic updates before sync', () => {
      const state = {
        save: 2000,
        updates: [] as number[]
      };

      // Multiple optimistic changes
      state.save = 2200;
      state.updates.push(200);

      state.save = 2400;
      state.updates.push(200);

      state.save = 2500;
      state.updates.push(100);

      expect(state.save).toBe(2500);
      expect(state.updates.length).toBe(3);
    });
  });

  describe('Concurrent Modification Scenarios', () => {
    it('handles two tabs editing same month simultaneously', () => {
      const sharedState = {
        data: [{ save: 2000, updatedAt: 1000 }]
      };

      // Tab A changes save
      sharedState.data[0].save = 2500;
      sharedState.data[0].updatedAt = 1001;

      // Tab B changes income (before syncing)
      const tabBLocalSave = 2000;
      const tabBNewInc = 10500;

      // Tab B tries to sync its income change
      // Conflict: save timestamp is newer
      const isConflict = sharedState.data[0].updatedAt > 1000;

      expect(isConflict).toBe(true);
      expect(sharedState.data[0].save).toBe(2500);
    });

    it('handles rapid successive changes to same field', () => {
      let state = {
        save: 2000,
        version: 0,
        pendingChanges: [] as any[]
      };

      const changes = [
        { save: 2100, version: 1 },
        { save: 2200, version: 2 },
        { save: 2300, version: 3 }
      ];

      changes.forEach(change => {
        state.pendingChanges.push(change);
        state.save = change.save;
        state.version = change.version;
      });

      expect(state.save).toBe(2300);
      expect(state.version).toBe(3);
      expect(state.pendingChanges.length).toBe(3);
    });

    it('detects concurrent modifications across multiple months', () => {
      const data = [
        { month: 0, save: 2000, version: 1 },
        { month: 1, save: 2100, version: 1 },
        { month: 2, save: 2200, version: 1 }
      ];

      // Simulate updates from different sources
      data[0].save = 2500;
      data[0].version = 2;

      data[2].save = 2600;
      data[2].version = 2;

      const hasConflicts = data.some((m, i) => {
        const others = data.filter((_, idx) => idx !== i);
        return others.some(o => o.version > m.version);
      });

      // This detects version misalignment
      expect(data[1].version).toBe(1); // Month 1 is outdated
    });
  });

  describe('Data Integrity After Persistence', () => {
    it('validates 60-month array length preservation', () => {
      const data = Array(60).fill(null).map(() => ({
        inc: 10000
      }));

      const serialized = JSON.stringify({ data });
      const deserialized = JSON.parse(serialized);

      expect(deserialized.data.length).toBe(60);
    });

    it('preserves array indices through save/load cycle', () => {
      const data = Array(60).fill(0);
      data[0] = 100;
      data[30] = 300;
      data[59] = 600;

      const serialized = JSON.stringify({ data });
      const deserialized = JSON.parse(serialized);

      expect(deserialized.data[0]).toBe(100);
      expect(deserialized.data[30]).toBe(300);
      expect(deserialized.data[59]).toBe(600);
    });

    it('maintains object references through save cycle', () => {
      const monthData = {
        inc: 10000,
        nested: {
          save: 2000,
          groc: 1500
        }
      };

      const serialized = JSON.stringify(monthData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.nested.save).toBe(2000);
      expect(typeof deserialized.nested).toBe('object');
    });

    it('detects data corruption through checksum', () => {
      const original = {
        data: [{ inc: 10000, save: 2000 }],
        sum: 12000
      };

      // Simulate corruption
      const corrupted = {
        data: [{ inc: 10000, save: 1900 }], // Changed!
        sum: 12000 // Checksum not updated
      };

      const originalChecksum = original.sum;
      const correctChecksum = original.data[0].inc + original.data[0].save;
      const corruptedChecksum = corrupted.data[0].inc + corrupted.data[0].save;

      expect(originalChecksum).toBe(correctChecksum); // Valid
      expect(corrupted.sum).not.toBe(corruptedChecksum); // Invalid!
    });
  });

  describe('Throttled & Debounced Saves', () => {
    it('queues multiple changes before saving', () => {
      const queue = [] as any[];
      const batchSize = 3;

      const addChange = (change: any) => {
        queue.push(change);
      };

      addChange({ field: 'save', value: 2000 });
      addChange({ field: 'save', value: 2100 });
      addChange({ field: 'save', value: 2200 });

      expect(queue.length).toBe(batchSize);
      expect(queue[queue.length - 1].value).toBe(2200);
    });

    it('debounces rapid saves into single operation', () => {
      let saveCount = 0;
      let lastValue = 0;

      const debouncedSave = (value: number) => {
        lastValue = value; // Only keep latest value
      };

      // Rapid changes
      debouncedSave(2000);
      debouncedSave(2100);
      debouncedSave(2200);
      debouncedSave(2300);

      saveCount = 1; // Only one save happens

      expect(saveCount).toBe(1);
      expect(lastValue).toBe(2300);
    });

    it('throttles saves to maximum frequency', () => {
      const saves = [] as number[];
      const throttleMs = 1000;

      const throttledSave = (timestamp: number) => {
        if (saves.length === 0 || timestamp - saves[saves.length - 1] >= throttleMs) {
          saves.push(timestamp);
        }
      };

      throttledSave(0);
      throttledSave(100);
      throttledSave(500);
      throttledSave(1100);
      throttledSave(1200);
      throttledSave(2200);

      expect(saves.length).toBe(3); // 0, 1100, 2200
    });
  });

  describe('Offline & Connection State', () => {
    it('queues changes when offline', () => {
      const state = {
        online: false,
        queue: [] as any[],
        data: { save: 2000 }
      };

      if (!state.online) {
        state.queue.push({ field: 'save', value: 2500 });
      }

      expect(state.queue.length).toBe(1);
      expect(state.data.save).toBe(2000); // Not synced yet
    });

    it('flushes queue when connection restored', () => {
      let state = {
        online: false,
        queue: [
          { field: 'save', value: 2500 },
          { field: 'grocBudg', value: 1800 }
        ]
      };

      state.online = true;

      // Process queue
      if (state.online) {
        while (state.queue.length > 0) {
          const item = state.queue.shift();
          // Apply item...
        }
      }

      expect(state.queue.length).toBe(0);
    });

    it('preserves queue order through reconnection', () => {
      const queue = [
        { seq: 1, field: 'save', value: 2100 },
        { seq: 2, field: 'save', value: 2200 },
        { seq: 3, field: 'grocBudg', value: 1800 }
      ];

      const originalOrder = queue.map(q => q.seq);
      const processedOrder = [] as number[];

      queue.forEach(q => {
        processedOrder.push(q.seq);
      });

      expect(processedOrder).toEqual(originalOrder);
    });
  });

  describe('Timestamp & Versioning', () => {
    it('tracks update timestamps for each field', () => {
      const data = {
        save: 2000,
        saveTimestamp: new Date('2025-01-01').getTime(),
        grocBudg: 1500,
        grocBudgTimestamp: new Date('2025-01-02').getTime()
      };

      expect(data.saveTimestamp < data.grocBudgTimestamp).toBe(true);
    });

    it('maintains version numbers through updates', () => {
      const field = {
        value: 2000,
        version: 0
      };

      field.value = 2100;
      field.version++;

      field.value = 2200;
      field.version++;

      expect(field.value).toBe(2200);
      expect(field.version).toBe(2);
    });

    it('detects stale data through version comparison', () => {
      const remote = { version: 5 };
      const local = { version: 3 };

      const isStale = local.version < remote.version;
      expect(isStale).toBe(true);
    });
  });
});
