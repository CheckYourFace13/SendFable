import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  href?: string;
  variant?: "lockup" | "mark" | "wordmark";
  tone?: "light" | "dark";
  priority?: boolean;
};

export function Logo({
  className,
  href = "/",
  variant = "lockup",
  tone = "light",
}: LogoProps) {
  const src =
    variant === "mark"
      ? tone === "dark"
        ? "/brand/sendfable-mark-dark.svg"
        : "/brand/sendfable-mark.svg"
      : variant === "wordmark"
        ? "/brand/sendfable-wordmark.svg"
        : tone === "dark"
          ? "/brand/sendfable-lockup-dark.svg"
          : "/brand/sendfable-lockup.svg";

  const img = (
    // Prefer native <img> for local SVG brand assets (reliable, no optimizer quirks).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="sendfable"
      width={variant === "mark" ? 32 : 168}
      height={variant === "mark" ? 32 : 36}
      className={cn(
        "h-8 w-auto",
        variant === "mark" && "h-8 w-8",
        variant === "wordmark" && "h-7 w-auto",
        className
      )}
      decoding="async"
    />
  );

  if (!href) return img;
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
      aria-label="sendfable home"
    >
      {img}
    </Link>
  );
}
