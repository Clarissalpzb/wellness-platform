import { Topbar } from "@/components/layouts/topbar";
import { MobileNav } from "@/components/layouts/mobile-nav";
import { AnnouncementBanner } from "@/components/layouts/announcement-banner";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Topbar />
      <AnnouncementBanner />
      <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 max-w-5xl mx-auto w-full">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
