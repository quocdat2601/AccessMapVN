import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", {
  variants: {
    variant: {
      neutral: "border-slate-200 bg-slate-50 text-slate-600",
      teal: "border-teal-100 bg-teal-50 text-teal-700",
      amber: "border-amber-100 bg-amber-50 text-amber-700",
      red: "border-red-100 bg-red-50 text-red-700",
      blue: "border-blue-100 bg-blue-50 text-blue-700",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
