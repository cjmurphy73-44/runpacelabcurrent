import React, { useState } from 'react';
import { uploadWorkoutFile, WorkoutImportResponse } from '../services/api';

export default function WorkoutUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [sex, setSex] = useState<string>('male');
  const [restingHr, setRestingHr] = useState<number>(50);
  const [maxHr, setMaxHr] = useState<number>(190);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkoutImportResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a workout file.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadWorkoutFile(file, { sex, restingHr, maxHr });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to upload workout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Upload Workout File</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Workout File (.fit, .tcx, .csv)</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Sex</label>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Resting HR</label>
          <input
            type="number"
            value={restingHr}
            onChange={(e) => setRestingHr(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Max HR</label>
          <input
            type="number"
            value={maxHr}
            onChange={(e) => setMaxHr(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload Workout'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md text-sm space-y-1">
          <p><strong>Status:</strong> {result.status}</p>
          <p><strong>Filename:</strong> {result.filename}</p>
          <p><strong>Message:</strong> {result.message}</p>
          {result.trimp !== undefined && <p><strong>TRIMP:</strong> <strong>{result.trimp}</strong></p>}
        </div>
      )}
    </div>
  );
}