import React from "react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User, Settings, Megaphone, LogOut } from "lucide-react";

// Collapses Settings / Feedback / Logout into a single account button so the
// header right cluster stays small — especially on mobile, where individual
// icon buttons for each used to crowd the bar.
export default function AccountMenu({ onFeedback, onLogout }) {
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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> Settings
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