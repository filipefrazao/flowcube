import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { CommandPaletteWrapper } from '@/components/effects/CommandPaletteWrapper';

export const metadata: Metadata = {
  title: {
    default: 'FRZ Platform - CRM, Workflows & Analytics',
    template: '%s | FRZ Platform',
  },
  description: 'Plataforma unificada de CRM, Workflow Builder, WhatsApp, Analytics e Inteligencia Artificial do FRZ Group.',
  keywords: ['CRM', 'Workflow', 'Analytics', 'WhatsApp', 'IA', 'FRZ Group', 'Febracis', 'SalesCube', 'ChatCube'],
  authors: [{ name: 'FRZ Group' }],
  creator: 'FRZ Group',
  metadataBase: new URL('https://platform.frzgroup.com.br'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://platform.frzgroup.com.br',
    siteName: 'FRZ Platform',
    title: 'FRZ Platform - CRM, Workflows & Analytics',
    description: 'Plataforma unificada de CRM, Workflow Builder, WhatsApp, Analytics e IA do FRZ Group.',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='pt-BR' suppressHydrationWarning>
      <body className='bg-background text-text-primary antialiased'>
        <ThemeProvider>
          <CommandPaletteWrapper>{children}</CommandPaletteWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
