import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-foreground text-background hover:bg-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]",
        accent:
          "bg-accent text-[#04121a] hover:bg-[#8af0fa] shadow-[0_0_0_1px_rgba(100,227,240,0.35),0_10px_30px_-12px_rgba(100,227,240,0.5)]",
        outline:
          "border border-line-strong bg-transparent text-foreground hover:border-accent/60 hover:bg-accent-soft/40",
        ghost: "bg-transparent text-muted hover:bg-surface hover:text-foreground",
        subtle: "bg-surface text-foreground border border-line hover:border-line-strong hover:bg-surface-2",
        danger:
          "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 hover:border-danger/50",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[0.95rem]",
        icon: "size-9 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
