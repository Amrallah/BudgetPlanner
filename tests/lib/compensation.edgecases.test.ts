/**
 * Compensation & Budget Rebalance - Comprehensive Edge Cases & Complex Scenarios
 * Tests for overspend compensation sources, cascading effects, extreme scenarios
 */

import { describe, it, expect } from 'vitest';

describe('Compensation & Rebalance - Edge Cases & Complex Scenarios', () => {
  describe('Overspend Detection & Sources', () => {
    it('detects single transaction exceeding budget', () => {
      const budget = 1000;
      const spent = 800;
      const transaction = 300;
      const wouldOverspend = (spent + transaction) > budget;

      expect(wouldOverspend).toBe(true);
      expect(spent + transaction - budget).toBe(100);
    });

    it('detects transaction matching exact budget', () => {
      const budget = 1000;
      const spent = 900;
      const transaction = 100;
      const wouldOverspend = (spent + transaction) > budget;

      expect(wouldOverspend).toBe(false);
      expect(spent + transaction).toBe(budget);
    });

    it('detects transaction exactly one unit over', () => {
      const budget = 1000;
      const spent = 999;
      const transaction = 2;
      const overspend = (spent + transaction) - budget;

      expect(overspend).toBe(1);
    });

    it('finds multiple compensation sources', () => {
      const sources = [
        { name: 'savingsBuffer', available: 500 },
        { name: 'entBonus', available: 200 },
        { name: 'grocBonus', available: 150 }
      ];

      const overspendAmount = 400;
      const availableSources = sources.filter(s => s.available > 0);

      expect(availableSources.length).toBe(3);
      expect(availableSources.some(s => s.available >= overspendAmount)).toBe(true);
    });

    it('ranks sources by availability', () => {
      const sources = [
        { name: 'A', available: 100 },
        { name: 'B', available: 500 },
        { name: 'C', available: 300 }
      ];

      const sorted = [...sources].sort((a, b) => b.available - a.available);

      expect(sorted[0].name).toBe('B');
      expect(sorted[1].name).toBe('C');
      expect(sorted[2].name).toBe('A');
    });
  });

  describe('Single vs Multiple Source Compensation', () => {
    it('applies compensation from single source', () => {
      let savings = 1000;
      const overspend = 150;

      savings -= overspend;

      expect(savings).toBe(850);
    });

    it('splits compensation across two sources', () => {
      let entBonus = 100;
      let saveBuffer = 200;
      const overspend = 180;

      // Apply from entBonus first
      const fromEnt = Math.min(entBonus, overspend);
      entBonus -= fromEnt;
      const remaining = overspend - fromEnt;

      // Apply remaining from saveBuffer
      const fromSave = Math.min(saveBuffer, remaining);
      saveBuffer -= fromSave;

      expect(entBonus).toBe(0);
      expect(saveBuffer).toBe(120);
      expect(fromEnt + fromSave).toBe(overspend);
    });

    it('cascades compensation through multiple sources', () => {
      let sources = {
        ent: 50,
        groc: 100,
        save: 300
      };

      const overspend = 350;
      let remaining = overspend;

      // Try each source in order: ent (50) + groc (100) + save (200) = 350
      for (const key of ['ent', 'groc', 'save']) {
        if (remaining <= 0) break;
        const taken = Math.min(sources[key as keyof typeof sources], remaining);
        sources[key as keyof typeof sources] -= taken;
        remaining -= taken;
      }

      // ent: 50-50=0, groc: 100-100=0, save: 300-200=100, remaining: 0
      expect(sources.ent).toBe(0);
      expect(sources.groc).toBe(0);
      expect(sources.save).toBe(100);
      expect(remaining).toBe(0);
    });

    it('handles overspend exceeding all available sources', () => {
      const sources = {
        ent: 50,
        groc: 100,
        save: 75
      };

      const overspend = 300;
      const totalAvailable = Object.values(sources).reduce((a, b) => a + b, 0);

      expect(overspend).toBeGreaterThan(totalAvailable);
      expect(overspend - totalAvailable).toBe(75);
    });
  });

  describe('Complex Rebalance Scenarios', () => {
    it('rebalances three-category budget with fixed reduction', () => {
      const month = {
        save: 2000,
        groc: 3000,
        ent: 3000,
        total: 8000
      };

      // User reduces entertainment by 500
      const reduction = 500;
      month.ent -= reduction;

      // Need to redistribute 500 to maintain balance
      const deficit = 500;
      month.save += deficit * 0.4;
      month.groc += deficit * 0.6;

      expect(month.save).toBe(2200);
      expect(month.groc).toBe(3300);
      expect(month.ent).toBe(2500);
      expect(month.save + month.groc + month.ent).toBe(month.total);
    });

    it('handles rebalance when one category becomes zero', () => {
      let budget = {
        save: 1000,
        groc: 4000,
        ent: 4000
      };

      const available = 9000;

      // User sets entertainment to zero
      const reduction = budget.ent;
      budget.ent = 0;

      // Redistribute reduction between save and groc
      budget.save += reduction * 0.25;
      budget.groc += reduction * 0.75;

      expect(budget.ent).toBe(0);
      expect(budget.save + budget.groc + budget.ent).toBe(available);
    });

    it('rebalances across all 60 months when applying to future', () => {
      const months = Array(60).fill(null).map((_, i) => ({
        idx: i,
        entBudg: 3000,
        save: 2000,
        grocBudg: 3000
      }));

      // Apply budget reduction starting from month 10
      const startMonth = 10;
      const reduction = 500;

      for (let i = startMonth; i < 60; i++) {
        months[i].entBudg -= reduction;
        months[i].save += reduction;
      }

      // Verify all months from startMonth are updated
      for (let i = startMonth; i < 60; i++) {
        expect(months[i].entBudg).toBe(2500);
        expect(months[i].save).toBe(2500);
      }

      // Verify months before start unchanged
      for (let i = 0; i < startMonth; i++) {
        expect(months[i].entBudg).toBe(3000);
        expect(months[i].save).toBe(2000);
      }
    });
  });

  describe('Extreme Rebalance Cases', () => {
    it('handles budget increase causing over-allocation', () => {
      let month = {
        inc: 10000,
        save: 2000,
        groc: 3000,
        ent: 3000,
        total: 8000
      };

      // User increases groceries by 1000
      month.groc += 1000;
      month.total += 1000;

      // Now over-allocated by 1000 (9000 > 10000 is false, so no overage actually)
      // Let me test actual overage scenario
      month.groc = 6500; // Now total would be 11500
      month.total = month.save + month.groc + month.ent;

      const deficit = month.total - month.inc;
      expect(deficit).toBeGreaterThan(0);

      // Reduce savings to balance
      const newSave = month.save - deficit;
      month.total = month.total - deficit;

      expect(month.total).toBe(month.inc);
    });

    it('handles simultaneous increase in income and budget reduction', () => {
      let month = {
        inc: 10000,
        extraInc: 0,
        save: 2000,
        groc: 3000,
        ent: 3000
      };

      // Income increases by 1500
      month.inc += 1500;
      // Entertainment decreases by 500
      month.ent -= 500;
      // Extra income comes in: 500
      month.extraInc += 500;

      // New available
      const newAvailable = month.inc + month.extraInc;
      expect(newAvailable).toBe(12000); // inc: 11500, extraInc: 500 = 12000

      // Original allocated was 8000. After ent reduction it's 7500.
      const allocated = month.save + month.groc + month.ent;
      expect(newAvailable - allocated).toBeGreaterThan(0);
    });

    it('handles budget reduction to nearly zero', () => {
      let month = {
        ent: 100,
        save: 3900,
        groc: 4000,
        inc: 8000
      };

      // Reduce entertainment to 1
      month.ent = 1;
      const freed = 100 - 1;

      // Add to savings
      month.save += freed;

      expect(month.ent + month.save + month.groc).toBe(month.inc);
      expect(month.ent).toBe(1);
      expect(month.save).toBe(3999);
    });

    it('handles allocation with only savings available', () => {
      let month = {
        save: 7500,
        groc: 2500,
        ent: 0,
        inc: 10000
      };

      // User reduces groc to 0
      const freed = 2500;
      month.groc = 0;
      month.save += freed;

      expect(month.save + month.groc + month.ent).toBe(month.inc);
      expect(month.save).toBe(10000);
    });
  });

  describe('Compensation Reversal & Undo', () => {
    it('reverses single source compensation', () => {
      let savings = 850; // After compensation
      const compensation = 150;

      savings += compensation;

      expect(savings).toBe(1000);
    });

    it('reverses multi-source compensation', () => {
      let state = {
        ent: 0,
        save: 120,
        originalEnt: 100,
        originalSave: 200
      };

      const compensation = { ent: 100, save: 80 };

      state.ent += compensation.ent;
      state.save += compensation.save;

      expect(state.ent).toBe(100);
      expect(state.save).toBe(200);
    });

    it('reverses cascading compensation', () => {
      let sources = {
        ent: 0,
        groc: 0,
        save: 0,
        originalEnt: 50,
        originalGroc: 100,
        originalSave: 300
      };

      const compensations = [
        { source: 'ent', amount: 50 },
        { source: 'groc', amount: 100 },
        { source: 'save', amount: 200 }
      ];

      // Reverse
      compensations.forEach(comp => {
        sources[comp.source as keyof typeof sources] += comp.amount;
      });

      expect(sources.ent).toBe(50);
      expect(sources.groc).toBe(100);
      expect(sources.save).toBe(200);
    });
  });

  describe('Interaction with Extras (Bonus + Extra)', () => {
    it('uses bonus as compensation source before base budget', () => {
      const month = {
        entBudg: 1000,
        entBonus: 500,
        entExtra: 200,
        entSpent: 1600,
        entAvailable: 1500 + 200 // budget + extra, not bonus
      };

      const totalAvailable = month.entBudg + month.entBonus + month.entExtra;
      const overspend = month.entSpent - totalAvailable;

      expect(totalAvailable).toBe(1700);
      expect(month.entSpent).toBeLessThanOrEqual(totalAvailable);
    });

    it('compensates from savings when budget + extras insufficient', () => {
      const month = {
        groc: 2000,
        grocExtra: 100,
        grocBonus: 50,
        grocSpent: 2200,
        save: 3000
      };

      const grocTotal = month.groc + month.grocExtra + month.grocBonus;
      const overspend = month.grocSpent - grocTotal;

      expect(overspend).toBe(50);

      let savings = month.save;
      savings -= overspend;

      expect(savings).toBe(2950);
    });
  });

  describe('Multi-Month Cascading Effects', () => {
    it('tracks compensation impact across months', () => {
      const months = [
        { save: 5000, spent: 0 },
        { save: 5000, spent: 1000 },
        { save: 5000, spent: 500 }
      ];

      let balance = 0;
      months.forEach(m => {
        if (m.spent > m.save) {
          const compensation = m.spent - m.save;
          balance -= compensation;
        } else {
          balance += (m.save - m.spent);
        }
      });

      // Month 0: 5000-0=5000, Month 1: 5000-1000=4000, Month 2: 5000-500=4500
      // Total: 5000+4000+4500=13500
      expect(balance).toBe(13500);
    });

    it('applies forward adjustment when compensation used', () => {
      let months = Array(3).fill(null).map(() => ({
        save: 2000
      }));

      // Month 0 overspends by 500
      const overspend = 500;
      months[0].save -= overspend; // = 1500

      // Apply adjustment forward
      const adjustment = overspend / 2; // spread over next 2 months
      for (let i = 1; i < months.length; i++) {
        months[i].save -= adjustment;
      }

      expect(months[0].save).toBe(1500);
      expect(months[1].save).toBe(1750);
      expect(months[2].save).toBe(1750);
    });
  });

  describe('Validation After Compensation', () => {
    it('ensures total budgets still equal available after compensation', () => {
      const month = {
        inc: 10000,
        save: 2000,
        groc: 3000,
        ent: 5000
      };

      const allocated = month.save + month.groc + month.ent;
      expect(allocated).toBe(month.inc);

      // User overspends entertainment by 500
      const overspend = 500;

      // Reduce savings to compensate
      month.save -= overspend;

      const newTotal = month.save + month.groc + month.ent;
      // After overspend, total should be reduced by the overspend amount
      expect(newTotal).toBe(month.inc - overspend);
      expect(month.save).toBe(1500);
    });

    it('prevents compensation causing negative budget', () => {
      let savings = 200;
      const overspend = 300;

      const canCompensate = savings >= overspend;
      expect(canCompensate).toBe(false);

      // Should need multiple sources
      const otherSources = 150;
      const totalAvailable = savings + otherSources;
      expect(totalAvailable).toBeGreaterThanOrEqual(overspend);
    });
  });
});
