import React from 'react';
import { Search, Compass, ShieldAlert, Award, TrendingUp, Calculator, Briefcase, FileText, Bot } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPersona: (persona: 'consumer' | 'agent' | 'agency' | 'investor' | 'admin') => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectPersona,
}) => {
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    { id: 'p-consumer', category: 'Switch Persona', title: 'Switch to Consumer Portal', icon: Compass, action: () => onSelectPersona('consumer') },
    { id: 'p-agent', category: 'Switch Persona', title: 'Switch to Agent CRM Dashboard', icon: Briefcase, action: () => onSelectPersona('agent') },
    { id: 'p-agency', category: 'Switch Persona', title: 'Switch to Agency ERP Console', icon: Award, action: () => onSelectPersona('agency') },
    { id: 'p-investor', category: 'Switch Persona', title: 'Switch to Investor Portfolio Tracker', icon: TrendingUp, action: () => onSelectPersona('investor') },
    { id: 'p-admin', category: 'Switch Persona', title: 'Switch to Platform Admin Moderation', icon: ShieldAlert, action: () => onSelectPersona('admin') },
    
    { id: 't-advisor', category: 'Tools', title: 'Launch Ava AI Advisor Chat', icon: Bot, href: '/advisor' },
    { id: 't-calculator', category: 'Tools', title: 'Mortgage & TDSR Calculators', icon: Calculator, href: '/calculator' },
    { id: 't-valuation', category: 'Tools', title: 'Instant Property Valuation', icon: Search, href: '/valuation' },
    { id: 't-vault', category: 'Tools', title: 'Access Document Vault', icon: FileText, href: '/vault' },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleCommandSelect = (cmd: typeof commands[0]) => {
    onClose();
    if (cmd.action) {
      cmd.action();
    } else if (cmd.href) {
      window.location.href = cmd.href;
    }
  };

  return (
    <div className="fixed inset-0 z-55 flex items-start justify-center pt-[15vh] p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette container */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden transform transition-all animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="h-5 w-5 text-neutral-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-4 text-sm text-foreground bg-transparent border-none placeholder-neutral-400 focus:outline-none focus:ring-0"
          />
          <span className="hidden sm:inline px-2 py-1 text-xs border border-border rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <p className="p-4 text-sm text-neutral-400 text-center">No results found.</p>
          ) : (
            <div>
              {/* Grouping header */}
              {Object.entries(
                filteredCommands.reduce((acc, cmd) => {
                  if (!acc[cmd.category]) acc[cmd.category] = [];
                  acc[cmd.category].push(cmd);
                  return acc;
                }, {} as Record<string, typeof commands>)
              ).map(([category, items]) => (
                <div key={category}>
                  <h4 className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                    {category}
                  </h4>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleCommandSelect(item)}
                          className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer text-left transition-colors"
                        >
                          <Icon className="h-4 w-4 mr-3 text-neutral-400" />
                          <span className="flex-1 font-medium">{item.title}</span>
                          <span className="text-xs text-neutral-400">Jump</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
