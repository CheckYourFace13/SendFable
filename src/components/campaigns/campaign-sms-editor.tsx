"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateSegments } from "@/lib/sms/segments";

type Props = {
  smsBody: string;
  editable: boolean;
  saving: boolean;
  onChange: (body: string) => void;
  onSave: () => void;
  onConvertFromEmail?: () => void;
  converting?: boolean;
  showConvert?: boolean;
};

export function CampaignSmsEditor({
  smsBody,
  editable,
  saving,
  onChange,
  onSave,
  onConvertFromEmail,
  converting,
  showConvert,
}: Props) {
  const info = useMemo(() => calculateSegments(smsBody || ""), [smsBody]);

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium">Text message</h2>
          <p className="text-sm text-muted-foreground">
            Keep it short. Only people with SMS marketing consent are included.
          </p>
        </div>
        {showConvert && onConvertFromEmail ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!editable || converting}
            onClick={() => onConvertFromEmail()}
          >
            {converting ? "Converting…" : "Draft from email"}
          </Button>
        ) : null}
      </div>
      <div>
        <Label htmlFor="sms-body">Message</Label>
        <Textarea
          id="sms-body"
          rows={6}
          disabled={!editable}
          value={smsBody || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Acme Bakery: Weekend specials this Saturday. Reply STOP to opt out."
          className="mt-1.5 font-mono text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{(smsBody || "").length} characters</span>
        <span>
          {info.segments} segment{info.segments === 1 ? "" : "s"} ({info.encoding})
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Include your business name. Marketing texts require prior consent. STOP opt-outs are
        honored automatically when inbound is active.
      </p>
      {editable ? (
        <Button disabled={saving} onClick={() => onSave()}>
          {saving ? "Saving…" : "Save text"}
        </Button>
      ) : null}
    </div>
  );
}
