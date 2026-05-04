"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Home, FileJson, UploadCloud, BookOpen, KeyRound, Trash2 } from "lucide-react"

const items = [
  { title: "Overview", url: "/dashboard", icon: <Home /> },
  { title: "My JSONs", url: "/dashboard/my-jsons", icon: <FileJson /> },
  { title: "Upload", url: "/dashboard/upload", icon: <UploadCloud /> },
  { title: "API Keys", url: "/dashboard/api-keys", icon: <KeyRound /> },
  { title: "Trash", url: "/dashboard/trash", icon: <Trash2 /> },
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
              <Link href={item.url}>
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
