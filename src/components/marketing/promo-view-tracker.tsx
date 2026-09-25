"use client";

import { useEffect } from "react";
import { trackClientEvent } from "@/components/marketing/marketing-analytics";

export function PromoViewTracker() {
  useEffect(() => {
    trackClientEvent("promo_view", { code: "TEXT20" });
  }, []);
  return null;
}
