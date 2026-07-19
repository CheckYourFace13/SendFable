"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const cardClass =
  "border-ink/10 bg-page/95 shadow-sm shadow-ink/5";
const ctaClass = "bg-coral text-white hover:bg-coral-hover";


function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    if (params.get("verified") === "1") {
      toast.success("Email verified! You can sign in now.");
    }
    if (params.get("error") === "invalid-token") {
      toast.error("That link is invalid or has expired.");
    }
  }, [params]);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("email", { email, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      toast.error("Couldn't send the sign-in link. Try again.");
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <Card className={cardClass}>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-coral/15">
            <Mail className="h-6 w-6 text-coral" />
          </div>
          <CardTitle className="text-ink">Check your inbox</CardTitle>
          <CardDescription>
            We sent a magic sign-in link to <strong>{email}</strong>. It expires in 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-ink/60">
          Wrong address?{" "}
          <button className="text-coral underline underline-offset-2" onClick={() => setMagicSent(false)}>
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader>
        <CardTitle className="text-ink">Welcome back</CardTitle>
        <CardDescription>Sign in to your Sendfable account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="password">
          <TabsList className="mb-4 grid w-full grid-cols-2 bg-parchment">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="magic">Magic link</TabsTrigger>
          </TabsList>
          <TabsContent value="password">
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className={cn("w-full", ctaClass)} loading={loading}>
                Sign in
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="magic">
            <form onSubmit={handleMagic} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="magic-email">Email</Label>
                <Input id="magic-email" type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <Button type="submit" className={cn("w-full", ctaClass)} loading={loading}>
                Email me a sign-in link
              </Button>
              <p className="text-center text-xs text-ink/55">
                No password needed — works with any email address.
              </p>
            </form>
          </TabsContent>
        </Tabs>
        <p className="mt-6 text-center text-sm text-ink/60">
          New to Sendfable?{" "}
          <Link href="/signup" className="font-medium text-coral hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
