import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { apiClient } from '../services/api';
import { useShiftStore, CachedShift } from '../stores/shiftStore';

export interface SwapRequestPayload {
  shiftId: string;
  targetUserId?: string | null;
  targetShiftId?: string | null;
  reason?: string;
}

export interface ShiftItem {
  id: string;
  roleTitle?: string;
  roleAndVenue?: string;
  timeRange?: string;
  startTime?: string;
  endTime?: string;
  status: string;
  swapStatus?: string;
  assignedToId?: string | null;
  assignedToName?: string;
  isRequestingSwap?: boolean;
  [key: string]: unknown;
}

interface MutationContext {
  previousShifts?: ShiftItem[];
  previousStoreShifts?: CachedShift[];
}

/**
 * ============================================================================
 * Optimistic Shift Swap Mutation Hook
 * ============================================================================
 * 
 * Implements three-tier optimistic state update with rollback:
 * - onMutate: Cancel queries, snapshot previous cache, mark shift "Awaiting approval".
 * - onError: Roll back cache to snapshot and show user alert.
 * - onSettled: Invalidate ['shifts'] and ['activities'] to reconcile with backend.
 */
export function useOptimisticSwap() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, SwapRequestPayload, MutationContext>({
    mutationFn: async (payload: SwapRequestPayload) => {
      const response = await apiClient.post('/api/swaps/request', {
        shiftId: payload.shiftId,
        targetUserId: payload.targetUserId || null,
        targetShiftId: payload.targetShiftId || null,
        reason: payload.reason || 'Shift swap request'
      });
      return response.data?.data;
    },
    onMutate: async (newSwap: SwapRequestPayload) => {
      // 1. Cancel ongoing shift queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['shifts'] });

      // 2. Snapshot previous cache
      const previousShifts = queryClient.getQueryData<ShiftItem[]>(['shifts']);
      const previousStoreShifts = useShiftStore.getState().upcomingShifts;

      // 3. Optimistically mark target shift as "Awaiting approval" in Query cache
      if (previousShifts) {
        queryClient.setQueryData<ShiftItem[]>(['shifts'], (old?: ShiftItem[]) => {
          if (!old) return [];
          return old.map((shift: ShiftItem) =>
            shift.id === newSwap.shiftId
              ? {
                  ...shift,
                  status: 'Awaiting approval',
                  swapStatus: 'Awaiting approval',
                  isRequestingSwap: true
                }
              : shift
          );
        });
      }

      // Optimistically update persisted Zustand store
      useShiftStore.getState().updateShiftSwapStatus(newSwap.shiftId, 'Awaiting approval');

      // Return context containing snapshot for rollback
      return { previousShifts, previousStoreShifts };
    },
    onError: (err: Error, _newSwap: SwapRequestPayload, context?: MutationContext) => {
      // Roll back the cache to the stored snapshot
      if (context?.previousShifts) {
        queryClient.setQueryData(['shifts'], context.previousShifts);
      }
      if (context?.previousStoreShifts) {
        useShiftStore.getState().setUpcomingShifts(context.previousStoreShifts);
      }

      // Display error alert
      Alert.alert(
        'Shift Swap Failed',
        err.message || 'Unable to request shift swap. Reverting changes.'
      );
    },
    onSettled: async () => {
      // Invalidate ['shifts'] and ['activities'] to synchronize with server state
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      await queryClient.invalidateQueries({ queryKey: ['swaps'] });
    }
  });
}
