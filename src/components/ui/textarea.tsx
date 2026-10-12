import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn("min-h-28 w-full resize-y rounded-xl border border-line bg-[color-mix(in_srgb,var(--bg)_70%,var(--panel))] px-3 py-2.5 text-ivory", className)}
      {...props}
    />
  );
});
