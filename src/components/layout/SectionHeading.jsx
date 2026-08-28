import React from "react";

export default function SectionHeading({ index, title, description, icon: Icon, action }) {
  return (
    <div className="border-b border-border pb-3">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex items-center gap-2.5">
          {index && (
            <span className="text-xs font-mono tabular-nums font-semibold text-primary tracking-wider">{index}</span>
          )}
          <h2 className="flex items-center gap-2 text-sm font-heading font-semibold tracking-tight text-foreground">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            {title}
          </h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {description && <p className="text-sm text-muted-foreground mt-1.5">{description}</p>}
    </div>
  );
}