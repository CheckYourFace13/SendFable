import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-gradient flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8 text-2xl" />
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
        <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
      </p>
    </div>
  );
}
