import { DemoProvider } from '../../lib/phase1/DemoContext';
import { SessionProvider } from '../../lib/phase1/SessionContext';
import { Phase1Shell } from '../../components/phase1/Shell';
import { ToastProvider } from '../../components/phase1/Toast';
import { currentUser } from '../../lib/auth/session';
import { loadWorkspace } from '../../lib/phase1/workspace-store';
import { cookies } from 'next/headers';
import { DEMO_DATA_COOKIE } from '../../lib/phase1/report-data';
import { DemoDataModeProvider } from '../../lib/phase1/report-data/switch';
import { usingMongo } from '../../lib/store/driver';

export const metadata = {
  title: 'V-RENT — Agent Platform',
  description: 'Singapore residential rental platform for property agents.',
};

export default async function Phase1Layout({ children }: { children: React.ReactNode }) {
  // Read once on the server so no screen ever renders as if nobody is signed in,
  // and load that account's own workspace so the first paint is their portfolio
  // rather than a placeholder that is then replaced.
  const user = await currentUser();
  const workspace = user ? await loadWorkspace(user) : null;
  // The Demo Data switch, read here so the page is rendered in the mode the browser will show it in.
  const demoOn = (await cookies()).get(DEMO_DATA_COOKIE)?.value === 'on';

  return (
    <>
      {/* Interface text is Inter; titles are Manrope, which keeps one sans voice across the product. Printed reports set their headings in Source Serif 4. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap"
      />
      <SessionProvider user={user}>
        <DemoDataModeProvider initial={demoOn}>
          <DemoProvider initial={workspace} openedAt={new Date().toISOString()}>
            <ToastProvider>
              <Phase1Shell backend={usingMongo ? 'mongodb' : 'files'}>{children}</Phase1Shell>
            </ToastProvider>
          </DemoProvider>
        </DemoDataModeProvider>
      </SessionProvider>
    </>
  );
}
