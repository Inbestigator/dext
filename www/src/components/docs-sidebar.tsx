"use client";

import * as React from "react";
import {
  Command,
  Github,
  MessageCircleWarning,
  Puzzle,
  Terminal,
  Zap,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

const data = {
  navMain: [
    {
      title: "Commands",
      url: "/docs/commands",
      icon: Terminal,
      items: [
        {
          title: "Config",
          url: "/docs/commands/config",
        },
      ],
    },
    {
      title: "Components",
      url: "/docs/components",
      icon: Puzzle,
      isActive: true,
      items: [
        {
          title: "Config",
          url: "/docs/components/config",
        },
      ],
    },
    {
      title: "Events",
      url: "/docs/events",
      icon: MessageCircleWarning,
    },
    {
      title: "Static vs Dynamic",
      url: "/docs/static-vs-dynamic",
      icon: Zap,
    },
  ],
  navSecondary: [
    {
      title: "GitHub",
      url: "https://github.com/inbestigator/dext",
      icon: Github,
    },
  ],
};

export function DocsSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Dext</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  );
}
