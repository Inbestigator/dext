import {
    ChevronDown,
    MessageCircleWarning,
    Puzzle,
    Terminal,
} from "lucide-react";
import Link from "next/link";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

const categories: {
    title: string;
    icon: React.ElementType;
    pages: { title: string; url: string }[];
    url?: string;
}[] = [
    {
        title: "Commands",
        icon: Terminal,
        pages: [
            {
                title: "Prerendering",
                url: "/docs/commands/prerendering",
            },
        ],
    },
    {
        title: "Components",
        icon: Puzzle,
        pages: [
            {
                title: "Overview",
                url: "/docs/",
            },
        ],
    },
    {
        title: "Events",
        icon: MessageCircleWarning,
        pages: [],
        url: "/docs/events",
    },
];

export function DocsSidebar() {
    return (
        <Sidebar>
            <SidebarContent>
                {categories.map((category) => {
                    if (category.pages.length === 0) {
                        return (
                            <SidebarGroup key={category.title}>
                                <SidebarMenuButton asChild>
                                    <Link href={category.url ?? "/docs"}>
                                        <category.icon />
                                        {category.title}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarGroup>
                        );
                    }
                    return (
                        <Collapsible
                            className="group/collapsible"
                            key={category.title}
                        >
                            <SidebarGroup>
                                <SidebarGroupLabel asChild>
                                    <SidebarMenuButton asChild>
                                        <CollapsibleTrigger>
                                            <category.icon />
                                            {category.title}
                                            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                        </CollapsibleTrigger>
                                    </SidebarMenuButton>
                                </SidebarGroupLabel>
                                <CollapsibleContent>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {category.pages.map((
                                                page,
                                            ) => (
                                                <SidebarMenuItem
                                                    key={page.title}
                                                >
                                                    <SidebarMenuButton asChild>
                                                        <Link href={page.url}>
                                                            {page.title}
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </CollapsibleContent>
                            </SidebarGroup>
                        </Collapsible>
                    );
                })}
            </SidebarContent>
        </Sidebar>
    );
}
