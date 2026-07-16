"use client";

import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface InfoTooltipProps {
  content: string;
}

export function InfoTooltip({ content }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={content}
        className="inline-flex text-muted-foreground/70 outline-none hover:text-foreground"
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
