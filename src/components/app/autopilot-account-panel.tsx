"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Brand = {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  fontLabel: string;
  buttonLabel: string;
  buttonStyle: string;
  confirmed: boolean;
  suggested: boolean;
};

type Commercial = {
  includedPerMonth: number | null;
  trialAvailable: boolean;
  trialActive: boolean;
  trialCreationsRemaining: number;
  trialMonthsLeft: number;
  credits: number;
  promo: "NONE" | "MONTHLY" | "WEEKLY";
  packs: Array<{ id: string; credits: number; cents: number; label: string }>;
  brand: Brand;
};

export function AutopilotAccountPanel({
  internalUnlimited,
  commercial,
  onChanged,
  only,
}: {
  internalUnlimited: boolean;
  commercial: Commercial | null;
  onChanged: () => void;
  only?: "usage" | "brand";
}) {
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const brand = commercial?.brand;

  async function post(url: string, body: unknown, ok: string) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not update Scribe");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.success(ok);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {only !== "brand" && (
      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Scribe creations</h2>
        {internalUnlimited ? (
          <p className="mt-2 text-sm text-muted-foreground">Unlimited</p>
        ) : commercial?.trialAvailable ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="font-medium">Try Scribe free for 3 months.</p>
            <p>1 campaign creation each month. No credit card required.</p>
            <p>Nothing sends until you schedule it.</p>
            <p className="text-muted-foreground">
              Unused trial creations do not roll over. This is separate from your Free plan&apos;s
              monthly emails.
            </p>
            <Button
              disabled={busy}
              onClick={() =>
                void post("/api/autopilot/trial", { confirm: true }, "3-month trial started")
              }
            >
              Start 3-month free trial
            </Button>
          </div>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>
              Included this month: {commercial?.includedPerMonth ?? 0}
            </li>
            {commercial?.trialActive && (
              <li>
                3-month Scribe trial · 1 creation per month · Month{" "}
                {Math.min(3, Math.max(1, 4 - commercial.trialMonthsLeft))} of 3
              </li>
            )}
            <li>Purchased creations: {commercial?.credits ?? 0}</li>
            {commercial?.promo === "MONTHLY" && (
              <li>1 complimentary creation each month. SendFable branding required.</li>
            )}
            {commercial?.promo === "WEEKLY" && (
              <li>1 complimentary creation each week. SendFable branding required.</li>
            )}
          </ul>
        )}

        {!internalUnlimited && (
          <div className="mt-4 space-y-3">
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void post("/api/autopilot/promo", { code }, "Promo applied to this workspace");
              }}
            >
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Promo code"
                aria-label="Promo code"
              />
              <Button type="submit" variant="outline" disabled={busy || code.trim().length < 4}>
                Apply code
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {(commercial?.packs || []).map((pack) => (
                <Button
                  key={pack.id}
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void post("/api/autopilot/credits", { pack: pack.id }, "Opening checkout")
                  }
                >
                  Buy {pack.label} · ${(pack.cents / 100).toFixed(0)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Creation credits stay on this workspace. They are not shared with another business.
            </p>
          </div>
        )}
      </section>
      )}

      {only !== "usage" && brand && (
        <section className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">
            {brand.suggested
              ? "Scribe found this look on your website."
              : "Scribe can read the look of the page you watch."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-white">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt={`${brand.businessName} logo`} className="max-h-12 max-w-12" />
              ) : (
                <span className="text-xs text-muted-foreground">Logo</span>
              )}
            </div>
            <div>
              <p className="font-medium">{brand.businessName}</p>
              <p className="mt-1 flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full border" style={{ background: brand.primaryColor }} />
                Primary color
              </p>
              <p className="mt-1 flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full border" style={{ background: brand.accentColor }} />
                Accent color
              </p>
              <p className="mt-1">Type: {brand.fontLabel}</p>
              <p>Button: {brand.buttonLabel}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void post("/api/autopilot/brand", { action: "refresh" }, "Look updated from your website")}
            >
              Refresh from website
            </Button>
            {brand.suggested && !brand.confirmed && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void post("/api/autopilot/brand", { action: "confirm" }, "Look saved")}
              >
                Looks right
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setEditing((value) => !value)}>
              Edit
            </Button>
          </div>
          {editing && (
            <BrandEditor brand={brand} busy={busy} onSave={(body) => void post("/api/autopilot/brand", body, "Look saved")} />
          )}
        </section>
      )}
    </div>
  );
}

function BrandEditor({
  brand,
  busy,
  onSave,
}: {
  brand: Brand;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor);
  const [accentColor, setAccentColor] = useState(brand.accentColor);
  const [fontLabel, setFontLabel] = useState(brand.fontLabel === "Classic" ? "Classic" : "Modern");
  const [buttonStyle, setButtonStyle] = useState(brand.buttonStyle === "square" ? "square" : "rounded");

  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          action: "save",
          logoUrl: logoUrl.trim() || null,
          primaryColor,
          accentColor,
          fontLabel,
          buttonStyle,
        });
      }}
    >
      <label className="text-sm sm:col-span-2">
        Logo link
        <Input className="mt-1" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
      </label>
      <label className="text-sm">
        Primary color
        <input className="mt-1 block h-11 w-full" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
      </label>
      <label className="text-sm">
        Accent color
        <input className="mt-1 block h-11 w-full" type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
      </label>
      <label className="text-sm">
        Font
        <select className="mt-1 min-h-11 w-full rounded-md border bg-background px-3" value={fontLabel} onChange={(event) => setFontLabel(event.target.value as "Modern" | "Classic")}>
          <option value="Modern">Modern</option>
          <option value="Classic">Classic</option>
        </select>
      </label>
      <label className="text-sm">
        Button style
        <select className="mt-1 min-h-11 w-full rounded-md border bg-background px-3" value={buttonStyle} onChange={(event) => setButtonStyle(event.target.value as "rounded" | "square")}>
          <option value="rounded">Rounded</option>
          <option value="square">Square</option>
        </select>
      </label>
      <Button type="submit" disabled={busy} className="sm:col-span-2 sm:w-fit">
        Save look
      </Button>
    </form>
  );
}
