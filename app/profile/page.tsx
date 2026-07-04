"use client";

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { 
  User, Bell, Shield, Key, Download, Trash2, ShieldAlert,
  Smartphone, Monitor, LogOut, CheckCircle, AlertTriangle, Link2
} from 'lucide-react';

export default function UserProfilePage() {
  const [activeTab, setActiveTab] = useState<string>('account');

  // Profile Details State
  const [name, setName] = useState<string>('Samuel Tan Wei Ming');
  const [email, setEmail] = useState<string>('samuel.tan@gmail.com');
  const [phone, setPhone] = useState<string>('+65 9123 4567');
  const [profilePhoto, setProfilePhoto] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80');

  // Notification Matrix Toggles
  const [notifyListings, setNotifyListings] = useState({ push: true, email: true, sms: false, whatsapp: true });
  const [notifyPriceDrops, setNotifyPriceDrops] = useState({ push: true, email: true, sms: true, whatsapp: true });
  const [notifyMessages, setNotifyMessages] = useState({ push: true, email: false, sms: false, whatsapp: true });
  const [notifyAppointments, setNotifyAppointments] = useState({ push: true, email: true, sms: true, whatsapp: true });

  // Connected accounts
  const [connections, setConnections] = useState([
    { provider: 'Google', linked: true, identifier: 'samuel.tan@gmail.com' },
    { provider: 'Apple Sign-In', linked: true, identifier: 'samuel.tan.privateid.apple.com' },
    { provider: 'Facebook', linked: false, identifier: 'Not connected' }
  ]);

  // Session Logs
  const [sessions, setSessions] = useState([
    { id: 'sess-1', device: 'Chrome on Windows 11 (Desktop)', location: 'Jurong East, SG', ip: '119.234.55.8', isCurrent: true },
    { id: 'sess-2', device: 'V-RENT iOS Mobile App (Apple iPhone 15)', location: 'Orchard Rd, SG', ip: '202.156.9.112', isCurrent: false }
  ]);

  // Data privacy states
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Profile settings have been saved successfully.");
  };

  const handleToggleConnection = (provider: string) => {
    setConnections(prev => prev.map(c => {
      if (c.provider === provider) {
        return {
          ...c,
          linked: !c.linked,
          identifier: c.linked ? 'Not connected' : 'samuel.tan@gmail.com'
        };
      }
      return c;
    }));
  };

  const handleTerminateSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    alert("Session terminated. The device has been remotely logged out.");
  };

  // PDPA Portability Export
  const triggerDataExport = () => {
    const dataLedger = {
      platform: "V-RENT PropTech Platform",
      timestamp: new Date().toISOString(),
      user: { name, email, phone },
      shortlists: ["prop-d9-1", "prop-d15-1"],
      savedSearches: [
        { name: "D19 5-Room under $800k", query: "/search?district=19&propertyType=HDB&priceMax=800000" }
      ],
      complianceConsents: {
        marketingOptIn: true,
        thirdPartySharing: false,
        cookieConsent: true
      }
    };

    // Download JSON Mock
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataLedger, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vrent_pdpa_ledger_${name.replace(/\s+/g, '_').toLowerCase()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    alert("Data portability package generated and downloaded under PDPA Guidelines.");
  };

  // PDPA Right-To-Be-Forgotten Purge
  const handleDeleteAccountConfirm = () => {
    setDeletingAccount(true);
    setTimeout(() => {
      setDeletingAccount(false);
      setDeleteConfirmOpen(false);
      alert("Request received. Under GDPR/PDPA, all identity documents, logs, and shortlists will be erased within 30 days. You are logged out.");
      window.location.href = "/";
    }, 1800);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground font-display">Profile Settings</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your personal contact details, toggle notification matrices, view linked identities, and inspect PDPA security consent nodes.
          </p>
        </div>
        <Badge variant="success" className="text-xs py-1.5 px-3">Consumer Node Active</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Column Profile Summary card */}
        <Card className="md:col-span-1 p-5 text-center flex flex-col items-center space-y-4">
          <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-brand-gold bg-neutral-800 shadow-md">
            <img src={profilePhoto} alt="User Avatar" className="h-full w-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{name}</h3>
            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest block mt-0.5">Verified Buyer</span>
          </div>
          <button 
            onClick={() => setProfilePhoto("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80")}
            className="text-[10px] uppercase font-bold text-brand-gold hover:underline cursor-pointer"
          >
            Change Photo
          </button>
        </Card>

        {/* Right Tab panels */}
        <div className="md:col-span-3">
          <Tabs
            items={[
              {
                id: 'account',
                label: (
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                    <User className="h-4 w-4" />
                    Account Info
                  </span>
                ),
                content: (
                  <Card className="p-6 space-y-4 animate-in fade-in duration-150">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Personal Specifics</h3>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                        <Input label="Mobile Number" value={phone} onChange={e => setPhone(e.target.value)} required />
                      </div>
                      <Input label="Registered Corporate Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                      
                      <div className="pt-2 flex justify-end">
                        <Button type="submit" variant="gold" className="font-bold uppercase tracking-wider py-2.5">
                          Save Account Changes
                        </Button>
                      </div>
                    </form>
                  </Card>
                )
              },
              {
                id: 'notifications',
                label: (
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </span>
                ),
                content: (
                  <Card className="p-6 space-y-6 animate-in fade-in duration-150">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Communication Preferences</h3>
                    
                    <div className="space-y-4 divide-y divide-border">
                      {/* Section 1: New Listings */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 first:pt-0">
                        <div className="text-left text-xs space-y-0.5">
                          <span className="font-bold text-foreground block">New Listing matching Saved Searches</span>
                          <span className="text-[10px] text-neutral-400">Triggers immediately when matching flats/condos are published.</span>
                        </div>
                        <div className="flex gap-2">
                          {[
                            { id: 'push', label: 'Push', state: notifyListings.push, set: () => setNotifyListings(p => ({...p, push: !p.push})) },
                            { id: 'email', label: 'Email', state: notifyListings.email, set: () => setNotifyListings(p => ({...p, email: !p.email})) },
                            { id: 'sms', label: 'SMS', state: notifyListings.sms, set: () => setNotifyListings(p => ({...p, sms: !p.sms})) },
                            { id: 'whatsapp', label: 'WA', state: notifyListings.whatsapp, set: () => setNotifyListings(p => ({...p, whatsapp: !p.whatsapp})) }
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={t.set}
                              className={`px-2.5 py-1 text-[9px] font-bold border rounded-lg cursor-pointer transition-colors ${t.state ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-border text-neutral-500'}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Price Drops */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
                        <div className="text-left text-xs space-y-0.5">
                          <span className="font-bold text-foreground block">Price Alerts on Shortlists</span>
                          <span className="text-[10px] text-neutral-400">Triggers when owners adjust asking price on starred items.</span>
                        </div>
                        <div className="flex gap-2">
                          {[
                            { id: 'push', label: 'Push', state: notifyPriceDrops.push, set: () => setNotifyPriceDrops(p => ({...p, push: !p.push})) },
                            { id: 'email', label: 'Email', state: notifyPriceDrops.email, set: () => setNotifyPriceDrops(p => ({...p, email: !p.email})) },
                            { id: 'sms', label: 'SMS', state: notifyPriceDrops.sms, set: () => setNotifyPriceDrops(p => ({...p, sms: !p.sms})) },
                            { id: 'whatsapp', label: 'WA', state: notifyPriceDrops.whatsapp, set: () => setNotifyPriceDrops(p => ({...p, whatsapp: !p.whatsapp})) }
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={t.set}
                              className={`px-2.5 py-1 text-[9px] font-bold border rounded-lg cursor-pointer transition-colors ${t.state ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-border text-neutral-500'}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section 3: Messages */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
                        <div className="text-left text-xs space-y-0.5">
                          <span className="font-bold text-foreground block">Enquiries & Chat Messages</span>
                          <span className="text-[10px] text-neutral-400">Replies from verified listing agents or owners.</span>
                        </div>
                        <div className="flex gap-2">
                          {[
                            { id: 'push', label: 'Push', state: notifyMessages.push, set: () => setNotifyMessages(p => ({...p, push: !p.push})) },
                            { id: 'email', label: 'Email', state: notifyMessages.email, set: () => setNotifyMessages(p => ({...p, email: !p.email})) },
                            { id: 'sms', label: 'SMS', state: notifyMessages.sms, set: () => setNotifyMessages(p => ({...p, sms: !p.sms})) },
                            { id: 'whatsapp', label: 'WA', state: notifyMessages.whatsapp, set: () => setNotifyMessages(p => ({...p, whatsapp: !p.whatsapp})) }
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={t.set}
                              className={`px-2.5 py-1 text-[9px] font-bold border rounded-lg cursor-pointer transition-colors ${t.state ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-border text-neutral-500'}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section 4: Viewing Appointments */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
                        <div className="text-left text-xs space-y-0.5">
                          <span className="font-bold text-foreground block">Viewing Appts & Reminders</span>
                          <span className="text-[10px] text-neutral-400">Calendar schedule changes and slot approvals.</span>
                        </div>
                        <div className="flex gap-2">
                          {[
                            { id: 'push', label: 'Push', state: notifyAppointments.push, set: () => setNotifyAppointments(p => ({...p, push: !p.push})) },
                            { id: 'email', label: 'Email', state: notifyAppointments.email, set: () => setNotifyAppointments(p => ({...p, email: !p.email})) },
                            { id: 'sms', label: 'SMS', state: notifyAppointments.sms, set: () => setNotifyAppointments(p => ({...p, sms: !p.sms})) },
                            { id: 'whatsapp', label: 'WA', state: notifyAppointments.whatsapp, set: () => setNotifyAppointments(p => ({...p, whatsapp: !p.whatsapp})) }
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={t.set}
                              className={`px-2.5 py-1 text-[9px] font-bold border rounded-lg cursor-pointer transition-colors ${t.state ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-border text-neutral-500'}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              },
              {
                id: 'connections',
                label: (
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                    <Key className="h-4 w-4" />
                    Security & Connections
                  </span>
                ),
                content: (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Social links */}
                    <Card className="p-6 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Linked Identity Providers</h3>
                      <div className="space-y-3">
                        {connections.map((c, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 border border-border rounded-xl text-xs font-semibold">
                            <div className="text-left">
                              <span className="text-foreground block">{c.provider}</span>
                              <span className="text-[10px] text-neutral-400 font-normal">{c.identifier}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant={c.linked ? 'outline' : 'gold'}
                              className="text-[9px] uppercase tracking-wider h-7 py-1 px-3 font-bold"
                              onClick={() => handleToggleConnection(c.provider)}
                            >
                              {c.linked ? 'Unlink' : 'Link Node'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Active Sessions list */}
                    <Card className="p-6 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Active Account Sessions</h3>
                      <div className="space-y-3">
                        {sessions.map((sess) => (
                          <div key={sess.id} className="flex justify-between items-center p-3 border border-border rounded-xl text-xs font-semibold">
                            <div className="flex gap-3 text-left">
                              <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-900 border border-border rounded flex items-center justify-center text-neutral-500 flex-shrink-0 mt-0.5">
                                {sess.device.includes('Windows') ? <Monitor className="h-4.5 w-4.5" /> : <Smartphone className="h-4.5 w-4.5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-foreground block">{sess.device}</span>
                                  {sess.isCurrent && <Badge variant="success" className="text-[7px]">Current Session</Badge>}
                                </div>
                                <span className="text-[9px] text-neutral-400 font-normal block mt-0.5">{sess.location} · IP: {sess.ip}</span>
                              </div>
                            </div>
                            {!sess.isCurrent && (
                              <button 
                                onClick={() => handleTerminateSession(sess.id)}
                                className="p-1.5 border border-red-500/20 text-red-500 rounded hover:bg-red-500/5 cursor-pointer"
                              >
                                <LogOut className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )
              },
              {
                id: 'privacy',
                label: (
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold text-red-500 dark:text-red-400">
                    <Shield className="h-4 w-4" />
                    PDPA Consent
                  </span>
                ),
                content: (
                  <Card className="p-6 space-y-6 animate-in fade-in duration-150">
                    <div className="flex items-start gap-3 p-3.5 bg-neutral-900 text-white rounded-xl border border-neutral-800">
                      <ShieldAlert className="h-5 w-5 text-brand-gold flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-neutral-300 leading-relaxed text-left">
                        <span className="font-bold text-white uppercase tracking-wider block text-[9px] text-brand-gold">Regulatory Compliance Node</span>
                        <p className="mt-1 normal-case font-normal text-[10px]">
                          V-RENT adheres to Singapore Personal Data Protection Act (PDPA) frameworks. Users maintain complete ownership of their identity parameters, pre-qualification records, and shortlisted items.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Data Portability */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-xl">
                        <div className="text-left text-xs space-y-0.5 max-w-md">
                          <span className="font-bold text-foreground block">Request Personal Data Portability Ledger</span>
                          <span className="text-[10px] text-neutral-400">Download an export file containing all searches, favourites, and vault interactions logged on this node.</span>
                        </div>
                        <Button 
                          variant="gold" 
                          size="sm" 
                          leftIcon={<Download className="h-4 w-4" />}
                          onClick={triggerDataExport}
                        >
                          Export Data JSON
                        </Button>
                      </div>

                      {/* Right to be Forgotten deletion */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-500/20 bg-red-500/5 rounded-xl">
                        <div className="text-left text-xs space-y-0.5 max-w-md">
                          <span className="font-bold text-red-700 dark:text-red-400 block">Erase Account footprint (Right to be Forgotten)</span>
                          <span className="text-[10px] text-neutral-400">Permanently terminate profile, erase KYC status logs, and delete tenancy document vaults under GDPR/PDPA guidelines.</span>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          leftIcon={<Trash2 className="h-4 w-4" />}
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Erase Node
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              }
            ]}
          />
        </div>
      </div>

      {/* PDPA DELETION CONFIRM DIALOG */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md p-6 space-y-5 text-left bg-card border-border">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Confirm Account Deletion</h3>
                <p className="text-xs text-neutral-500 normal-case leading-relaxed">
                  Are you absolutely sure you want to request deletion under PDPA regulations? This action is irreversible. All shortlists, saved searches, and verified credentials will be deleted permanently.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-border pt-4">
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deletingAccount}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={handleDeleteAccountConfirm}
                isLoading={deletingAccount}
              >
                Confirm Erase
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
