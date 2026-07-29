import { IndustryEmailPage, industryMeta } from "@/components/marketing/industry-email-page";

export const metadata = industryMeta("real-estate" as const);

export default function Page() {
  return <IndustryEmailPage id={"real-estate" as const} />;
}
