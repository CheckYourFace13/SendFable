import { IndustryEmailPage, industryMeta } from "@/components/marketing/industry-email-page";

export const metadata = industryMeta("breweries" as const);

export default function Page() {
  return <IndustryEmailPage id={"breweries" as const} />;
}
