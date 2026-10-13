import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn("w-full rounded-xl border border-line bg-[color-mix(in_srgb,var(--bg)_70%,var(--panel))] px-3 py-2.5 text-ivory", className)}
      {...props}
    />
  );
});
