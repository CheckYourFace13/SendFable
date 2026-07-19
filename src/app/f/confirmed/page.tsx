import { Logo } from "@/components/logo";

export default function FormConfirmedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Logo className="mb-8 text-2xl" />
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Subscription confirmed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;re on the list. Thanks for confirming.
        </p>
      </div>
    </div>
  );
}
