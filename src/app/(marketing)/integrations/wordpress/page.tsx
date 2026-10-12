import { marketingPageMeta } from "@/components/marketing/json-ld";
import { SignupInstallGuide } from "@/components/marketing/signup-install-guide";

export const metadata = marketingPageMeta({
  title: "Install a Signup Tool on WordPress",
  description:
    "Paste a SendFable Signup Tool into WordPress with a Custom HTML block for Inline, or once in a footer or site code area for Popup.",
  path: "/integrations/wordpress",
});

export default function WordPressSignupGuidePage() {
  return (
    <SignupInstallGuide
      builder="WordPress"
      path="/integrations/wordpress"
      summary="WordPress does not use one menu for this. Paste the snippet SendFable generates into a Custom HTML block, or into the theme’s code area if you want a popup on more than one page."
      need={[
        "A Signup Tool in SendFable.",
        "Access to edit a page, or to the theme area that accepts HTML.",
        "The code from Signup Tools. Do not retype it.",
      ]}
      inlineSteps={[
        "In SendFable, open Signup Tools.",
        "Choose Inline.",
        "Copy the generated code.",
        "In WordPress, edit the page and add a Custom HTML block. In the block editor that block is named Custom HTML. A classic editor uses the Text or Custom HTML view, not Visual.",
        "Paste the snippet.",
        "Update or Publish.",
        "Open the live page and send a test signup.",
      ]}
      popupSteps={[
        "In Signup Tools, choose Popup and set the delay or scroll point, and how often it may return.",
        "Copy the generated code.",
        "Add it once where it should load. On a block theme, a Custom HTML block in the footer template is enough. Some themes and code plugins label this Footer, Header, or Site-wide. The name depends on the theme.",
        "Do not paste it on every page if the footer already includes it.",
        "Update or Publish, then test in a private window.",
      ]}
      caveat="There is no SendFable WordPress plugin. If the theme has no place for site-wide HTML, put the popup snippet in a Custom HTML block on each page where it should run."
    />
  );
}
