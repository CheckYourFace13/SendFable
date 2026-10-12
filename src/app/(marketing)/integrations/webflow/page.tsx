import { marketingPageMeta } from "@/components/marketing/json-ld";
import { SignupInstallGuide } from "@/components/marketing/signup-install-guide";

export const metadata = marketingPageMeta({
  title: "Install a Signup Tool on Webflow",
  description:
    "Put a SendFable Signup Tool in a Webflow Embed for Inline, or in page or site custom code for a Popup. Publish before you test.",
  path: "/integrations/webflow",
});

export default function WebflowSignupGuidePage() {
  return (
    <SignupInstallGuide
      builder="Webflow"
      path="/integrations/webflow"
      summary="Webflow shows the snippet only after you publish. An Embed element is the inline install. Custom code in the page or project footer is the popup install when your site plan includes it."
      need={[
        "A Signup Tool in SendFable.",
        "Designer access, and a site plan that can publish custom code if you use the footer.",
        "The code from Signup Tools.",
      ]}
      inlineSteps={[
        "In SendFable, open Signup Tools.",
        "Choose Inline.",
        "Copy the generated code.",
        "In Webflow, add an Embed element on the page.",
        "Paste the snippet into the embed.",
        "Publish the site. The Designer canvas is not the live result.",
        "Open the published URL and send a test signup.",
      ]}
      popupSteps={[
        "In Signup Tools, choose Popup and set the delay or scroll point, and how often.",
        "Copy the generated code.",
        "If the site shows it, paste the snippet in Page settings → Custom code → Before </body> tag, or in Project settings → Custom code → Footer code for every page.",
        "Add it once per page, or once in the project footer. Not both, or it can run twice.",
        "Publish, then test on the live domain in a private window.",
      ]}
      caveat="If Custom code is missing, the site plan does not include it. Use an Embed element on the pages where the popup should run, then publish."
    />
  );
}
