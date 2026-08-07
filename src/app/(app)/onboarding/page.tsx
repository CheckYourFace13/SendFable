"use client";

/**
 * Activation onboarding — 4 guided steps (skippable).
 * Goal: business basics + sender + contacts → first campaign.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CAMPAIGN_GOALS } from "@/lib/campaign-goals";
import { track } from "@/lib/track";

const STEPS = [
  "Your business",
  "Who you're sending from",
  "Add people",
  "Create your first email",
] as const;

const TOTAL_STEPS = STEPS.length;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("announce");
  const [progress, setProgress] = useState({ verifiedSenders: 0, contacts: 0, campaigns: 0 });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/onboarding");
      const data = await res.json();
      if (data.completedAt) {
        router.replace("/dashboard");
        return;
      }
      const rawStep = typeof data.step === "number" ? data.step : 0;
      // Migrate users mid-old flows into the shorter path.
      setStep(Math.min(Math.max(0, rawStep > 3 ? 3 : rawStep), TOTAL_STEPS - 1));
      setName(data.workspace?.name || "");
      setAddress(data.workspace?.mailingAddress || "");
      setDescription(data.workspace?.businessDescription || "");
      setProgress(data.progress || { verifiedSenders: 0, contacts: 0, campaigns: 0 });
      setLoading(false);
      if (!started) {
        setStarted(true);
        track("onboarding_started");
      }
    })();
  }, [router, started]);

  async function save(patch: Record<string, unknown>) {
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not save");
      return false;
    }
    return true;
  }

  async function refreshProgress() {
    const res = await fetch("/api/onboarding");
    const data = await res.json();
    if (data.progress) setProgress(data.progress);
  }

  async function next() {
    const workspace = {
      name,
      mailingAddress: address || null,
      businessDescription: description || null,
    };
    if (step === 0 && !address.trim()) {
      toast.error("Add a physical mailing address — it's required in every email footer.");
      return;
    }
    const ok = await save({
      step: Math.min(step + 1, TOTAL_STEPS - 1),
      data: { goal },
      workspace,
    });
    if (ok) {
      track("onboarding_step_completed", { step: step + 1, name: STEPS[step] });
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
      void refreshProgress();
    }
  }

  async function skipAll() {
    await save({ skip: true, step: TOTAL_STEPS });
    track("onboarding_skipped", { fromStep: step + 1 });
    router.push("/dashboard");
  }

  async function finish() {
    await save({ complete: true, step: TOTAL_STEPS, data: { goal } });
    track("onboarding_completed", { goal });
    router.push("/campaigns/new?goal=" + goal);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading your setup…</div>;
  }

  const pct = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Let&apos;s send your first email</h1>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of {TOTAL_STEPS}: {STEPS[step]}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void skipAll()}>
          Skip for now
        </Button>
      </div>
      <Progress value={pct} className="mb-8" />

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Just the basics for your email footer — you can refine branding later.
            </p>
            <div>
              <Label>Business name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Bakery"
                className="min-h-11"
              />
            </div>
            <div>
              <Label>Physical mailing address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="123 Main St, City, ST 12345"
                className="min-h-[5.5rem]"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Required by law in every email you send.
              </p>
            </div>
            <div>
              <Label>What do you do? (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Neighborhood coffee shop with weekend brunch…"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 text-sm">
            <p>
              Verify the email address you&apos;ll send from. Stay on this path — after you verify,
              come back here and continue.
            </p>
            <p className="text-muted-foreground">
              Verified senders so far: <strong>{progress.verifiedSenders}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="min-h-11">
                <Link href="/settings/senders?from=onboarding">Add / verify sender</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => void refreshProgress()}
              >
                I verified — refresh
              </Button>
            </div>
            {progress.verifiedSenders > 0 ? (
              <p className="text-emerald-700">Sender verified — you can continue.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                You can continue and finish verification before you launch.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-sm">
            <p>
              Import a spreadsheet or add people who asked to hear from you. You can skip and add
              them when you pick who receives the email.
            </p>
            <p className="text-muted-foreground">
              Contacts so far: <strong>{progress.contacts}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="min-h-11">
                <Link href="/contacts/import?from=onboarding">Import CSV</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/contacts?from=onboarding">Add one contact</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => void refreshProgress()}
              >
                Refresh count
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-sm">
            <p>Pick a goal — we&apos;ll open a simple editor so you can write and send.</p>
            <div className="grid gap-3">
              {CAMPAIGN_GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  className={`min-h-11 rounded-xl border p-4 text-left ${
                    goal === g.id ? "border-coral ring-2 ring-coral/20" : ""
                  }`}
                >
                  <div className="font-medium">{g.label}</div>
                  <div className="text-sm text-muted-foreground">{g.description}</div>
                </button>
              ))}
            </div>
            <Button onClick={() => void finish()} className="min-h-11 w-full sm:w-auto">
              Finish &amp; create campaign
            </Button>
          </div>
        )}

        <div className="mt-8 flex justify-between gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < TOTAL_STEPS - 1 ? (
            <Button className="min-h-11" onClick={() => void next()}>
              Continue
            </Button>
          ) : (
            <Button className="min-h-11" onClick={() => void finish()}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
