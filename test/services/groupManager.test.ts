/**
 * Tests for GroupManager — Phase 0 (trigger message detection)
 *
 * Covers the offline parts of the service:
 *   - isTriggerMessage() logic (case, whitespace, edge cases)
 *
 * Database-dependent parts are covered by the integration test (live Supabase).
 */

import { GroupManager, TRIGGER_MESSAGE } from '../../src/services/groupManager';

describe('GroupManager', () => {
  let gm: GroupManager;

  beforeEach(() => {
    gm = new GroupManager();
  });

  describe('isTriggerMessage', () => {
    it('should accept the exact trigger phrase', () => {
      expect(gm.isTriggerMessage('WATM Good Afternoon')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(gm.isTriggerMessage('watm good afternoon')).toBe(true);
      expect(gm.isTriggerMessage('WATM GOOD AFTERNOON')).toBe(true);
      expect(gm.isTriggerMessage('WAtM gOoD aFtErNoOn')).toBe(true);
    });

    it('should trim leading/trailing whitespace', () => {
      expect(gm.isTriggerMessage('   WATM Good Afternoon   ')).toBe(true);
      expect(gm.isTriggerMessage('\tWATM Good Afternoon\n')).toBe(true);
    });

    it('should collapse internal whitespace', () => {
      expect(gm.isTriggerMessage('WATM  Good   Afternoon')).toBe(true);
      expect(gm.isTriggerMessage('WATM\tGood\tAfternoon')).toBe(true);
    });

    it('should reject messages with extra text', () => {
      expect(gm.isTriggerMessage('WATM Good Afternoon everyone!')).toBe(false);
      expect(gm.isTriggerMessage('Hello WATM Good Afternoon')).toBe(false);
      expect(gm.isTriggerMessage('WATM Good Afternoon 123')).toBe(false);
    });

    it('should reject similar but different phrases', () => {
      expect(gm.isTriggerMessage('WATM Good Morning')).toBe(false);
      expect(gm.isTriggerMessage('WATM Good Evening')).toBe(false);
      expect(gm.isTriggerMessage('WATM Afternoon')).toBe(false);
      expect(gm.isTriggerMessage('Good Afternoon')).toBe(false);
      expect(gm.isTriggerMessage('watm')).toBe(false);
    });

    it('should reject empty/null messages', () => {
      expect(gm.isTriggerMessage('')).toBe(false);
      expect(gm.isTriggerMessage('   ')).toBe(false);
      expect(gm.isTriggerMessage(null)).toBe(false);
      expect(gm.isTriggerMessage(undefined)).toBe(false);
    });

    it('should reject messages with punctuation', () => {
      expect(gm.isTriggerMessage('WATM Good Afternoon!')).toBe(false);
      expect(gm.isTriggerMessage('WATM Good Afternoon?')).toBe(false);
      expect(gm.isTriggerMessage('WATM Good Afternoon.')).toBe(false);
    });

    it('should expose the trigger message constant', () => {
      expect(TRIGGER_MESSAGE).toBe('WATM Good Afternoon');
    });
  });

  describe('in-memory cache', () => {
    it('should start empty', () => {
      expect(gm.isMonitored('any-group-id')).toBe(false);
    });

    it('should track added groups in cache', () => {
      (gm as any).inMemoryCache.add('group-1');
      (gm as any).inMemoryCache.add('group-2');
      expect(gm.isMonitored('group-1')).toBe(true);
      expect(gm.isMonitored('group-2')).toBe(true);
      expect(gm.isMonitored('group-3')).toBe(false);
    });

    it('should remove groups from cache on unregister', () => {
      (gm as any).inMemoryCache.add('group-1');
      expect(gm.isMonitored('group-1')).toBe(true);
      (gm as any).inMemoryCache.delete('group-1');
      expect(gm.isMonitored('group-1')).toBe(false);
    });
  });
});
