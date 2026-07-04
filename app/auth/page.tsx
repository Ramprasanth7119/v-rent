"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { usePersona } from '../../components/layout/PersonaContext';
import { 
  ShieldCheck, Compass, Briefcase, Mail, Key, Sparkles, 
  Smartphone, Fingerprint, Lock, Upload, User, ArrowRight, 
  ShieldAlert, Award, FileText, CheckCircle 
} from 'lucide-react';

export default function OnboardingAuthPage() {
  const { setPersona } = usePersona();
  
  // Auth flow states
  const [activeStep, setActiveStep] = useState<'auth' | 'role' | 'verify'>('auth');
  const [loginMethod, setLoginMethod] = useState<'email' | 'otp' | 'social' | 'biometric'>('email');
  
  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [verificationLinkSent, setVerificationLinkSent] = useState(false);

  // OTP states
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  // Biometric states
  const [bioScanning, setBioScanning] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);

  // Role states
  const [selectedRole, setSelectedRole] = useState<'consumer' | 'investor' | 'agent' | 'agency' | 'admin'>('consumer');
  
  // Verification states
  const [ceaNumber, setCeaNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0);
  const [verifiedState, setVerifiedState] = useState(false);

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setOtpSent(true);
    setOtpTimer(60);
    alert(`Mock SMS Gateway: Verification code [123456] dispatched to ${phone}`);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode === '123456') {
      setActiveStep('role');
    } else {
      alert("Invalid OTP code. Please enter 123456.");
    }
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    if (isRegistering) {
      setVerificationLinkSent(true);
      alert(`Account created! A secure confirmation link has been dispatched to ${email}.`);
      setTimeout(() => {
        setVerificationLinkSent(false);
        setActiveStep('role');
      }, 2000);
    } else {
      setActiveStep('role');
    }
  };

  const handleSocialLogin = (platform: string) => {
    alert(`Redirecting to ${platform} OAuth 2.0 Auth Gate...`);
    setTimeout(() => {
      alert(`${platform} account verified successfully!`);
      setActiveStep('role');
    }, 1000);
  };

  const handleBiometricAuth = () => {
    setBioScanning(true);
    setTimeout(() => {
      setBioSuccess(true);
      setBioScanning(false);
      setTimeout(() => {
        setActiveStep('role');
        setBioSuccess(false);
      }, 1000);
    }, 2000);
  };

  const handleRoleSubmit = () => {
    if (selectedRole === 'consumer') {
      setPersona('consumer');
      alert("Redirecting to Consumer Marketplace...");
      window.location.href = "/";
    } else if (selectedRole === 'investor') {
      setPersona('investor');
      alert("Redirecting to Investor Portfolio Dashboard...");
      window.location.href = "/investor";
    } else if (selectedRole === 'admin') {
      setPersona('admin');
      alert("Redirecting to Platform Administration Panel...");
      window.location.href = "/admin";
    } else {
      // Agent & Agency Admin require CEA validation
      setActiveStep('verify');
    }
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ceaNumber) return;
    setSubmittingVerification(true);
    setVerificationStep(1);

    // Step 1: Upload mock file
    setTimeout(() => {
      setVerificationStep(2);
      // Step 2: CEA Registry Check
      setTimeout(() => {
        setVerificationStep(3);
        // Step 3: Admin Board Manual Sign-off
        setTimeout(() => {
          setVerificationStep(4);
          setVerifiedState(true);
          setSubmittingVerification(false);
          
          // Auto redirect
          setTimeout(() => {
            setPersona(selectedRole);
            window.location.href = selectedRole === 'agent' ? '/agent' : '/agency';
          }, 1500);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      
      {/* HEADER LOGO */}
      <div className="text-center mb-8 space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-brand-navy dark:bg-brand-gold flex items-center justify-center shadow-lg mx-auto">
          <span className="font-black text-white dark:text-brand-navy text-2xl">V</span>
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-black uppercase text-foreground">V-RENT Onboarding Gate</h1>
          <p className="text-xs text-neutral-400">Singapore's Unified PropTech Super Ecosystem</p>
        </div>
      </div>

      {/* 1. STEP A: AUTH LOGINS */}
      {activeStep === 'auth' && (
        <Card className="space-y-6 animate-in fade-in duration-200">
          
          {/* Login tab bar */}
          <div className="flex border-b border-border pb-1">
            {[
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'otp', label: 'SMS OTP', icon: Smartphone },
              { id: 'social', label: 'Socials', icon: Key },
              { id: 'biometric', label: 'Bio Scan', icon: Fingerprint }
            ].map(tab => {
              const Icon = tab.icon;
              const active = loginMethod === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setLoginMethod(tab.id as any)}
                  className={`flex-1 flex flex-col items-center gap-1.5 pb-2 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
                    active ? 'border-brand-gold text-brand-gold' : 'border-transparent text-neutral-400 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Email / Password Forms */}
          {loginMethod === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
              {verificationLinkSent ? (
                <div className="p-4 bg-purple-500/5 border border-purple-400/20 rounded-xl text-center space-y-2">
                  <Sparkles className="h-8 w-8 text-purple-400 mx-auto animate-pulse" />
                  <span className="block text-xs font-bold text-purple-900 dark:text-purple-300">Verification Link Sent</span>
                  <p className="text-[10px] text-neutral-400 lowercase leading-relaxed">
                    Confirm your address by clicking the link in your inbox.
                  </p>
                </div>
              ) : (
                <>
                  <Input
                    label="Corporate Email Address"
                    type="email"
                    required
                    placeholder="name@agency.com.sg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  
                  <Input
                    label="Access Password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase">
                    <button 
                      type="button" 
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-brand-gold hover:underline cursor-pointer"
                    >
                      {isRegistering ? 'Have an account? Login' : 'Need an account? Sign Up'}
                    </button>
                    <span className="cursor-pointer hover:text-foreground">Forgot Password?</span>
                  </div>

                  <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-3">
                    {isRegistering ? 'Send Registration Link' : 'Secure Login'}
                  </Button>
                </>
              )}
            </form>
          )}

          {/* Mobile OTP SMS Verification */}
          {loginMethod === 'otp' && (
            <div className="space-y-4 text-left">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <Input
                    label="Mobile Number (Singapore)"
                    type="tel"
                    required
                    placeholder="+65 9123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-3">
                    Send Authentication OTP
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3.5 bg-neutral-900 text-white rounded-lg text-[9px] uppercase tracking-widest text-center font-mono">
                    SMS Gateway: Enter code 123456 to verify.
                  </div>
                  
                  <Input
                    label="Enter 6-Digit SMS OTP"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />

                  <div className="flex justify-between items-center text-[10px] text-neutral-400 font-bold uppercase">
                    <span>Code expires in: {otpTimer}s</span>
                    <button 
                      type="button"
                      disabled={otpTimer > 0}
                      onClick={() => { setOtpTimer(60); alert("New code dispatched."); }}
                      className={`text-brand-gold hover:underline ${otpTimer > 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      Resend Code
                    </button>
                  </div>

                  <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-3">
                    Verify & Proceed
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Social login integration buttons */}
          {loginMethod === 'social' && (
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full font-bold justify-start"
                leftIcon={<span className="text-base mr-1">🌐</span>}
                onClick={() => handleSocialLogin('Google')}
              >
                Sign in with Google OAuth
              </Button>
              <Button 
                variant="outline" 
                className="w-full font-bold justify-start"
                leftIcon={<span className="text-base mr-1">📘</span>}
                onClick={() => handleSocialLogin('Facebook')}
              >
                Sign in with Facebook Auth
              </Button>
              <Button 
                variant="outline" 
                className="w-full font-bold justify-start"
                leftIcon={<span className="text-base mr-1">🍎</span>}
                onClick={() => handleSocialLogin('Apple')}
              >
                Sign in with Apple Sign-In
              </Button>
            </div>
          )}

          {/* Biometrics Scan */}
          {loginMethod === 'biometric' && (
            <div className="text-center p-8 space-y-6">
              {bioSuccess ? (
                <div className="space-y-3">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-xs">Biometrics Authenticated</h4>
                  <p className="text-[10px] text-neutral-400">Identified via Face ID/Fingerprint scanner.</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleBiometricAuth}
                    disabled={bioScanning}
                    className={`h-16 w-16 rounded-full border border-neutral-800 flex items-center justify-center mx-auto transition-transform cursor-pointer ${
                      bioScanning ? 'animate-pulse scale-105 border-brand-gold' : 'hover:scale-105'
                    }`}
                  >
                    <Fingerprint className={`h-8 w-8 ${bioScanning ? 'text-brand-gold' : 'text-neutral-400'}`} />
                  </button>
                  
                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-foreground">Tap scanner to simulate biometrics</span>
                    <p className="text-[10px] text-neutral-400 max-w-xs mx-auto leading-relaxed">
                      Face ID or fingerprint verification using HTML5 WebAuthn mock modules.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

        </Card>
      )}

      {/* 2. STEP B: ROLE SELECTIONS */}
      {activeStep === 'role' && (
        <Card className="space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-black uppercase text-foreground">Identify your Role Profile</h2>
            <p className="text-xs text-neutral-400">Select the account class you wish to load.</p>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {[
              { id: 'consumer', title: 'Buyer / Tenant', desc: 'Search marketplaces, verify loans, and pre-qualify budget.', icon: Compass },
              { id: 'investor', title: 'Property Owner / Investor', desc: 'Track yields, digital portfolios, and private appreciation logs.', icon: User },
              { id: 'agent', title: 'Certified Broker Agent', desc: 'Draft descriptions with AI, review pipelines, and manage documents.', icon: Briefcase, checkRequired: true },
              { id: 'agency', title: 'Agency Administrator', desc: 'Approve brokerage licenses, manage seats, and view leaderboards.', icon: Award, checkRequired: true },
              { id: 'admin', title: 'Platform Administrator', desc: 'Full administration moderation, manual audits, and gateway controls.', icon: ShieldAlert }
            ].map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <div 
                  key={role.id}
                  onClick={() => setSelectedRole(role.id as any)}
                  className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'border-brand-gold bg-brand-gold/5' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <Icon className={`h-4.5 w-4.5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-brand-gold' : 'text-neutral-400'}`} />
                    <div className="text-xs text-left space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-foreground">{role.title}</span>
                        {role.checkRequired && (
                          <Badge variant="gold" className="text-[7px] py-0 px-1 border-none bg-neutral-800 text-brand-gold">CEA Verification</Badge>
                        )}
                      </div>
                      <p className="text-neutral-400 leading-normal text-[10px]">{role.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="gold" className="w-full font-bold uppercase tracking-wider py-3" onClick={handleRoleSubmit}>
            Continue Workspace Onboarding
          </Button>
        </Card>
      )}

      {/* 3. STEP C: LICENSE AUDIT UPLOADS */}
      {activeStep === 'verify' && (
        <Card className="space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black uppercase text-foreground">CEA Credentials Validation</h2>
            <p className="text-xs text-neutral-400">Upload documents and license credentials to start admin audit.</p>
          </div>

          {verifiedState ? (
            <div className="text-center p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
              <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto animate-bounce" />
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-xs">Credentials Approved</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Brokerage license verified successfully. Logging access tokens and loading workspace...
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerificationSubmit} className="space-y-4 text-left">
              
              {submittingVerification ? (
                /* Interactive Step Loading indicators */
                <div className="space-y-4 py-4 text-xs font-semibold">
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 border-t-transparent ${verificationStep >= 1 ? 'border-emerald-500' : 'border-neutral-500'} ${verificationStep === 1 ? 'animate-spin' : ''}`} />
                    <span className={verificationStep === 1 ? 'text-brand-gold' : 'text-neutral-500'}>1. Uploading license documentation to secure vault...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 border-t-transparent ${verificationStep >= 2 ? 'border-emerald-500' : 'border-neutral-500'} ${verificationStep === 2 ? 'animate-spin' : ''}`} />
                    <span className={verificationStep === 2 ? 'text-brand-gold' : 'text-neutral-500'}>2. Fetching CEA Register for status and validation check...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 border-t-transparent ${verificationStep >= 3 ? 'border-emerald-500' : 'border-neutral-500'} ${verificationStep === 3 ? 'animate-spin' : ''}`} />
                    <span className={verificationStep === 3 ? 'text-brand-gold' : 'text-neutral-500'}>3. Simulating manual administrator panel sign-off...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 border-t-transparent ${verificationStep >= 4 ? 'border-emerald-500' : 'border-neutral-500'} ${verificationStep === 4 ? 'animate-spin' : ''}`} />
                    <span className={verificationStep === 4 ? 'text-brand-gold' : 'text-neutral-500'}>4. Generating secure digital certificate keys...</span>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    label="CEA Registration Number"
                    required
                    placeholder="e.g. R058921A"
                    value={ceaNumber}
                    onChange={(e) => setCeaNumber(e.target.value)}
                  />

                  {/* Upload Checklist Drag and Drop Mock */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 block">Supporting Documents</label>
                    <div className="p-5 border border-dashed border-border rounded-xl text-center bg-neutral-50/20 dark:bg-neutral-950/20 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        required
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setLicenseFile(e.target.files[0]);
                          }
                        }}
                      />
                      <Upload className="h-6 w-6 text-neutral-400 mx-auto mb-2" />
                      <span className="block text-[11px] font-black text-foreground">
                        {licenseFile ? licenseFile.name : 'Upload NRIC / CEA Verified Card'}
                      </span>
                      <p className="text-[9px] text-neutral-400 mt-1">Accepts PDF, JPG, PNG up to 5MB.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <Button type="button" variant="outline" className="flex-1 font-bold" onClick={() => setActiveStep('role')}>
                      Back
                    </Button>
                    <Button type="submit" variant="gold" className="flex-1 font-bold uppercase tracking-wider">
                      Verify CEA License
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* Pending warning badge */}
          <div className="p-3 bg-neutral-950 text-neutral-400 rounded-lg text-[9px] uppercase tracking-widest text-center font-mono border border-neutral-900 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3 text-brand-gold" />
            <span>Onboarding Gate Status: Active Credentials Verification</span>
          </div>
        </Card>
      )}

    </div>
  );
}
