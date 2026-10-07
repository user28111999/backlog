import type { Metadata } from "next";
import Registry from "@/components/Registry";
import "./globals.scss";
export const metadata: Metadata = {
  title: "Backlog — Your next adventure",
  description:
    "A personal home for every game you play. Track your library, time, and stories.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Registry>{children}</Registry>
      </body>
    </html>
  );
}
