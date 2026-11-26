import React from "react";

const TREND = [
  [28, 22], [32, 30], [36, 27], [41, 34],
  [45, 31], [49, 29], [54, 33], [58, 30],
];

const STATS = [
  { label: "Fitness", value: "58" },
  { label: "Fatigue", value: "30" },
  { label: "Form", value: "+28" },
];

export default function ProductPreview() {
  return (
    <figure className="min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-heading text-base font-semibold">Fitness and fatigue</span>
        <p className="text-xs text-muted-foreground">Example data</p>
      </figcaption>
      <dl className="my-4 grid grid-cols-3 gap-2 border-y border-border py-3">
        {STATS.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-heading text-2xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div aria-hidden="true" className="grid grid-cols-8 gap-1 sm:gap-2">
        {TREND.map(([fitness, fatigue], index) => (
          <div key={index} className="min-w-0">
            <div className="flex h-24 items-end justify-center gap-0.5 border-b border-border sm:h-28 sm:gap-1">
              <span className="w-[38%] max-w-5 rounded-t-sm bg-primary" style={{ height: `${fitness / 60 * 100}%` }} />
              <span className="w-[38%] max-w-5 rounded-t-sm bg-muted-foreground/50" style={{ height: `${fatigue / 60 * 100}%` }} />
            </div>
            <p className="mt-1.5 text-center text-[10px] tabular-nums text-muted-foreground">W{index + 1}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" aria-hidden="true" /> Fitness</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-muted-foreground/50" aria-hidden="true" /> Fatigue</span>
      </div>
      <div className="sr-only">
        <table>
          <caption>Example weekly fitness and fatigue values</caption>
          <thead><tr><th scope="col">Week</th><th scope="col">Fitness</th><th scope="col">Fatigue</th></tr></thead>
          <tbody>
            {TREND.map(([fitness, fatigue], index) => (
              <tr key={index}><th scope="row">{index + 1}</th><td>{fitness}</td><td>{fatigue}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
