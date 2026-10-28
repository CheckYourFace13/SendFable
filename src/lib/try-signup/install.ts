export const TRY_INSTALL_PLATFORMS = [
  "wordpress",
  "wix",
  "squarespace",
  "webflow",
  "other",
] as const;

export type TryInstallPlatform = (typeof TRY_INSTALL_PLATFORMS)[number];

export const TRY_PREVIEW_SLUG = "preview-only";

export const TRY_PREVIEW_SNIPPET = `<!-- Preview only. This signup is not active. -->
<div data-sendfable-form="${TRY_PREVIEW_SLUG}"></div>
<script src="https://sendfable.com/embed/form.js" async></script>`;

const STEPS: Record<TryInstallPlatform, { label: string; steps: string[]; fullGuide?: string }> = {
  wordpress: {
    label: "WordPress",
    fullGuide: "/integrations/wordpress",
    steps: [
      "Add a Custom HTML block.",
      "Paste the SendFable code.",
      "Publish.",
    ],
  },
  wix: {
    label: "Wix",
    fullGuide: "/integrations/wix",
    steps: [
      "Add an Embed/Custom Code element.",
      "Paste the code.",
      "Publish.",
    ],
  },
  squarespace: {
    label: "Squarespace",
    fullGuide: "/integrations/squarespace",
    steps: [
      "Add a Code Block.",
      "Paste the code.",
      "Save and publish.",
    ],
  },
  webflow: {
    label: "Webflow",
    fullGuide: "/integrations/webflow",
    steps: [
      "Add an Embed element.",
      "Paste the code.",
      "Publish.",
    ],
  },
  other: {
    label: "Other website",
    steps: ["Paste the snippet where you want the signup to appear."],
  },
};

export function tryInstallPlatforms(): Array<{
  id: TryInstallPlatform;
  label: string;
  steps: string[];
  fullGuide?: string;
}> {
  return TRY_INSTALL_PLATFORMS.map((id) => ({ id, ...STEPS[id] }));
}

export function tryInstallSteps(platform: TryInstallPlatform): string[] {
  return STEPS[platform].steps;
}
