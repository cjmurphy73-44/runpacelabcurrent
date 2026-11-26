import React from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-5 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 font-heading text-sm font-bold">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>TrainPaceLab</span>
          </Link>
          <nav aria-label="Support and legal links" className="flex flex-wrap items-center gap-x-5 text-sm text-muted-foreground [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a:hover]:text-foreground">
            <Link to="/support">Support</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund">Refunds</Link>
          </nav>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          © {new Date().getFullYear()} TrainPaceLab. TrainPaceLab does not provide medical advice. For injury or health concerns, consult a healthcare professional.
        </p>
      </div>
    </footer>
  );
}
