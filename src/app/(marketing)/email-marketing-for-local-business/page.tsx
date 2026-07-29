import { IndustryEmailPage, industryMeta } from "@/components/marketing/industry-email-page";

export const metadata = industryMeta("local" as const);

export default function Page() {
  return <IndustryEmailPage id={"local" as const} />;
}
