import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[linear-gradient(90deg,var(--accent-blue)_0%,var(--accent-cyan)_100%)] text-white shadow-[0_14px_28px_rgba(46,194,255,0.16)] hover:brightness-110 focus-visible:outline-brand",
  secondary:
    "border-borderSubtle bg-surface3 text-ink hover:bg-surface4",
  ghost:
    "border-transparent bg-transparent text-inkSecondary hover:bg-white/[0.05] hover:text-ink",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  leadingIcon?: ReactNode;
};

export function Button({
  className,
  variant = "secondary",
  leadingIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border px-4 py-2 text-[14px] font-medium transition duration-200",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  leadingIcon?: ReactNode;
};

export function ButtonLink({
  href,
  children,
  className,
  variant = "secondary",
  leadingIcon,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border px-4 py-2 text-[14px] font-medium transition duration-200",
        variantClasses[variant],
        className,
      )}
    >
      {leadingIcon}
      {children}
    </Link>
  );
}
