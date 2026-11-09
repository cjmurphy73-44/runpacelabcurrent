import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export function useProviderConnectionStatus(providerFunction, athleteId) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['provider-status', user?.id, athleteId, providerFunction],
    enabled: Boolean(user?.id), retry: false,
    queryFn: async () => {
      const { data } = await base44.functions.invoke(providerFunction, { action: 'status' });
      if (data?.error || data?.success === false || typeof data?.connected !== 'boolean') throw new Error('Connection status was incomplete');
      return data;
    },
    staleTime: 0, refetchOnWindowFocus: true,
  });
  return {
    status: query.isError ? { unknown: true } : query.data,
    loading: query.isFetching || query.isLoading,
    statusError: query.isError ? 'Connection status is unavailable. Retry the check before reconnecting.' : null,
    loadStatus: query.refetch,
  };
}
