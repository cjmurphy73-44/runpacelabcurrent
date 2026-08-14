import React from "react";

export default function SectionHeading({ title, description, icon: Icon, action }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-base font-heading font-semibold text-foreground">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}