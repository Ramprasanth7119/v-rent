import { DemoProvider } from '../../lib/phase1/DemoContext';
import { Phase1Shell } from '../../components/phase1/Shell';
import { ToastProvider } from '../../components/phase1/Toast';

export const metadata = {
  title: 'V-RENT — Agent Platform',
  description: 'Singapore residential rental platform for property agents. Phase 1 prototype.',
};

export default function Phase1Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Typeface: Inter for interface text, Newsreader for page titles. Falls back to system fonts offline. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap"
      />
      <DemoProvider>
        <ToastProvider>
          <Phase1Shell>{children}</Phase1Shell>
        </ToastProvider>
      </DemoProvider>
    </>
  );
}
