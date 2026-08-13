import * as React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoTooltip({ content }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-1.5 inline-flex items-center justify-center">
            <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
