import { IndustryEmailPage, industryMeta } from "@/components/marketing/industry-email-page";

export const metadata = industryMeta("restaurants" as const);

export default function Page() {
  return <IndustryEmailPage id={"restaurants" as const} />;
}
