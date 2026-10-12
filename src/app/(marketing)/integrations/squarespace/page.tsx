import { marketingPageMeta } from "@/components/marketing/json-ld";
import { SignupInstallGuide } from "@/components/marketing/signup-install-guide";

export const metadata = marketingPageMeta({
  title: "Install a Signup Tool on Squarespace",
  description:
    "Add a SendFable Signup Tool with a Squarespace Code Block for Inline. Popup code injection is only there when the Squarespace plan includes it.",
  path: "/integrations/squarespace",
});

export default function SquarespaceSignupGuidePage() {
  return (
    <SignupInstallGuide
      builder="Squarespace"
      path="/integrations/squarespace"
      summary="A Code Block holds an inline Signup Tool on Squarespace. Site-wide code injection is a plan feature. If you do not see it, use a Code Block on the pages where a popup should run."
      need={[
        "A Signup Tool in SendFable.",
        "Permission to edit the Squarespace page.",
        "The code from Signup Tools.",
      ]}
      inlineSteps={[
        "In SendFable, open Signup Tools.",
        "Choose Inline.",
        "Copy the generated code.",
        "On the Squarespace page, add a Code Block.",
        "Paste the snippet into the code block. Do not place it in a text block.",
        "Save. Squarespace can take a moment to show the change on the public page.",
        "Open the public page and send a test signup.",
      ]}
      popupSteps={[
        "In Signup Tools, choose Popup and set when it appears and how often.",
        "Copy the generated code.",
        "If Settings → Advanced → Code Injection is available, paste the snippet in the Footer field. That covers the pages on the site.",
        "Code Injection is not on every Squarespace plan or version. If the menu is missing, the plan does not include it.",
        "Without Code Injection, add one Code Block with the popup snippet on each page where it should run. One block per page is enough.",
        "Save, then test in a private window.",
      ]}
      caveat="Do not assume a Personal plan or an older Squarespace version has Code Injection. The Code Block path works without it."
    />
  );
}
