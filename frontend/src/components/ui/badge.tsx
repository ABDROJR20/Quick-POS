import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-600 text-white shadow hover:bg-emerald-500",
        secondary:
          "border-transparent bg-slate-800 text-slate-200 hover:bg-slate-700",
        destructive:
          "border-transparent bg-red-600 text-white shadow hover:bg-red-500",
        outline: "text-slate-300 border-slate-700",
        success: "border-emerald-600/30 bg-emerald-950/60 text-emerald-400",
        warning: "border-amber-600/30 bg-amber-950/60 text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
