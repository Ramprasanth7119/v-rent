"use client";

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { usePersona } from '../../components/layout/PersonaContext';
import { ShieldCheck, Compass, Briefcase, Mail, Key, Sparkles } from 'lucide-react';

export default function OnboardingAuthPage() {
  const { setPersona } = usePersona();
  
  // States
  const [activeStep, setActiveStep] = useState<'auth' | 'role' | 'verify'>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'consumer' | 'agent' | 'agency'>('consumer');
  
  // Agent specific state
  const [ceaNumber, setCeaNumber] = useState('');
  const [experience, setExperience] = useState(5);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verifiedState, setVerifiedState] = useState(false);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setActiveStep('role');
  };

  const handleRoleSubmit = () => {
    if (selectedRole === 'consumer') {
      setPersona('consumer');
      alert("Welcome to V-RENT Marketplace.");
      window.location.href = "/";
    } else {
      setActiveStep('verify');
    }
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ceaNumber) return;
    setSubmittingVerification(true);

    setTimeout(() => {
      setSubmittingVerification(false);
      setVerifiedState(true);
      // Demo redirect triggers
      setTimeout(() => {
        setPersona(selectedRole === 'agent' ? 'agent' : 'agency');
        window.location.href = selectedRole === 'agent' ? '/agent' : '/agency';
      }, 1500);
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto py-12">
      
      {/* 1. STEP A: AUTH LOGINS */}
      {activeStep === 'auth' && (
        <Card className="space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-black uppercase text-foreground">Welcome to V-RENT</h1>
            <p className="text-xs text-neutral-400">Singapore's Enterprise-Grade PropTech Portal</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <Input
              label="Corporate Email"
              type="email"
              required
              placeholder="name@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <Input
              label="Password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-3">
              Login to Workspace
            </Button>
          </form>
        </Card>
      )}

      {/* 2. STEP B: ROLE SELECTIONS */}
      {activeStep === 'role' && (
        <Card className="space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-black uppercase text-foreground">Select your Platform Profile</h2>
            <p className="text-xs text-neutral-400">Choose the workspace matching your operations.</p>
          </div>

          <div className="space-y-3">
            {[
              { id: 'consumer', title: 'Buyer / Landlord', desc: 'Browse listing marketplaces, run valuations, and pre-qualify mortgage caps.', icon: Compass },
              { id: 'agent', title: 'Verified Broker Agent', desc: 'Manage CRM leads pipelines, listing managers, and draft copilot scripts.', icon: Briefcase },
              { id: 'agency', title: 'Agency Administrator', desc: 'Manage multibranch billing seats, round-robin rules, and leaderboards.', icon: ShieldCheck }
            ].map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <div 
                  key={role.id}
                  onClick={() => setSelectedRole(role.id as any)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'border-brand-gold bg-brand-gold/5' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-brand-gold' : 'text-neutral-400'}`} />
                    <div className="text-xs text-left space-y-1">
                      <span className="font-bold text-foreground block">{role.title}</span>
                      <p className="text-neutral-400 leading-relaxed">{role.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="gold" className="w-full font-bold uppercase tracking-wider py-3" onClick={handleRoleSubmit}>
            Continue Onboarding
          </Button>
        </Card>
      )}

      {/* 3. STEP C: LICENSE AUDIT UPLOADS */}
      {activeStep === 'verify' && (
        <Card className="space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-black uppercase text-foreground">CEA Credentials Audit</h2>
            <p className="text-xs text-neutral-400">Verify your license credentials against government registers.</p>
          </div>

          {verifiedState ? (
            <div className="text-center p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
              <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto animate-bounce" />
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-xs">Credentials Validated</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                License details checked. Redirecting to workspace dashboard logs...
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <Input
                label="CEA License Number"
                required
                placeholder="e.g. R058921A"
                value={ceaNumber}
                onChange={(e) => setCeaNumber(e.target.value)}
              />

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-neutral-500 block">Experience Range (Years)</label>
                <input
                  type="number"
                  required
                  value={experience}
                  onChange={(e) => setExperience(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>

              {/* Upload checklist */}
              <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-neutral-500 space-y-2">
                <span className="block text-foreground font-bold">Drag and Drop NRIC / CEA Card</span>
                <p className="text-[10px]">Max size 5MB. PDF, JPG formats verified.</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 font-bold" onClick={() => setActiveStep('role')}>
                  Back
                </Button>
                
                <Button 
                  type="submit" 
                  variant="gold" 
                  className="flex-1 font-bold uppercase tracking-wider" 
                  isLoading={submittingVerification}
                >
                  Verify CEA Node
                </Button>
              </div>
            </form>
          )}

          {/* Pending disclaimer */}
          <div className="p-3.5 bg-neutral-900 text-white rounded-lg text-[9px] uppercase tracking-widest text-center font-mono">
            Onboarding Status: Pending CEA-style Verification
          </div>
        </Card>
      )}

    </div>
  );
}
