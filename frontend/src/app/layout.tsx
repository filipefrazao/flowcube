import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { CommandPaletteWrapper } from "@/components/effects/CommandPaletteWrapper";

export const metadata: Metadata = {
  title: "FlowCube - Workflow Builder",
  description: "Build powerful conversational workflows",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-background text-text-primary antialiased">
        <ThemeProvider>
          <CommandPaletteWrapper>
            {children}
          </CommandPaletteWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
