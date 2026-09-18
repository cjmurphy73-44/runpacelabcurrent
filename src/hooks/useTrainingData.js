import { useState, useEffect } from 'react';
import { trainingService } from '@/services/trainingService';

export const useTrainingData = (timeRange) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await trainingService.getTrainingLoad(timeRange);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  return { data, loading, error };
};
