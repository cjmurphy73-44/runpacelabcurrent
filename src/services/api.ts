const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface WorkoutImportResponse {
  status: string;
  filename: string;
  trimp?: number;
  message: string;
}

export async function uploadWorkoutFile(
  file: File,
  options: { sex?: string; restingHr?: number; maxHr?: number } = {}
): Promise<WorkoutImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams({
    sex: options.sex || 'male',
    resting_hr: String(options.restingHr || 50),
    max_hr: String(options.maxHr || 190),
  });

  const response = await fetch(`${API_BASE_URL}/workouts/import?${params.toString()}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
    throw new Error(errorData.detail || `Failed to upload workout: ${response.statusText}`);
  }

  return response.json();
}
