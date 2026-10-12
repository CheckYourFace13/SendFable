import { marketingPageMeta } from "@/components/marketing/json-ld";
import { SignupInstallGuide } from "@/components/marketing/signup-install-guide";

export const metadata = marketingPageMeta({
  title: "Install a Signup Tool on Wix",
  description:
    "Add a SendFable Signup Tool on Wix with an Embed HTML element for Inline, or Custom Code for a Popup when that Wix site includes it.",
  path: "/integrations/wix",
});

export default function WixSignupGuidePage() {
  return (
    <SignupInstallGuide
      builder="Wix"
      path="/integrations/wix"
      summary="Wix accepts the snippet in an Embed HTML element. A site-wide popup uses Custom Code when your Wix site shows that setting."
      need={[
        "A Signup Tool in SendFable.",
        "Editor access on the Wix site.",
        "The code from Signup Tools.",
      ]}
      inlineSteps={[
        "In SendFable, open Signup Tools.",
        "Choose Inline.",
        "Copy the generated code.",
        "In the Wix editor, add an Embed HTML element (Add → Embed Code → Embed HTML).",
        "Paste the snippet into that element. Leave it as code, not as a caption.",
        "Publish the site.",
        "Open the published page and send a test signup.",
      ]}
      popupSteps={[
        "In Signup Tools, choose Popup and set when it appears and how often.",
        "Copy the generated code.",
        "If the site has Settings → Custom Code, add the snippet to the body end and choose the pages where it should run.",
        "If Custom Code is not there, Wix is not offering site-wide code on this site. Place an Embed HTML element on each page where the popup should run instead.",
        "Publish, then test in a private window.",
      ]}
      caveat="Wix does not load this from a SendFable app in the Wix App Market. Publish before you test. The editor preview is not the live page."
    />
  );
}
