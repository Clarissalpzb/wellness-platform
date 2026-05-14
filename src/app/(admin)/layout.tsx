import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Topbar } from "@/components/layouts/topbar";
import { MobileNav } from "@/components/layouts/mobile-nav";
import { BillingWall } from "@/components/billing/billing-wall";
import { BillingBanner } from "@/components/billing/billing-banner";
import { BillingStaffWall } from "@/components/billing/billing-staff-wall";
import { checkBillingGate } from "@/lib/billing-gate";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { state, lockReason, daysLeft, isOwner } = await checkBillingGate();

  if (state === "needs_setup") {
    if (isOwner) redirect("/billing/setup");
    return <BillingStaffWall reason="needs_setup" />;
  }

  if (state === "locked") {
    if (isOwner) return <BillingWall reason={lockReason as any} />;
    return <BillingStaffWall reason="locked" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        {state === "warning" && <BillingBanner daysLeft={daysLeft} />}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
