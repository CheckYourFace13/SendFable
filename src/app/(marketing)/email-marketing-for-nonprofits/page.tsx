import { IndustryEmailPage, industryMeta } from "@/components/marketing/industry-email-page";

export const metadata = industryMeta("nonprofits" as const);

export default function Page() {
  return <IndustryEmailPage id={"nonprofits" as const} />;
}
