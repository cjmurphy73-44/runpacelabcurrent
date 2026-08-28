import React from "react";

export default function PageShell({ title, description, icon: Icon, maxWidth = "max-w-6xl", actions, children }) {
  return (
    <div className={`${maxWidth} mx-auto`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-8 pb-5 border-b border-border">
          <div className="min-w-0">
            {title && (
              <h1 className="flex items-center gap-2 text-2xl font-display font-bold tracking-tight">
                {Icon && <Icon className="w-5 h-5 text-primary" />}
                {title}
              </h1>
            )}
            {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div className="space-y-10">{children}</div>
    </div>
  );
}