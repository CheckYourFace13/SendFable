import { IndustryEmailPage, industryMeta } from "@/components/marketing/industry-email-page";

export const metadata = industryMeta("events" as const);

export default function Page() {
  return <IndustryEmailPage id={"events" as const} />;
}
