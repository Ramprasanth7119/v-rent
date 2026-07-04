import React from 'react';

// Tabs Primitive
export interface TabItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onChange,
  className = '',
}) => {
  const [localActiveTab, setLocalActiveTab] = React.useState(activeTab || items[0]?.id);

  React.useEffect(() => {
    if (activeTab) {
      setLocalActiveTab(activeTab);
    }
  }, [activeTab]);

  const handleTabClick = (id: string) => {
    setLocalActiveTab(id);
    if (onChange) {
      onChange(id);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Tab Headers */}
      <div className="flex border-b border-border mb-4 overflow-x-auto whitespace-nowrap">
        {items.map((item) => {
          const isActive = item.id === localActiveTab;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
                isActive
                  ? 'border-brand-gold text-brand-gold dark:text-brand-gold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        {items.find((item) => item.id === localActiveTab)?.content}
      </div>
    </div>
  );
};


