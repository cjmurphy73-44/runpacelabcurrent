import React from "react";

// Reusable anchored section used across the guide. `id` is the anchor inline
// help links jump to. scroll-mt keeps the heading clear of the sticky header.
export default function GuideSection({ id, icon: Icon, title, description, children }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-heading font-bold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}