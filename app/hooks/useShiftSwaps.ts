import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../src/services/api';

export interface RequestSwapPayload {
  shiftId: string;
  targetUserId?: string | null;
  reason?: string;
  targetUserName?: string;
}

export interface ShiftItem {
  id: string;
  roleTitle: string;
  venue?: string;
  location?: string;
  startTime: string;
  endTime: string;
  status: string;
  assignedToId?: string | null;
  assignedToName?: string;
  swapStatus?: string;
  isRequestingSwap?: boolean;
}

/**
 * useShiftSwaps
 * TanStack Mutation hook for optimistic shift swap requests.
 */
export function useShiftSwaps() {
  const queryClient = useQueryClient();

  const requestSwapMutation = useMutation({
    mutationFn: async (payload: RequestSwapPayload) => {
      const response = await apiClient.post('/api/swaps/request', {
        shiftId: payload.shiftId,
        targetUserId: payload.targetUserId || null,
        reason: payload.reason || 'Shift swap request'
      });
      return response.data.data;
    },
    onMutate: async (newSwapPayload) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['shifts'] });
      await queryClient.cancelQueries({ queryKey: ['swaps'] });

      // Snapshot previous shifts
      const previousShifts = queryClient.getQueryData<ShiftItem[]>(['shifts']);

      // Optimistically update shifts cache
      if (previousShifts) {
        queryClient.setQueryData<ShiftItem[]>(['shifts'], (old) => {
          if (!old) return [];
          return old.map((shift) => {
            if (shift.id === newSwapPayload.shiftId) {
              return {
                ...shift,
                swapStatus: 'PENDING',
                isRequestingSwap: true
              };
            }
            return shift;
          });
        });
      }

      return { previousShifts };
    },
    onError: (err, newSwapPayload, context) => {
      // Roll back to snapshot on error
      if (context?.previousShifts) {
        queryClient.setQueryData(['shifts'], context.previousShifts);
      }
    },
    onSettled: () => {
      // Invalidate and refetch shifts, swaps, and activity feed
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['swaps'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    }
  });

  return {
    requestSwapMutation,
    requestSwap: requestSwapMutation.mutate,
    requestSwapAsync: requestSwapMutation.mutateAsync,
    isPending: requestSwapMutation.isPending,
    isError: requestSwapMutation.isError,
    error: requestSwapMutation.error
  };
}
