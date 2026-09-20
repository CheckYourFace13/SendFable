"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "sf_resume_template";

export function UseTemplateCta({ slug, goal }: { slug: string; goal: string }) {
  const campaignPath = `/campaigns/new?template=${encodeURIComponent(slug)}&goal=${encodeURIComponent(goal)}`;
  const signupHref = `/signup?template=${encodeURIComponent(slug)}&goal=${encodeURIComponent(goal)}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(campaignPath)}`;

  function remember() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug, goal, at: Date.now() }));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
        <Link href={signupHref} onClick={remember}>
          Use this template
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={loginHref} onClick={remember}>
          I already have an account
        </Link>
      </Button>
    </div>
  );
}
