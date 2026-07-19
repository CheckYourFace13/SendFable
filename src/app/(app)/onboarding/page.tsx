"use client";

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

const STEPS = [
  "Business basics",
  "Website & brand",
  "Verify sender",
  "Mailing address",
  "Add contacts",
  "Campaign goal",
  "Create email",
  "Send a test",
  "Review",
  "Send or schedule",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [logoUrl, setLogoUrl] = useState("");
  const [suggestions, setSuggestions] = useState<any>(null);
  const [goal, setGoal] = useState("announce");
  const [progress, setProgress] = useState({ verifiedSenders: 0, contacts: 0, campaigns: 0 });

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/onboarding");
      const data = await res.json();
      if (data.completedAt) {
        router.replace("/dashboard");
        return;
      }
      setStep(data.step || 0);
      setName(data.workspace?.name || "");
      setWebsite(data.workspace?.websiteUrl || "");
      setAddress(data.workspace?.mailingAddress || "");
      setDescription(data.workspace?.businessDescription || "");
      setPrimaryColor(data.workspace?.primaryColor || "#4F46E5");
      setLogoUrl(data.workspace?.logoUrl || "");
      setProgress(data.progress || { verifiedSenders: 0, contacts: 0, campaigns: 0 });
      setLoading(false);
    })();
  }, [router]);

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

  async function next() {
    const workspace = {
      name,
      websiteUrl: website || null,
      mailingAddress: address || null,
      businessDescription: description || null,
      primaryColor,
      logoUrl: logoUrl || null,
    };
    const ok = await save({
      step: Math.min(step + 1, STEPS.length - 1),
      data: { goal },
      workspace,
    });
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function skipAll() {
    await save({ skip: true, step: STEPS.length });
    router.push("/dashboard");
  }

  async function finish() {
    await save({ complete: true, step: STEPS.length, data: { goal } });
    router.push("/campaigns/new?goal=" + goal);
  }

  async function importBrand() {
    if (!website) return toast.error("Enter a website URL first");
    const res = await fetch("/api/brand/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: website }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Import failed");
    setSuggestions(data.suggestions);
    toast.success("Suggestions ready — review before saving");
  }

  function applySuggestions() {
    if (!suggestions) return;
    if (suggestions.title) setName(suggestions.title);
    if (suggestions.description) setDescription(suggestions.description);
    if (suggestions.primaryColor) setPrimaryColor(suggestions.primaryColor);
    if (suggestions.logoCandidates?.[0]) setLogoUrl(suggestions.logoCandidates[0]);
    toast.success("Suggestions applied — you can still edit anything");
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading your setup…</div>;
  }

  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Set up Sendfable</h1>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
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
            <div>
              <Label>Business name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>What do you do? (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Neighborhood coffee shop with weekend brunch…"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Website</Label>
              <div className="flex gap-2">
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourbusiness.com"
                />
                <Button type="button" variant="outline" onClick={() => void importBrand()}>
                  Import
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                We&apos;ll suggest a logo and colors — nothing is saved until you review.
              </p>
            </div>
            {suggestions && (
              <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                <p className="font-medium">Suggestions from {suggestions.sourceUrl}</p>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  {suggestions.title && <li>Title: {suggestions.title}</li>}
                  {suggestions.primaryColor && <li>Color: {suggestions.primaryColor}</li>}
                  <li>{suggestions.logoCandidates?.length || 0} logo candidates</li>
                </ul>
                <Button className="mt-3" size="sm" onClick={applySuggestions}>
                  Use suggestions
                </Button>
              </div>
            )}
            <div>
              <Label>Brand color</Label>
              <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-20" />
            </div>
            <div>
              <Label>Logo URL (optional)</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-sm">
            <p>
              Add and verify the email address you&apos;ll send from. Any address works — Gmail and
              Yahoo are rewritten automatically for deliverability.
            </p>
            <p className="text-muted-foreground">
              Verified senders so far: {progress.verifiedSenders}
            </p>
            <Button asChild>
              <Link href="/settings/senders" target="_blank">
                Open sender settings
              </Link>
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Required by law in every email (your physical mailing address).
            </p>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="123 Main St, City, ST 12345"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-sm">
            <p>Import a spreadsheet or add a few contacts. Never use purchased lists.</p>
            <p className="text-muted-foreground">Contacts so far: {progress.contacts}</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/contacts/import">Import CSV</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contacts/migrate">Migration center</Link>
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-3">
            {CAMPAIGN_GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoal(g.id)}
                className={`rounded-xl border p-4 text-left ${
                  goal === g.id ? "border-coral ring-2 ring-coral/20" : ""
                }`}
              >
                <div className="font-medium">{g.label}</div>
                <div className="text-sm text-muted-foreground">{g.description}</div>
              </button>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3 text-sm">
            <p>Next we&apos;ll open a simple email editor with a headline, image, message, and button.</p>
            <Button asChild>
              <Link href={`/campaigns/new?goal=${goal}`}>Open email editor</Link>
            </Button>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3 text-sm">
            <p>Send a test to yourself from the campaign Review tab before going live.</p>
            <Button asChild variant="outline">
              <Link href="/campaigns">Go to campaigns</Link>
            </Button>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-3 text-sm">
            <p>
              The Send Confidence checklist will flag missing sender, address, subject, or empty
              audience before you launch.
            </p>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-3 text-sm">
            <p>You&apos;re ready. Finish setup and create your first campaign.</p>
            <Button onClick={() => void finish()}>Finish & create campaign</Button>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => void next()}>Continue</Button>
          ) : (
            <Button onClick={() => void finish()}>Done</Button>
          )}
        </div>
      </div>
    </div>
  );
}
