import React from 'react';

interface PhysiologyMetrics {
  fitness: number;
  fatigue: number;
  form?: number;
}

export function PhysiologyLabDashboard({ metrics = { fitness: 0, fatigue: 0 } }: { metrics?: PhysiologyMetrics }) {
  const metricEntries = [
    { label: 'Fitness (CTL)', value: metrics.fitness },
    { label: 'Fatigue (ATL)', value: metrics.fatigue },
    { label: 'Form (TSB)', value: metrics.form ?? (metrics.fitness - metrics.fatigue) },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Physiology Lab Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
        {metricEntries.map((item) => (
          <div key={item.label} className="p-4 bg-card rounded-lg border">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <p className="text-2xl font-semibold">{Math.round(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
