import { Suspense } from "react";
import { NewCampaignClient } from "./new-campaign-client";

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <NewCampaignClient />
    </Suspense>
  );
}
