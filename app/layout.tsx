import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Job Fit Scorer",
  description: "Paste a job description, get a fit verdict, draft a cover letter.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
