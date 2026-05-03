"use client"

import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Home, FileJson, UploadCloud, BookOpen } from "lucide-react"

const items = [
  { title: "Overview", url: "/dashboard", icon: <Home /> },
  { title: "My JSONs", url: "/dashboard/my-jsons", icon: <FileJson /> },
  { title: "Upload", url: "/dashboard/upload", icon: <UploadCloud /> },
  { title: "Docs", url: "/docs", icon: <BookOpen /> },
]

export function NavMain() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
              <a href={item.url}>
                {item.icon}
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
