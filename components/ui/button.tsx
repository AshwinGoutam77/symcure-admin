"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "warning"
  | "destructive"
  | "ghost"
  | "link";

export type ButtonSize =
  | "sm"
  | "default"
  | "lg"
  | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "cursor-pointer bg-[#438ae8] text-white border border-blue-600 hover:bg-[#016bff] hover:border-blue-700 active:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",

  primary:
    "cursor-pointer bg-[#438ae8] text-white border border-blue-600 hover:bg-[#016bff] hover:border-blue-700 active:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",

  secondary:
    "cursor-pointer bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",

  outline:
    "cursor-pointer bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",

  warning:
    "cursor-pointer bg-amber-500 text-white border border-amber-500 hover:bg-amber-600 hover:border-amber-600 active:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",

  destructive:
    "cursor-pointer bg-[#e7000bb0] text-white border border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600",

  ghost:
    "cursor-pointer bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",

  link:
    "cursor-pointer bg-transparent text-blue-600 border border-transparent hover:text-blue-700 active:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 rounded-sm px-3 text-[11px]",

  default:
    "h-9 rounded-sm px-3.5 text-[12px]",

  lg:
    "h-10 rounded-xl px-5 text-[12px]",

  icon:
    "h-9 w-9 rounded-sm p-0 text-[12px]",
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      type = "button",
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = buttonVariants({
      variant,
      size,
      className,
    });

if (asChild) {
  const child = React.Children.only(
    children,
  ) as React.ReactElement<any>;

  return React.cloneElement(child, {
    ...props,
    className: cn(
      classes,
      child.props?.className,
    ),
    ref,
  });
}

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };