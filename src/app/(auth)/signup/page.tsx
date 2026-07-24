"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const cardClass =
  "border-ink/10 bg-page/95 shadow-sm shadow-ink/5";
const ctaClass = "bg-coral text-white hover:bg-coral-hover";

function SignupForm() {
  const searchParams = useSearchParams();
  const referralCode = useMemo(
    () => searchParams.get("ref")?.trim() || undefined,
    [searchParams]
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          workspaceName: workspaceName || undefined,
          referralCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className={cardClass}>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal/15">
            <MailCheck className="h-6 w-6 text-teal" />
          </div>
          <CardTitle className="text-ink">Verify your email</CardTitle>
          <CardDescription>
            We sent a verification link to <strong>{email}</strong>. You can sign in right away —
            verifying unlocks sending.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild className={cn("w-full", ctaClass)}>
            <Link href="/login">Continue to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader>
        <CardTitle className="text-ink">Create your account</CardTitle>
        <CardDescription>
          Free for up to 500 contacts and 2,000 emails/month. Any email address works.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" required maxLength={80} value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={8} autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workspace">
              Business or project name <span className="text-ink/45">(optional)</span>
            </Label>
            <Input id="workspace" maxLength={80} value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Acme Bakery" />
          </div>
          <Button type="submit" className={cn("w-full", ctaClass)} loading={loading}>
            Create account
          </Button>
          <p className="text-center text-xs text-ink/55">
            By creating an account you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
              Terms of Service
            </Link>
            , including the{" "}
            <Link href="/acceptable-use" className="underline underline-offset-2 hover:text-ink">
              Acceptable Use Policy
            </Link>
            , and the{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
        <p className="mt-6 text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-coral hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
