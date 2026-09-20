"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CAMPAIGN_GOALS,
  recommendChannelForGoal,
  suggestSmsCopy,
} from "@/lib/campaign-goals";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Channel = "EMAIL" | "SMS" | "BOTH";

type Caps = {
  channelUiEnabled: boolean;
  statusMessage: string;
};

export function NewCampaignClient() {
  const router = useRouter();
  const search = useSearchParams();
  const presetGoal = search.get("goal");
  const presetChannel = (search.get("channel") || "").toUpperCase() as Channel | "";
  const presetTemplate = search.get("template");
  const [step, setStep] = useState<"channel" | "goal">(
    presetChannel === "EMAIL" || presetChannel === "SMS" || presetChannel === "BOTH"
      ? "goal"
      : "channel"
  );
  const [channel, setChannel] = useState<Channel>(
    presetChannel === "SMS" || presetChannel === "BOTH" || presetChannel === "EMAIL"
      ? presetChannel
      : "EMAIL"
  );
  const [goal, setGoal] = useState(presetGoal || "");
  const [creating, setCreating] = useState(false);
  const [caps, setCaps] = useState<Caps | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/sms/capabilities");
      if (res.ok) setCaps(await res.json());
      else setCaps({ channelUiEnabled: false, statusMessage: "Text messaging is not activated." });
    })();
  }, []);

  useEffect(() => {
    if (!caps?.channelUiEnabled || presetChannel) return;
    if (!presetGoal) return;
    const rec = recommendChannelForGoal(presetGoal, { smsAvailable: true });
    setChannel(rec);
  }, [caps, presetGoal, presetChannel]);

  useEffect(() => {
    // Deep-link: /campaigns/new?template=… creates immediately with that template
    if (presetTemplate) {
      void create(presetGoal || "scratch", channel || "EMAIL", presetTemplate);
    } else if (presetGoal && CAMPAIGN_GOALS.some((g) => g.id === presetGoal) && step === "goal") {
      void create(presetGoal, channel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetGoal, presetTemplate, step]);

  async function create(
    selectedGoal: string,
    selectedChannel: Channel,
    templateRef?: string | null
  ) {
    setCreating(true);
    const g = CAMPAIGN_GOALS.find((x) => x.id === selectedGoal);
    const isSlug = Boolean(templateRef && (templateRef.includes("-") || templateRef.startsWith("platform")));
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: g ? g.label : "Untitled campaign",
          goal: selectedGoal || "scratch",
          simpleMode: true,
          channel: selectedChannel,
          ...(templateRef
            ? isSlug
              ? { templateSlug: templateRef }
              : { templateId: templateRef }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      if (g && !templateRef) {
        await fetch(`/api/campaigns/${data.campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: g.id,
            simpleMode: true,
            subject: selectedChannel === "SMS" ? null : data.campaign.subject || g.subjectTips[0] || "",
            previewText:
              selectedChannel === "SMS"
                ? null
                : data.campaign.previewText || "Open for a quick update from us",
          }),
        });
      }

      router.replace(`/campaigns/${data.campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setCreating(false);
    }
  }

  if (creating) {
    return <div className="text-sm text-muted-foreground">Creating your campaign…</div>;
  }

  if (step === "channel") {
    const textEnabled = !!caps?.channelUiEnabled;
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">How do you want to send?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose email, text, or both. You can edit the message before anything goes out.
        </p>
        <div className="mt-8 grid gap-3">
          {(
            [
              {
                id: "EMAIL" as const,
                label: "Email",
                description: "Send a campaign to subscribed email contacts.",
                enabled: true,
              },
              {
                id: "SMS" as const,
                label: "Text",
                description: textEnabled
                  ? "Send a short text to people who opted in to SMS."
                  : caps?.statusMessage || "Text messaging is not activated yet.",
                enabled: textEnabled,
              },
              {
                id: "BOTH" as const,
                label: "Email + Text",
                description: textEnabled
                  ? "One campaign with an email version and a text version."
                  : caps?.statusMessage || "Text messaging is not activated yet.",
                enabled: textEnabled,
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={!opt.enabled || creating}
              onClick={() => {
                setChannel(opt.id);
                setStep("goal");
              }}
              className={`rounded-xl border bg-white p-5 text-left ${
                opt.enabled ? "hover:border-coral" : "cursor-not-allowed opacity-60"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{opt.description}</div>
            </button>
          ))}
        </div>
        {!textEnabled && (
          <p className="mt-4 text-sm text-muted-foreground">
            Email-only accounts stay on email. Text options appear after text messaging is activated
            for your account.
          </p>
        )}
        {textEnabled && (
          <p className="mt-4 text-sm">
            Need approval first?{" "}
            <Link className="underline" href="/settings/text-messaging">
              Set up text messaging
            </Link>
          </p>
        )}
        <Button className="mt-6" variant="ghost" asChild>
          <Link href="/library">Browse templates instead</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        className="mb-4 text-sm text-muted-foreground underline-offset-2 hover:underline"
        onClick={() => setStep("channel")}
      >
        ← Change channel ({channel === "BOTH" ? "Email + Text" : channel === "SMS" ? "Text" : "Email"})
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">
        {channel === "SMS" ? "What is this text for?" : "What is this email for?"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a goal — we attach a matching template, subject tips, and Send Confidence before you
        send.
      </p>
      {channel !== "EMAIL" && (
        <p className="mt-3 rounded-lg border border-sky/20 bg-sky/5 px-3 py-2 text-xs text-ink/80">
          Suggested text starter: {suggestSmsCopy(goal || presetGoal || "announce")}
        </p>
      )}
      <div className="mt-8 grid gap-3">
        {CAMPAIGN_GOALS.map((g) => (
          <button
            key={g.id}
            type="button"
            disabled={creating}
            onClick={() => {
              setGoal(g.id);
              void create(g.id, channel);
            }}
            className={`rounded-xl border bg-white p-5 text-left hover:border-coral ${
              goal === g.id ? "border-coral" : ""
            }`}
          >
            <div className="font-medium">{g.label}</div>
            <div className="mt-1 text-sm text-muted-foreground">{g.description}</div>
            {caps?.channelUiEnabled && (
              <div className="mt-2 text-xs text-teal">
                Suggested channel:{" "}
                {recommendChannelForGoal(g.id, { smsAvailable: true })
                  .replace("BOTH", "Email + Text")
                  .replace("SMS", "Text")
                  .replace("EMAIL", "Email")}
              </div>
            )}
          </button>
        ))}
      </div>
      <Button className="mt-6" variant="ghost" asChild>
        <Link href="/library">Browse templates instead</Link>
      </Button>
    </div>
  );
}
