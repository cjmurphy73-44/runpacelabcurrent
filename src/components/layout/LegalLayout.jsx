import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicFooter from "@/components/layout/PublicFooter";

export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/landing" className="font-heading font-bold">TrainPaceLab</Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/landing"><ArrowLeft className="w-4 h-4" />Back</Link>
          </Button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-heading text-3xl font-bold">{title}</h1>
        {updated && <p className="mt-1 text-xs text-muted-foreground">Last updated: {updated}</p>}
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}