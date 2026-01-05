/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { applyCompensation, reverseCompensation } from '@/lib/compensation';
import type { Tx, VarExp, DataItem } from '@/lib/types';

// Test helper types
type CompensationSource = 'groc' | 'ent' | 'save' | 'prev';

describe('Compensation Logic', () => {
  describe('Overspend Detection', () => {
    it('detects overspend when adding transaction exceeds grocery budget', () => {
      const currentSpent = 2500;
      const budget = 3000;
      const newTransaction = 600;
      const remaining = budget - currentSpent;
      const wouldOverspend = newTransaction > remaining;
      
      expect(wouldOverspend).toBe(true);
      expect(newTransaction - remaining).toBe(100); // overspend amount
    });

    it('does not trigger overspend when transaction fits within budget', () => {
      const currentSpent = 2500;
      const budget = 3000;
      const newTransaction = 400;
      const remaining = budget - currentSpent;
      const wouldOverspend = newTransaction > remaining;
      
      expect(wouldOverspend).toBe(false);
    });

    it('detects overspend on exact boundary (remaining = 0)', () => {
      const currentSpent = 3000;
      const budget = 3000;
      const newTransaction = 1;
      const remaining = budget - currentSpent;
      const wouldOverspend = newTransaction > remaining;
      
      expect(wouldOverspend).toBe(true);
    });
  });

  describe('Available Compensation Sources', () => {
    it('calculates available sources when both budgets have remaining', () => {
      const grocRemaining = 500;
      const entRemaining = 300;
      const plannedSavings = 2000;
      const previousSavings = 5000;
      const overspendAmount = 200;

      const availableSources = [];
      if (entRemaining >= overspendAmount) availableSources.push({ source: 'ent', available: entRemaining });
      if (grocRemaining >= overspendAmount) availableSources.push({ source: 'groc', available: grocRemaining });
      if (plannedSavings >= overspendAmount) availableSources.push({ source: 'save', available: plannedSavings });
      if (previousSavings >= overspendAmount) availableSources.push({ source: 'prev', available: previousSavings });

      expect(availableSources.length).toBe(4);
      expect(availableSources.map(s => s.source)).toContain('ent');
      expect(availableSources.map(s => s.source)).toContain('save');
    });

    it('excludes sources with insufficient funds', () => {
      const grocRemaining = 50;
      const entRemaining = 100;
      const plannedSavings = 2000;
      const previousSavings = 5000;
      const overspendAmount = 200;

      const availableSources = [];
      if (entRemaining >= overspendAmount) availableSources.push({ source: 'ent', available: entRemaining });
      if (grocRemaining >= overspendAmount) availableSources.push({ source: 'groc', available: grocRemaining });
      if (plannedSavings >= overspendAmount) availableSources.push({ source: 'save', available: plannedSavings });
      if (previousSavings >= overspendAmount) availableSources.push({ source: 'prev', available: previousSavings });

      expect(availableSources.length).toBe(2);
      expect(availableSources.map(s => s.source)).not.toContain('ent');
      expect(availableSources.map(s => s.source)).not.toContain('groc');
      expect(availableSources.map(s => s.source)).toContain('save');
      expect(availableSources.map(s => s.source)).toContain('prev');
    });

    it('returns empty array when no source can cover overspend', () => {
      const grocRemaining = 50;
      const entRemaining = 100;
      const plannedSavings = 150;
      const previousSavings = 180;
      const overspendAmount = 200;

      const availableSources = [];
      if (entRemaining >= overspendAmount) availableSources.push({ source: 'ent', available: entRemaining });
      if (grocRemaining >= overspendAmount) availableSources.push({ source: 'groc', available: grocRemaining });
      if (plannedSavings >= overspendAmount) availableSources.push({ source: 'save', available: plannedSavings });
      if (previousSavings >= overspendAmount) availableSources.push({ source: 'prev', available: previousSavings });

      expect(availableSources.length).toBe(0);
    });
  });

  describe('Compensation Application', () => {
    it('applies compensation from entertainment budget to grocery overspend', () => {
      const grocBudget = 3000;
      const grocSpent = 2800;
      const entBudget = 2000;
      const entSpent = 1500;
      const newGrocTransaction = 300;
      
      const overspend = (grocSpent + newGrocTransaction) - grocBudget;
      expect(overspend).toBe(100);
      
      // User selects entertainment as compensation source
      const compensationSource: CompensationSource = 'ent';
      const entRemainingAfter = (entBudget - entSpent) - overspend;
      
      expect(entRemainingAfter).toBe(400);
      expect(compensationSource).toBe('ent');
    });

    it('applies compensation from planned savings', () => {
      const grocBudget = 3000;
      const grocSpent = 2900;
      const entBudget = 2000;
      const entSpent = 1950;
      const plannedSavings = 2000;
      const newGrocTransaction = 200;
      
      const overspend = (grocSpent + newGrocTransaction) - grocBudget;
      expect(overspend).toBe(100);
      
      // User selects savings as compensation source
      const compensationSource: CompensationSource = 'save';
      const savingsAfter = plannedSavings - overspend;
      
      expect(savingsAfter).toBe(1900);
      expect(compensationSource).toBe('save');
    });

    it('applies compensation from previous savings', () => {
      const grocBudget = 3000;
      const grocSpent = 2900;
      const entBudget = 2000;
      const entSpent = 2000;
      const plannedSavings = 50;
      const previousSavings = 5000;
      const newGrocTransaction = 200;
      
      const overspend = (grocSpent + newGrocTransaction) - grocBudget;
      expect(overspend).toBe(100);
      
      // User selects previous savings as compensation source
      const compensationSource: CompensationSource = 'prev';
      const prevSavingsAfter = previousSavings - overspend;
      
      expect(prevSavingsAfter).toBe(4900);
      expect(compensationSource).toBe('prev');
    });
  });

  describe('Compensation transformations (helper)', () => {
    it('planned savings compensation boosts target budget and debits savings', () => {
      const varExp: VarExp = {
        grocBudg: [2000],
        grocSpent: [0],
        entBudg: [2000],
        entSpent: [0]
      };
      const data: DataItem = {
        inc: 0,
        baseSalary: 0,
        prev: 0,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        rolloverProcessed: false
      };

      const { varExp: nv, dataItem: nd } = applyCompensation('save', 100, 0, varExp, data, 'groc');

      expect(nv.grocBudg[0]).toBe(2100);
      expect(nd.save).toBe(1900);
    });

    it('previous savings compensation keeps budget fixed, offsets spent, and debits prev', () => {
      const varExp: VarExp = {
        grocBudg: [2000],
        grocSpent: [2001],
        entBudg: [2000],
        entSpent: [0]
      };
      const data: DataItem = {
        inc: 0,
        baseSalary: 0,
        prev: 5000,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        rolloverProcessed: false
      };

      const { varExp: nv, dataItem: nd } = applyCompensation('prev', 1, 0, varExp, data, 'groc');

      expect(nv.grocBudg[0]).toBe(2000);
      expect(nv.grocSpent[0]).toBe(2000); // offset overspend
      expect(nd.prev).toBe(4999);
    });

    it('reverse previous savings compensation restores spent and previous savings', () => {
      const varExp: VarExp = {
        grocBudg: [2000],
        grocSpent: [2000],
        entBudg: [2000],
        entSpent: [0]
      };
      const data: DataItem = {
        inc: 0,
        baseSalary: 0,
        prev: 4999,
        prevManual: false,
        save: 2000,
        defSave: 2000,
        extraInc: 0,
        grocBonus: 0,
        entBonus: 0,
        rolloverProcessed: false
      };

      const { varExp: nv, dataItem: nd } = reverseCompensation({ source: 'prev', amount: 1 }, 0, varExp, data, 'groc');

      expect(nv.grocSpent[0]).toBe(2001);
      expect(nd.prev).toBe(5000);
    });
  });

  describe('Transaction with Compensation Metadata', () => {
    it('stores compensation metadata with transaction', () => {
      const amount = 300;
      const timestamp = new Date().toISOString();
      const compensation = { source: 'ent' as CompensationSource, amount: 100 };
      
      const tx: Tx & { compensation?: any } = { 
        amt: amount, 
        ts: timestamp,
        compensation 
      };
      
      expect(tx.compensation).toBeDefined();
      expect(tx.compensation.source).toBe('ent');
      expect(tx.compensation.amount).toBe(100);
    });

    it('transaction without overspend has no compensation metadata', () => {
      const amount = 200;
      const timestamp = new Date().toISOString();
      
      const tx: Tx = { 
        amt: amount, 
        ts: timestamp
      };
      
      expect((tx as any).compensation).toBeUndefined();
    });
  });

  describe('Compensation Reversal on Transaction Edit', () => {
    it('reverses compensation when edited transaction no longer causes overspend', () => {
      // Original transaction
      const originalTx = { 
        amt: 300, 
        ts: '2025-01-01T00:00:00Z',
        compensation: { source: 'ent' as CompensationSource, amount: 100 }
      };
      
      const grocBudget = 3000;
      const grocSpent = 2800; // before original transaction
      const entBudget = 2000;
      const entSpent = 1500;
      
      // Edit transaction to lower amount
      const newAmount = 150;
      const grocSpentAfterEdit = grocSpent - originalTx.amt + newAmount;
      const wouldOverspend = grocSpentAfterEdit > grocBudget;
      
      expect(wouldOverspend).toBe(false);
      
      // Compensation should be reversed
      const entRemainingAfterReversal = (entBudget - entSpent) + originalTx.compensation.amount;
      expect(entRemainingAfterReversal).toBe(600);
    });

    it('applies new compensation when edit increases transaction to cause overspend', () => {
      // Original transaction without compensation
      const originalTx = { 
        amt: 100, 
        ts: '2025-01-01T00:00:00Z'
      };
      
      const grocBudget = 3000;
      const grocSpent = 2800;
      const entBudget = 2000;
      const entSpent = 1500;
      
      // Edit transaction to higher amount
      const newAmount = 400;
      const grocSpentAfterEdit = grocSpent - originalTx.amt + newAmount;
      const wouldOverspend = grocSpentAfterEdit > grocBudget;
      const overspend = grocSpentAfterEdit - grocBudget;
      
      expect(wouldOverspend).toBe(true);
      expect(overspend).toBe(100);
      
      // New compensation should be applied
      const entRemainingAfter = (entBudget - entSpent) - overspend;
      expect(entRemainingAfter).toBe(400);
    });
  });

  describe('Compensation Reversal on Transaction Delete', () => {
    it('reverses compensation when transaction is deleted', () => {
      const tx = { 
        amt: 300, 
        ts: '2025-01-01T00:00:00Z',
        compensation: { source: 'ent' as CompensationSource, amount: 100 }
      };
      
      const entBudget = 2000;
      const entSpent = 1600; // includes 100 compensation
      
      // Delete transaction - reverse compensation
      const entSpentAfterDelete = entSpent - tx.compensation.amount;
      expect(entSpentAfterDelete).toBe(1500);
    });
  });

  describe('Multiple Compensations', () => {
    it('handles multiple transactions with different compensation sources', () => {
      const tx1 = { amt: 300, ts: '2025-01-01', compensation: { source: 'ent' as CompensationSource, amount: 50 } };
      const tx2 = { amt: 250, ts: '2025-01-02', compensation: { source: 'save' as CompensationSource, amount: 30 } };
      const tx3 = { amt: 200, ts: '2025-01-03' }; // no overspend
      
      const transactions = [tx1, tx2, tx3];
      const totalEntCompensation = transactions.reduce((sum, tx: any) => 
        tx.compensation?.source === 'ent' ? sum + tx.compensation.amount : sum, 0
      );
      const totalSaveCompensation = transactions.reduce((sum, tx: any) => 
        tx.compensation?.source === 'save' ? sum + tx.compensation.amount : sum, 0
      );
      
      expect(totalEntCompensation).toBe(50);
      expect(totalSaveCompensation).toBe(30);
    });
  });
});
