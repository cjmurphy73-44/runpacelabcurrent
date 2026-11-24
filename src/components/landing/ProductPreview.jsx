import React from "react";

const TREND = [
  [28, 22], [32, 30], [36, 27], [41, 34],
  [45, 31], [49, 29], [54, 33], [58, 30],
];

const STATS = [
  { label: "Fitness", value: "58", unit: "CTL" },
  { label: "Form", value: "+28", unit: "TSB" },
  { label: "Readiness", value: "82", unit: "/ 100" },
];

export default function ProductPreview() {
  return (
    <section aria-label="Example athlete dashboard" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl shadow-primary/10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
        <h2 className="font-heading text-sm font-semibold">Athlete dashboard</h2>
        <p className="text-xs text-muted-foreground">Example data</p>
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Today’s session</p>
          <p className="mt-1 font-heading text-xl font-semibold">Threshold intervals</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          {STATS.map(({ label, value, unit }) => (
            <div key={label} className="min-w-0 rounded-lg border border-border bg-muted/30 p-2.5 sm:p-3">
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 flex flex-wrap items-baseline gap-x-1">
                <span className="font-heading text-2xl font-bold tabular-nums sm:text-3xl">{value}</span>
                <span className="text-[11px] text-muted-foreground">{unit}</span>
              </dd>
            </div>
          ))}
        </dl>
        <figure className="rounded-lg border border-border p-3 sm:p-4">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">Fitness and fatigue</span>
            <span className="text-xs text-muted-foreground">8 weeks</span>
          </figcaption>
          <div className="my-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-primary" aria-hidden="true" /> Fitness</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-muted-foreground/50" aria-hidden="true" /> Fatigue</span>
          </div>
          <div aria-hidden="true" className="grid grid-cols-8 gap-1 sm:gap-2">
            {TREND.map(([fitness, fatigue], index) => (
              <div key={index} className="min-w-0">
                <div className="flex h-24 items-end justify-center gap-0.5 border-b border-border sm:h-32 sm:gap-1">
                  <span className="w-[38%] max-w-5 rounded-t-sm bg-primary" style={{ height: `${fitness / 60 * 100}%` }} />
                  <span className="w-[38%] max-w-5 rounded-t-sm bg-muted-foreground/50" style={{ height: `${fatigue / 60 * 100}%` }} />
                </div>
                <p className="mt-1.5 text-center text-[10px] tabular-nums text-muted-foreground">W{index + 1}</p>
              </div>
            ))}
          </div>
          <table className="sr-only">
            <caption>Example weekly fitness and fatigue values</caption>
            <thead><tr><th scope="col">Week</th><th scope="col">Fitness</th><th scope="col">Fatigue</th></tr></thead>
            <tbody>
              {TREND.map(([fitness, fatigue], index) => (
                <tr key={index}><th scope="row">{index + 1}</th><td>{fitness}</td><td>{fatigue}</td></tr>
              ))}
            </tbody>
          </table>
        </figure>
      </div>
    </section>
  );
}
