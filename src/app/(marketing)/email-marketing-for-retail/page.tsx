import { IndustryEmailPage, industryMeta } from "@/components/marketing/industry-email-page";

export const metadata = industryMeta("retail" as const);

export default function Page() {
  return <IndustryEmailPage id={"retail" as const} />;
}
