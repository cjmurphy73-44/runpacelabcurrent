import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { computeInjurySignal } from '@/lib/coachInjurySignal';

export function useCoachInjurySignal(athleteId) {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ['coach-signal', user?.id, athleteId];
  useEffect(() => {
    if (!user?.id || !athleteId || typeof base44.entities?.CoachMessage?.subscribe !== 'function') return;
    try {
      return base44.entities.CoachMessage.subscribe(event => {
        if (!event.data?.athlete_id || event.data.athlete_id === athleteId) {
          client.invalidateQueries({ queryKey: ['coach-signal', user.id, athleteId] });
        }
      });
    } catch { /* Window-focus and bounded polling remain available. */ }
  }, [athleteId, user?.id, client]);
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user?.id && athleteId),
    queryFn: async () => {
      const { data } = await base44.functions.invoke('reviewCoachSignal', { action: 'read', athlete_id: athleteId });
      if (!Array.isArray(data?.messages) || typeof data?.revision !== 'string') throw new Error('Incomplete review response');
      return data;
    },
    staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 60000, retry: 1,
  });
  const mutation = useMutation({
    mutationFn: async (sourceKeys) => {
      if (!query.data?.revision) throw new Error('Refresh the conversation before reviewing');
      const displayedKeys = computeInjurySignal(query.data.messages).evidence.map(entry => entry.review_key);
      const selectedKeys = sourceKeys ?? displayedKeys;
      if (!Array.isArray(selectedKeys) || !selectedKeys.length || selectedKeys.some(key => typeof key !== 'string' || !displayedKeys.includes(key))) {
        throw new Error('Select the displayed guidance to clear');
      }
      const { data } = await base44.functions.invoke('reviewCoachSignal', {
        action: 'resolve', athlete_id: athleteId, revision: query.data.revision,
        source_keys: [...new Set(selectedKeys)],
      });
      if (data?.success !== true) throw new Error('Review was not saved');
    },
    onSuccess: async () => { await client.invalidateQueries({ queryKey: key }); },
    onError: async () => { await client.invalidateQueries({ queryKey: key }); },
  });
  return {
    ...computeInjurySignal(query.data?.messages || []),
    loading: query.isLoading, error: query.error,
    saving: mutation.isPending, saveError: mutation.error,
    resolve: mutation.mutateAsync,
    refresh: async () => {
      const result = await query.refetch();
      if (!result.error) mutation.reset();
      return result;
    },
  };
}
