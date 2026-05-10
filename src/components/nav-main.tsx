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
import {
  Home,
  FileJson,
  UploadCloud,
  BookOpen,
  KeyRound,
  Trash2,
  Database,
  ArrowLeft,
  Users,
} from "lucide-react"

const platformItems = [
  { title: "Overview", url: "/dashboard", icon: <Home /> },
  { title: "JSON Files", url: "/dashboard/json", icon: <FileJson /> },
  { title: "Upload", url: "/dashboard/json/upload", icon: <UploadCloud /> },
  { title: "API Keys", url: "/dashboard/api-keys", icon: <KeyRound /> },
  { title: "MongoDX", url: "/dashboard/mongodb", icon: <Database /> },
  { title: "Trash", url: "/dashboard/trash", icon: <Trash2 /> },
  { title: "Docs", url: "/docs", icon: <BookOpen /> },
]

function isJsonPath(path: string) {
  return (
    path.startsWith("/dashboard/json/") && !path.startsWith("/dashboard/json/upload")
  )
}

export function NavMain() {
  const pathname = usePathname()
  const isMongo = pathname === "/dashboard/mongodb" || pathname.startsWith("/dashboard/mongodb/")
  const dbMatch = pathname.match(/^\/dashboard\/mongodb\/([^/]+)/)
  const dbId = dbMatch?.[1]

  if (isMongo) {
    return (
      <>
        <SidebarGroup>
          <SidebarGroupLabel>MongoDX</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/dashboard/mongodb"}
                tooltip="Cluster overview"
              >
                <Link href="/dashboard/mongodb">
                  <Database />
                  <span>Cluster</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === "/dashboard/mongodb/databases" ||
                  (!!dbId && pathname.startsWith(`/dashboard/mongodb/${dbId}`) && !pathname.includes("/authentication"))
                }
                tooltip="Browse databases & collections"
              >
                <Link href="/dashboard/mongodb/databases">
                  <Database />
                  <span>Databases</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/dashboard/mongodb/authentication"}
                tooltip="Cluster auth users"
              >
                <Link href="/dashboard/mongodb/authentication">
                  <Users />
                  <span>Authentication</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild variant="outline" tooltip="Back to main dashboard">
                <Link href="/dashboard">
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {platformItems.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={
                pathname === item.url ||
                (item.url === "/dashboard/json" && isJsonPath(pathname))
              }
              tooltip={item.title}
            >
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
