"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  ShieldAlert, Users, Database, FileCheck, 
  Check, X, Activity, Server, Key, AlertTriangle 
} from 'lucide-react';

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'moderation';

  // State
  const [integrations, setIntegrations] = useState([
    { id: 'paynow', name: 'PayNow & Stripe Gateways', category: 'Payment API', status: true, desc: 'Central subscription & list feature fees.' },
    { id: 'cea-sys', name: 'Government CEA Registry API', category: 'Compliance Node', status: true, desc: 'Direct validation of agent registration license validity.' },
    { id: 'singpass', name: 'Singpass Identity SSO API', category: 'Identity Node', status: true, desc: 'Verifies NRIC details of buyers and landlords during contract signatures.' },
    { id: 'whatsapp', name: 'WhatsApp Business API Portal', category: 'Notifications', status: false, desc: 'Sends automated viewing reminders and OTP updates.' },
    { id: 'bank-prelim', name: 'Singapore DBS/UOB API Node', category: 'Mortgages', status: true, desc: 'Retrieves bank lending packages and yields indicators.' }
  ]);

  const [users, setUsers] = useState([
    { id: 'usr-1', name: 'Marcus Lim', role: 'Agent', email: 'marcus.lim@vrent.com', license: 'R058921A', verified: true },
    { id: 'usr-2', name: 'Sherry Tan', role: 'Agent', email: 'sherry.tan@vrent.com', license: 'R061483D', verified: true },
    { id: 'usr-3', name: 'Jared Ong', role: 'Agent', email: 'jared.ong@gmail.com', license: 'R029813K', verified: false },
    { id: 'usr-4', name: 'Evelyn Chew', role: 'Buyer/Investor', email: 'evelyn.chew@lawfirm.sg', license: 'N/A', verified: true }
  ]);

  const [propertiesQueue, setPropertiesQueue] = useState([
    { id: 'prop-q-1', title: 'Marina Bay Penthouse Upgrade', price: 'S$12,400,000', owner: 'Lim Ah Seng', fraudScore: 4, area: 'Marina Bay' },
    { id: 'prop-q-2', title: 'HDB Corner Unit Clementi Block 312', price: 'S$620,000', owner: 'Tan Kenji', fraudScore: 12, area: 'Clementi' },
    { id: 'prop-q-3', title: 'Flagged Commercial Office Sublet', price: 'S$45,000/m', owner: 'Unknown Entity', fraudScore: 82, area: 'Raffles Place' }
  ]);

  const handleTabSwitch = (tab: string) => {
    router.push(`/admin?tab=${tab}`);
  };

  const handleToggleIntegration = (id: string) => {
    setIntegrations(prev => 
      prev.map(item => item.id === id ? { ...item, status: !item.status } : item)
    );
  };

  const handleUserVerify = (id: string) => {
    setUsers(prev => 
      prev.map(usr => usr.id === id ? { ...usr, verified: true } : usr)
    );
    alert("CEA Credentials Verified against Singpass gateway.");
  };

  const handleModAction = (id: string, action: 'approve' | 'reject') => {
    setPropertiesQueue(prev => prev.filter(p => p.id !== id));
    alert(`Listing has been ${action === 'approve' ? 'Approved & Published' : 'Rejected'}.`);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. ADMIN TABS NAVBAR */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border pb-2">
        <div className="flex border-b border-transparent overflow-x-auto whitespace-nowrap gap-1">
          {[
            { id: 'moderation', label: 'Moderation Queue', icon: ShieldAlert },
            { id: 'users', label: 'User Verifications', icon: Users },
            { id: 'integrations', label: 'Integrations Nodes', icon: Database },
            { id: 'audit', label: 'PDPA Consent Audit Logs', icon: FileCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                  isActive 
                    ? 'border-brand-gold text-brand-gold font-black' 
                    : 'border-transparent text-neutral-500 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TAB CONTENT PANELS */}
      {activeTab === 'moderation' ? (
        
        /* TAB A: MODERATION QUEUE */
        <div className="space-y-6 animate-in fade-in duration-200">
          <Table
            columns={[
              { key: 'title', header: 'Property Details', render: (row) => (
                <div>
                  <h4 className="font-bold text-foreground text-xs">{row.title}</h4>
                  <p className="text-[9px] text-neutral-400 mt-0.5">{row.area} · Owner: {row.owner}</p>
                </div>
              )},
              { key: 'price', header: 'Price Details', render: (row) => (
                <span className="text-xs font-bold">{row.price}</span>
              )},
              { key: 'fraudScore', header: 'AI Fraud Index', render: (row) => {
                const isHigh = row.fraudScore >= 50;
                return (
                  <Badge variant={isHigh ? 'danger' : 'success'} className="font-mono">
                    {row.fraudScore}% {isHigh ? 'High Risk' : 'Low Risk'}
                  </Badge>
                );
              }},
              { key: 'id', header: 'Action Reviews', render: (row) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" className="p-1 h-7 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleModAction(row.id, 'approve')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" className="p-1 h-7 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleModAction(row.id, 'reject')}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            ]}
            data={propertiesQueue}
          />
        </div>

      ) : activeTab === 'users' ? (
        
        /* TAB B: USER VERIFICATION */
        <div className="space-y-6 animate-in fade-in duration-200">
          <Table
            columns={[
              { key: 'name', header: 'User Roster', render: (row) => (
                <div>
                  <h4 className="font-bold text-foreground text-xs">{row.name}</h4>
                  <p className="text-[9px] text-neutral-400 mt-0.5">{row.email}</p>
                </div>
              )},
              { key: 'role', header: 'System Role', render: (row) => (
                <span className="text-xs text-neutral-400 font-bold uppercase">{row.role}</span>
              )},
              { key: 'license', header: 'CEA License', render: (row) => (
                <span className="text-xs font-semibold">{row.license}</span>
              )},
              { key: 'verified', header: 'Status', render: (row) => (
                <div className="flex gap-2 items-center">
                  <Badge variant={row.verified ? 'success' : 'warning'}>
                    {row.verified ? 'Verified Active' : 'Pending Verification'}
                  </Badge>
                  {!row.verified && (
                    <Button size="sm" variant="gold" className="text-[10px] font-bold py-1 px-2.5" onClick={() => handleUserVerify(row.id)}>
                      Verify CEA
                    </Button>
                  )}
                </div>
              )}
            ]}
            data={users}
          />
        </div>

      ) : activeTab === 'integrations' ? (
        
        /* TAB C: INTEGRATION CONNECTIONS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          {integrations.map((item) => (
            <Card key={item.id} className="p-5 flex justify-between items-start gap-4">
              <div className="space-y-1.5 flex-1 text-xs">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-brand-gold" />
                  <span className="font-bold text-foreground leading-none">{item.name}</span>
                </div>
                <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">{item.category}</span>
                <p className="text-neutral-500 leading-relaxed pt-1">{item.desc}</p>
              </div>

              {/* Connected Status toggle switch */}
              <div className="flex flex-col items-end justify-between h-full min-h-[50px]">
                <Badge variant={item.status ? 'success' : 'secondary'}>
                  {item.status ? 'Active Connected' : 'Disconnected'}
                </Badge>
                <button
                  onClick={() => handleToggleIntegration(item.id)}
                  className={`mt-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-md cursor-pointer transition-colors ${
                    item.status 
                      ? 'border-red-500 text-red-500 hover:bg-red-500/5' 
                      : 'border-brand-gold text-brand-gold hover:bg-brand-gold/5'
                  }`}
                >
                  {item.status ? 'Disconnect Node' : 'Connect Node'}
                </button>
              </div>
            </Card>
          ))}
        </div>

      ) : (
        
        /* TAB D: COMPLIANCE & AUDIT LOGS */
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-4 flex gap-3 items-start border-emerald-500/10 bg-emerald-500/5">
            <Activity className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-bold text-foreground">Immutable Compliance Audits</span>
              <p className="mt-1 leading-relaxed">
                All customer identity evaluations and personal data downloads (Singpass verification gates, NRIC files) are encrypted. Compliance logs below register automated PDPA consent checks.
              </p>
            </div>
          </Card>

          <Table
            columns={[
              { key: 'timestamp', header: 'Timestamp', render: () => (
                <span className="text-xs font-mono">2026-07-03 15:44:12</span>
              )},
              { key: 'event', header: 'Secured System Event', render: (row, idx) => (
                <span className="text-xs font-semibold text-foreground">
                  {idx % 2 === 0 ? 'Singpass NRIC Verification Synced' : 'PDPA Right-to-Delete Consent Logged'}
                </span>
              )},
              { key: 'user', header: 'Operator User', render: (row, idx) => (
                <span className="text-xs">{idx % 2 === 0 ? 'Marcus Lim (Agent)' : 'Evelyn Chew (Consumer)'}</span>
              )},
              { key: 'status', header: 'Audit Status', render: () => (
                <Badge variant="success">Secured Logged</Badge>
              )}
            ]}
            data={Array.from({ length: 4 })}
          />
        </div>

      )}

    </div>
  );
}

export default function AdminDashboard() {
  return (
    <React.Suspense fallback={<div className="text-xs uppercase font-bold text-neutral-400">Loading console...</div>}>
      <AdminDashboardContent />
    </React.Suspense>
  );
}
