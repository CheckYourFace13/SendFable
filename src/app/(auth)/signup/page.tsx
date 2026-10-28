"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { freePlanPromise } from "@/lib/plans";
import { trackClientEvent } from "@/components/marketing/marketing-analytics";
import { embedSnippet } from "@/lib/forms/install";
import { tryInstallSteps, type TryInstallPlatform } from "@/lib/try-signup/install";

const cardClass =
  "border-ink/10 bg-page/95 shadow-sm shadow-ink/5";
const ctaClass = "bg-coral-solid text-white hover:bg-coral-hover";

function SignupForm() {
  const searchParams = useSearchParams();
  const referralCode = useMemo(
    () => searchParams.get("ref")?.trim() || undefined,
    [searchParams]
  );
  const utmSource = useMemo(() => searchParams.get("utm_source")?.trim() || undefined, [searchParams]);
  const utmMedium = useMemo(() => searchParams.get("utm_medium")?.trim() || undefined, [searchParams]);
  const utmCampaign = useMemo(() => searchParams.get("utm_campaign")?.trim() || undefined, [searchParams]);
  const utmContent = useMemo(() => searchParams.get("utm_content")?.trim() || undefined, [searchParams]);
  const resumeTemplate = useMemo(
    () => searchParams.get("template")?.trim() || undefined,
    [searchParams]
  );
  const resumeGoal = useMemo(
    () => searchParams.get("goal")?.trim() || undefined,
    [searchParams]
  );
  const tryToken = useMemo(() => {
    const fromQuery = searchParams.get("try")?.trim();
    if (fromQuery) return fromQuery;
    try {
      return localStorage.getItem("sf_try_signup")?.trim() || undefined;
    } catch {
      return undefined;
    }
  }, [searchParams]);
  useEffect(() => {
    trackClientEvent("signup_start");
    if (tryToken) {
      void fetch("/api/try/signup-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tryToken, event: "signup_started" }),
      }).catch(() => undefined);
    }
  }, [tryToken]);
  const loginHref = useMemo(() => {
    const q = new URLSearchParams();
    if (resumeTemplate) {
      q.set(
        "callbackUrl",
        `/campaigns/new?template=${encodeURIComponent(resumeTemplate)}${
          resumeGoal ? `&goal=${encodeURIComponent(resumeGoal)}` : ""
        }`
      );
    } else if (tryToken) {
      q.set("try", tryToken);
      q.set("callbackUrl", "/forms");
    } else {
      q.set("callbackUrl", "/onboarding");
    }
    return `/login?${q.toString()}`;
  }, [resumeTemplate, resumeGoal, tryToken]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [activatedFormId, setActivatedFormId] = useState<string | null>(null);
  const [hostedSlug, setHostedSlug] = useState<string | null>(null);
  const [livePlatform, setLivePlatform] = useState<TryInstallPlatform>("wordpress");
  const [liveDisplay, setLiveDisplay] = useState<"inline" | "popup">("inline");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedPolicies) {
      toast.error("Please agree to the Terms, Acceptable Use, and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          referralCode,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          tryToken,
          acceptedPolicies: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }
      if (resumeTemplate) {
        try {
          localStorage.setItem(
            "sf_resume_template",
            JSON.stringify({ slug: resumeTemplate, goal: resumeGoal || "scratch", at: Date.now() })
          );
        } catch {
          /* ignore */
        }
      }
      if (typeof data.formId === "string" && data.formId) {
        setActivatedFormId(data.formId);
      }
      if (typeof data.hostedSlug === "string" && data.hostedSlug) {
        setHostedSlug(data.hostedSlug);
      }
      if (data.platform === "wix" || data.platform === "squarespace" || data.platform === "webflow" || data.platform === "other") {
        setLivePlatform(data.platform);
      }
      if (data.display === "popup") setLiveDisplay("popup");
      if (data.formId) {
        try {
          localStorage.removeItem("sf_try_signup");
        } catch {
          /* ignore */
        }
      }
      trackClientEvent("signup_completed");
      if (data.formId) trackClientEvent("real_signup_tool_created");
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done && tryToken && hostedSlug) {
    const snippet = embedSnippet("https://sendfable.com", hostedSlug, {
      display: liveDisplay,
      trigger: liveDisplay === "popup" ? "delay" : "immediate",
      delaySeconds: 5,
      frequency: "once",
      scrollPercent: 50,
    });
    const formUrl = activatedFormId
      ? `/forms/${activatedFormId}?live=1&platform=${livePlatform}`
      : "/forms";
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-ink">Your signup is live.</CardTitle>
          <CardDescription>
            Copy this code onto your website. Then verify <strong>{email}</strong> so you can send.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            className={cn("w-full", ctaClass)}
            onClick={() => {
              void navigator.clipboard.writeText(snippet);
              setCopied(true);
              trackClientEvent("code_copied");
            }}
          >
            {copied ? "Copied" : "Copy code"}
          </Button>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-parchment p-3 text-xs">
            {snippet}
          </pre>
          <div>
            <p className="text-sm font-medium text-ink">Put this on your website</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink/80">
              {tryInstallSteps(livePlatform).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <Button asChild className={cn("w-full", ctaClass)}>
            <Link href={`/login?callbackUrl=${encodeURIComponent(formUrl)}`}>
              Continue to your signup
            </Link>
          </Button>
          <p className="text-center text-sm">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent("/tags")}`}
              className="text-coral underline-offset-2 hover:underline"
            >
              Create another audience
            </Link>
          </p>
        </CardContent>
      </Card>
    );
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
            <Link href={loginHref}>Continue to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader>
        <h1 className="font-semibold leading-none tracking-tight text-ink">
          Create your account
        </h1>
        <CardDescription>
          {tryToken
            ? `Make this signup live. ${freePlanPromise()} Any email address works. No credit card required.`
            : `${freePlanPromise()} Any email address works. No credit card required.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex items-start gap-3 rounded-lg border border-ink/10 bg-parchment/50 p-3">
            <Checkbox
              id="accept-policies"
              checked={acceptedPolicies}
              onCheckedChange={(v) => setAcceptedPolicies(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="accept-policies" className="text-xs font-normal leading-relaxed text-ink/80">
              I agree to the{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
                Terms of Service
              </Link>
              , including the{" "}
              <Link href="/acceptable-use" className="underline underline-offset-2 hover:text-ink">
                Acceptable Use Policy
              </Link>
              , the{" "}
              <Link href="/refund-policy" className="underline underline-offset-2 hover:text-ink">
                Billing &amp; Refund Policy
              </Link>
              , and the{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
                Privacy Policy
              </Link>
              . The Free plan does not create a paid subscription or automatic renewal.
            </Label>
          </div>
          <Button type="submit" className={cn("w-full", ctaClass)} loading={loading} disabled={!acceptedPolicies}>
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link href={loginHref} className="font-medium text-coral hover:underline">Sign in</Link>
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
