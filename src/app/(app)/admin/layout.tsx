import { redirect } from "next/navigation";
import { requireOwnerAdminUser } from "@/lib/platform-admin";

export const dynamic = "force-dynamic";

/** Every /admin page requires the platform owner. Customers are sent home. */
export default async function OwnerAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireOwnerAdminUser();
  if (!admin) redirect("/dashboard");
  return children;
}
