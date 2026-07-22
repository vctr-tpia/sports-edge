import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-brand text-white hover:bg-[#8f7aff] focus-visible:outline-brand",
  secondary:
    "border-borderStrong bg-white/[0.04] text-ink hover:bg-white/[0.08]",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition duration-200",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition duration-200",
        variantClasses[variant],
        className,
      )}
    >
      {leadingIcon}
      {children}
    </Link>
  );
}
