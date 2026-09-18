import { useState, useEffect } from 'react';
import { userService } from '@/services/userService';

export const useUserData = (userId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await userService.getUserProfile(userId);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  return { data, loading, error };
};
