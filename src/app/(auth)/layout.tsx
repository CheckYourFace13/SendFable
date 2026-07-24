import { Logo } from "@/components/logo";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-page px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-parchment via-page to-page" />
      <Logo variant="lockup" className="mb-8 h-9 w-auto" />
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-xs text-ink/70">
        By continuing you agree to our{" "}
        <a href="/terms" className="underline underline-offset-2 hover:text-ink">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
