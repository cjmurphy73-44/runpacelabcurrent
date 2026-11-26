import React from "react";

export default function SectionHeading({ title, description, icon: Icon, action }) {
  return (
    <div className="border-b border-border pb-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex items-center gap-2.5">
          <h2 className="flex items-center gap-2 text-sm font-heading font-semibold tracking-tight text-foreground">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
            {title}
          </h2>
        </div>
        {action && <div className="max-w-full">{action}</div>}
      </div>
      {description && <p className="text-sm text-muted-foreground mt-1.5">{description}</p>}
    </div>
  );
}
