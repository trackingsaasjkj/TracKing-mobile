import { canTransition, nextStatus } from '@/features/services/hooks/useServices';
import type { ServiceStatus } from '@/features/services/types/services.types';

describe('Service state machine', () => {
  describe('canTransition', () => {
    it('allows transition from ASSIGNED', () => {
      expect(canTransition('ASSIGNED')).toBe(true);
    });

    it('allows transition from ACCEPTED', () => {
      expect(canTransition('ACCEPTED')).toBe(true);
    });

    it('allows transition from IN_TRANSIT', () => {
      expect(canTransition('IN_TRANSIT')).toBe(true);
    });

    it('blocks transition from DELIVERED (terminal state)', () => {
      expect(canTransition('DELIVERED')).toBe(false);
    });
  });

  describe('nextStatus', () => {
    it('ASSIGNED → ACCEPTED', () => {
      expect(nextStatus('ASSIGNED')).toBe('ACCEPTED');
    });

    it('ACCEPTED → IN_TRANSIT', () => {
      expect(nextStatus('ACCEPTED')).toBe('IN_TRANSIT');
    });

    it('IN_TRANSIT → DELIVERED', () => {
      expect(nextStatus('IN_TRANSIT')).toBe('DELIVERED');
    });

    it('DELIVERED → null (no further transition)', () => {
      expect(nextStatus('DELIVERED')).toBeNull();
    });

    it('does not skip states', () => {
      // ASSIGNED cannot jump to IN_TRANSIT or DELIVERED
      expect(nextStatus('ASSIGNED')).not.toBe('IN_TRANSIT');
      expect(nextStatus('ASSIGNED')).not.toBe('DELIVERED');
    });
  });

  describe('full transition chain', () => {
    it('follows the correct sequence end-to-end', () => {
      const chain: ServiceStatus[] = [];
      let current: ServiceStatus = 'ASSIGNED';

      while (canTransition(current)) {
        const next: ServiceStatus = nextStatus(current)!;
        chain.push(next);
        current = next;
      }

      expect(chain).toEqual(['ACCEPTED', 'IN_TRANSIT', 'DELIVERED']);
    });
  });
});
