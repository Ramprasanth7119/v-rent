import { DemoProvider } from '../../lib/phase1/DemoContext';
import { Phase1Shell } from '../../components/phase1/Shell';

export const metadata = {
  title: 'V-RENT — Phase 1 Agent Platform (prototype)',
};

export default function Phase1Layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <Phase1Shell>{children}</Phase1Shell>
    </DemoProvider>
  );
}
