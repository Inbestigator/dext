import type { Metadata } from "next";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DocsSidebar } from "@/components/docs-sidebar";

export const metadata: Metadata = {
  title: "Dext Docs",
  description: "",
};

export default function DocsLayout(
  { children }: { children: React.ReactNode },
) {
  return (
    <SidebarProvider>
      <DocsSidebar />
      <article>
        {children}
      </article>
    </SidebarProvider>
  );
}
