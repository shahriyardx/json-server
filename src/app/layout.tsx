import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TRPCProvider } from "@/lib/trpc/provider"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "JSON Server — Your JSON, live.",
    template: "%s | JSON Server",
  },
  description:
    "Upload JSON, get a URL. Share anywhere. JSON Server turns your JSON files into RESTful APIs instantly.",
  metadataBase: new URL("https://json.shahriyar.dev"),
  openGraph: {
    title: "JSON Server — Your JSON, live.",
    description:
      "Upload JSON, get a URL. Share anywhere. Turn JSON files into RESTful APIs instantly.",
    url: "https://json.shahriyar.dev",
    siteName: "JSON Server",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSON Server — Your JSON, live.",
    description:
      "Upload JSON, get a URL. Share anywhere. Turn JSON files into RESTful APIs instantly.",
  },
  keywords: [
    "JSON",
    "JSON server",
    "REST API",
    "mock API",
    "mock server",
    "fake API",
    "API generator",
    "RESTful",
    "JSON storage",
    "JSON hosting",
    "prototyping",
    "backend generator",
    "serverless API",
    "API mock",
    "JSON endpoint",
    "hosted JSON",
    "data API",
    "quick API",
    "frontend prototyping",
    "API playground",
    "JSON database",
    "static JSON API",
    "instant API",
    "JSON as API",
  ],
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full dark",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  )
}
