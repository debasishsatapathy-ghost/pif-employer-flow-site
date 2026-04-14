import type { Metadata } from 'next';
import './globals.css';
import { VoiceSessionProvider } from '@/components/voice/VoiceSessionProvider';
import { BackgroundLayer } from '@/components/voice/BackgroundLayer';
import { SceneLayout } from '@/components/voice/SceneLayout';
import { ControlBar } from '@/components/voice/ControlBar';
import { ChatPanel } from '@/components/voice/ChatPanel';

const agentName = process.env.NEXT_PUBLIC_AGENT_NAME || 'AI Assistant';

export const metadata: Metadata = {
  title: agentName,
  description: `Talk to ${agentName} - powered by Mobeus`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <VoiceSessionProvider>
          <BackgroundLayer />
          <div id="scene-root" className="relative z-[2] lg:h-dvh">
            <SceneLayout>{children}</SceneLayout>
          </div>
          <ControlBar />
          <ChatPanel />
        </VoiceSessionProvider>
      </body>
    </html>
  );
}
