import React from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold">
            <Activity className="w-4 h-4 text-primary" />
            <span>TrainPaceLab</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/refund" className="hover:text-foreground">Refund Policy</Link>
            <Link to="/" className="hover:text-foreground">Home</Link>
          </nav>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} TrainPaceLab. All rights reserved. TrainPaceLab is a training-intelligence
          tool and does not provide medical advice; consult a qualified professional for injury or health concerns.
        </p>
      </div>
    </footer>
  );
}