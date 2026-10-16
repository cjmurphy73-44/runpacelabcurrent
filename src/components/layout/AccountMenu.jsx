import React from "react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { User, Settings, Megaphone, LogOut, Upload, HelpCircle, Gauge, Microscope, Check } from "lucide-react";
import { useUIPreferences } from "@/context/UIPreferencesContext";

// Collapses Settings / mode / guide / imports / feedback / logout into a
// single account button so the header right cluster stays minimal.
export default function AccountMenu({ onFeedback, onLogout }) {
  const { lens, setLens } = useUIPreferences();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Account"
          className="flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-accent"
        >
          <User className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Display mode
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => setLens("simplified")}
          className="flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <Gauge className="w-4 h-4" /> Standard
          </span>
          {lens === "simplified" && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setLens("scientific")}
          className="flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <Microscope className="w-4 h-4" /> Geek
          </span>
          {lens === "scientific" && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import data
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/guide" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> User guide
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            if (e && e.preventDefault) e.preventDefault();
            onFeedback();
          }}
          className="flex items-center gap-2"
        >
          <Megaphone className="w-4 h-4" /> Send feedback
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onLogout()} className="flex items-center gap-2 text-destructive">
          <LogOut className="w-4 h-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}