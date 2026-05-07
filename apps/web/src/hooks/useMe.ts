import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useMe() {
  const userQuery = useQuery({
    queryKey: ['me'],
    queryFn: api.auth.me,
    retry: false,
  });

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: api.groups.list,
    enabled: !!userQuery.data,
    retry: false,
  });

  const group = groupsQuery.data?.[0] ?? null;

  return {
    user: userQuery.data ?? null,
    group,
    isHost: group?.role === 'host',
    isAuthenticated: !!userQuery.data,
    isLoading: userQuery.isLoading || (!!userQuery.data && groupsQuery.isLoading),
  };
}
