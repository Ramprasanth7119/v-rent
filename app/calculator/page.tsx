"use client";

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { 
  Calculator, ShieldAlert, BadgeDollarSign, Compass, Info, 
  TrendingUp, Coins, PiggyBank, Percent, Sparkles, Building, 
  HelpCircle, ArrowRight, CheckCircle2, ShieldAlert as WarningIcon
} from 'lucide-react';

export default function CalculatorPage() {
  
  // 1. STAMP DUTY (ABSD) STATE
  const [purchasePrice, setPurchasePrice] = useState(1500000);
  const [buyerProfile, setBuyerProfile] = useState<'citizen' | 'pr' | 'foreigner'>('citizen');
  const [propertyCount, setPropertyCount] = useState<1 | 2 | 3>(1);
  const [bsdResult, setBsdResult] = useState(0);
  const [absdResult, setAbsdResult] = useState(0);
  const [absdRate, setAbsdRate] = useState(0);

  const calculateStampDuty = () => {
    const price = purchasePrice;
    let bsd = 0;
    
    if (price <= 180000) bsd = price * 0.01;
    else if (price <= 360000) bsd = 1800 + (price - 180000) * 0.02;
    else if (price <= 1000000) bsd = 5400 + (price - 360000) * 0.03;
    else if (price <= 1500000) bsd = 24600 + (price - 1000000) * 0.04;
    else if (price <= 3000000) bsd = 44600 + (price - 1500000) * 0.05;
    else bsd = 119600 + (price - 3000000) * 0.06;

    let rate = 0;
    if (buyerProfile === 'citizen') {
      if (propertyCount === 1) rate = 0;
      else if (propertyCount === 2) rate = 0.20;
      else rate = 0.30;
    } else if (buyerProfile === 'pr') {
      if (propertyCount === 1) rate = 0.05;
      else if (propertyCount === 2) rate = 0.30;
      else rate = 0.35;
    } else {
      rate = 0.60;
    }

    const absd = price * rate;
    setBsdResult(Math.round(bsd));
    setAbsdRate(rate * 100);
    setAbsdResult(Math.round(absd));
  };

  // 2. LOAN REPAYMENT STATE
  const [loanAmount, setLoanAmount] = useState(1000000);
  const [interestRate, setInterestRate] = useState(3.2);
  const [tenureYears, setTenureYears] = useState(25);
  const [monthlyRepayment, setMonthlyRepayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);

  const calculateLoan = () => {
    const P = loanAmount;
    const r = (interestRate / 100) / 12;
    const n = tenureYears * 12;
    
    let monthly = 0;
    if (r === 0) monthly = P / n;
    else monthly = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const totalPaid = monthly * n;
    setMonthlyRepayment(Math.round(monthly));
    setTotalInterest(Math.round(totalPaid - P));
  };

  // 3. TDSR THRESHOLD STATE
  const [monthlyIncome, setMonthlyIncome] = useState(12000);
  const [otherDebtRepayments, setOtherDebtRepayments] = useState(1500);
  const [proposedMortgageInstallment, setProposedMortgageInstallment] = useState(4500);
  const [tdsrScore, setTdsrScore] = useState(0);
  const [tdsrPassed, setTdsrPassed] = useState<boolean | null>(null);

  const checkTdsr = () => {
    const totalDebt = otherDebtRepayments + proposedMortgageInstallment;
    const ratio = (totalDebt / monthlyIncome) * 100;
    setTdsrScore(Math.round(ratio));
    setTdsrPassed(ratio <= 55);
  };

  // 4. PROGRESSIVE PAYMENT STATE (Singapore construction milestones)
  const [progPrice, setProgPrice] = useState(1800000);
  const [progMilestones, setProgMilestones] = useState<any[]>([]);

  const calculateProgressivePayments = () => {
    const price = progPrice;
    const stages = [
      { name: "1. Option Fee (Booking)", pct: 5, desc: "Paid in cash upon signing the Option to Purchase (OTP)." },
      { name: "2. Sign S&P Agreement", pct: 15, desc: "Paid within 8 weeks via cash and/or CPF." },
      { name: "3. Foundation Stage", pct: 10, desc: "Developer completes foundation works." },
      { name: "4. Reinforced Concrete Framework", pct: 10, desc: "Completion of concrete structural frames." },
      { name: "5. Brick Walls Stage", pct: 5, desc: "Completion of internal brick partition walls." },
      { name: "6. Roofing & Ceiling Stage", pct: 5, desc: "Completion of unit roof and ceilings." },
      { name: "7. Plastering & Wiring", pct: 5, desc: "Completion of plastering, piping, and wiring." },
      { name: "8. Roads, Carparks & Drains", pct: 5, desc: "Completion of common external facilities." },
      { name: "9. Temporary Occupation Permit (TOP)", pct: 25, desc: "Handover of keys / Ready to move in." },
      { name: "10. Legal Completion (CSC)", pct: 15, desc: "Developer receives Certificate of Statutory Completion." }
    ];

    let cumulative = 0;
    const calculated = stages.map(st => {
      const stageAmount = Math.round(price * (st.pct / 100));
      cumulative += stageAmount;
      return {
        ...st,
        amount: stageAmount,
        cumulative
      };
    });
    setProgMilestones(calculated);
  };

  // 5. BUDGET AFFORDABILITY STATE
  const [affSalary1, setAffSalary1] = useState(8500);
  const [affSalary2, setAffSalary2] = useState(5500);
  const [affCash, setAffCash] = useState(150000);
  const [affCpf, setAffCpf] = useState(100000);
  const [affOtherDebts, setAffOtherDebts] = useState(1200);
  const [affStressRate, setAffStressRate] = useState(4.0);
  const [affLoanTenure, setAffLoanTenure] = useState(25);

  const [affResult, setAffResult] = useState<any>(null);

  const calculateAffordability = () => {
    const totalIncome = affSalary1 + affSalary2;
    const tdsrCap = totalIncome * 0.55;
    const maxInstallment = Math.max(0, tdsrCap - affOtherDebts);
    
    // Reverse mortgage formula to estimate supported loan
    const r = (affStressRate / 100) / 12;
    const n = affLoanTenure * 12;
    let maxLoan = 0;
    if (r === 0) {
      maxLoan = maxInstallment * n;
    } else {
      maxLoan = maxInstallment * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
    }
    
    // Bank loan LTV capped at 75%
    const maxPropertyPriceByLtv = maxLoan / 0.75;
    
    // Capital capacity (CPF + Cash) represents the remaining 25% downpayment
    const totalCapital = affCash + affCpf;
    const maxPropertyPriceByCapital = totalCapital / 0.25;

    // True affordability limit is the constraint minimum
    const affordablePrice = Math.round(Math.min(maxPropertyPriceByLtv, maxPropertyPriceByCapital));
    const finalLoan = Math.round(affordablePrice * 0.75);
    const requiredDownpayment = Math.round(affordablePrice * 0.25);
    const minCashDownpayment = Math.round(affordablePrice * 0.05); // 5% absolute cash
    const cpfDownpayment = Math.round(Math.max(0, requiredDownpayment - minCashDownpayment));

    setAffResult({
      totalIncome,
      maxInstallment: Math.round(maxInstallment),
      maxLoan: Math.round(maxLoan),
      affordablePrice,
      requiredDownpayment,
      minCashDownpayment,
      cpfDownpayment,
      insufficientCapital: totalCapital < requiredDownpayment
    });
  };

  // 6. RENTAL YIELD & ROI STATE
  const [yieldPrice, setYieldPrice] = useState(1600000);
  const [yieldMonthlyRent, setYieldMonthlyRent] = useState(5500);
  const [yieldExpenses, setYieldExpenses] = useState(8000); // Annual expenses (maintenance, tax)
  const [yieldMortgageInterest, setYieldMortgageInterest] = useState(24000); // Annual mortgage interest
  const [yieldCashInvested, setYieldCashInvested] = useState(480000); // Cash downpayment + stamp duties
  const [yieldResult, setYieldResult] = useState<any>(null);

  const calculateRentalYield = () => {
    const annualGrossRent = yieldMonthlyRent * 12;
    const grossYield = (annualGrossRent / yieldPrice) * 100;
    const netRentalIncome = annualGrossRent - yieldExpenses;
    const netYield = (netRentalIncome / yieldPrice) * 100;
    
    const cashFlowAfterMortgage = netRentalIncome - yieldMortgageInterest;
    const cashOnCashROI = (cashFlowAfterMortgage / yieldCashInvested) * 100;

    setYieldResult({
      annualGrossRent,
      grossYield: Number(grossYield.toFixed(2)),
      netRentalIncome,
      netYield: Number(netYield.toFixed(2)),
      cashFlowAfterMortgage,
      cashOnCashROI: Number(cashOnCashROI.toFixed(2))
    });
  };

  // Trigger calculations on mount / state modifications
  React.useEffect(() => {
    calculateStampDuty();
  }, [purchasePrice, buyerProfile, propertyCount]);

  React.useEffect(() => {
    calculateLoan();
  }, [loanAmount, interestRate, tenureYears]);

  React.useEffect(() => {
    checkTdsr();
  }, [monthlyIncome, otherDebtRepayments, proposedMortgageInstallment]);

  React.useEffect(() => {
    calculateProgressivePayments();
  }, [progPrice]);

  React.useEffect(() => {
    calculateAffordability();
  }, [affSalary1, affSalary2, affCash, affCpf, affOtherDebts, affStressRate, affLoanTenure]);

  React.useEffect(() => {
    calculateRentalYield();
  }, [yieldPrice, yieldMonthlyRent, yieldExpenses, yieldMortgageInterest, yieldCashInvested]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div className="text-left">
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Financial Tools Hub</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Perform high-fidelity mortgage simulations, progressive payments, budget affordability, decoupling strategies, and rental yield estimations under MAS regulations.
        </p>
      </div>

      {/* Calculator Tabs */}
      <Tabs
        items={[
          {
            id: 'stamp-duty',
            label: (
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                <BadgeDollarSign className="h-4 w-4" />
                ABSD Stamp Duty
              </span>
            ),
            content: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left animate-in fade-in duration-200">
                <Card className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Parameters</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Purchase Price / Valuation (SGD)</label>
                    <input 
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Buyer Status Profile</label>
                    <Select
                      options={[
                        { value: 'citizen', label: 'Singapore Citizen (SC)' },
                        { value: 'pr', label: 'Permanent Resident (SPR)' },
                        { value: 'foreigner', label: 'Foreigner' }
                      ]}
                      value={buyerProfile}
                      onChange={(e: any) => setBuyerProfile(e.target.value)}
                    />
                  </div>
                  {buyerProfile !== 'foreigner' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">Residential Property Owned Count</label>
                      <Select
                        options={[
                          { value: 1, label: '1st Property' },
                          { value: 2, label: '2nd Property' },
                          { value: 3, label: '3rd & Subsequent Property' }
                        ]}
                        value={propertyCount}
                        onChange={(e: any) => setPropertyCount(Number(e.target.value) as any)}
                      />
                    </div>
                  )}
                </Card>

                <Card className="bg-brand-navy-dark text-white border-neutral-800 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold">Calculation Summary</h3>
                    <div className="space-y-3 divide-y divide-neutral-800 text-xs">
                      <div className="flex justify-between py-2 font-semibold">
                        <span>Buyer's Stamp Duty (BSD)</span>
                        <span>S${bsdResult.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-3 font-semibold">
                        <span className="flex flex-col">
                          <span>Additional Buyer's Stamp Duty (ABSD)</span>
                          <span className="text-[10px] text-neutral-400 mt-1">Rate: {absdRate}%</span>
                        </span>
                        <span>S${absdResult.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-neutral-800">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-neutral-400 uppercase">Estimated Total Tax Payable</span>
                      <span className="text-2xl font-black text-brand-gold">S${(bsdResult + absdResult).toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-3 leading-relaxed flex items-start gap-1">
                      <Info className="h-3 w-3 text-brand-gold flex-shrink-0 mt-0.5" />
                      <span>ABSD rates are subject to decoupling adjustments or standard MAS concessions.</span>
                    </p>
                  </div>
                </Card>
              </div>
            )
          },
          {
            id: 'loan-repayment',
            label: (
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                <Calculator className="h-4 w-4" />
                Monthly Repayment
              </span>
            ),
            content: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left animate-in fade-in duration-200">
                <Card className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Loan Specifications</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Loan Amount (SGD)</label>
                    <input 
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Interest Rate (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Loan Tenure (Years)</label>
                    <input 
                      type="number"
                      value={tenureYears}
                      onChange={(e) => setTenureYears(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </Card>

                <Card className="bg-brand-navy-dark text-white border-neutral-800 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold">Repayments Breakdowns</h3>
                    <div className="space-y-3 divide-y divide-neutral-800 text-xs">
                      <div className="flex justify-between py-2 font-semibold">
                        <span>Principal Borrowed</span>
                        <span>S${loanAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-3 font-semibold text-neutral-300">
                        <span>Projected Total Interest Paid</span>
                        <span>S${totalInterest.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-neutral-800">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-neutral-400 uppercase">Estimated Monthly Installment</span>
                      <span className="text-2xl font-black text-brand-gold">S${monthlyRepayment.toLocaleString()}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )
          },
          {
            id: 'tdsr-checker',
            label: (
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                <ShieldAlert className="h-4 w-4" />
                MAS TDSR Checker
              </span>
            ),
            content: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left animate-in fade-in duration-200">
                <Card className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Income & Liabilities</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Gross Monthly Household Income (SGD)</label>
                    <input 
                      type="number"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Existing Monthly Car/Card Debts (SGD)</label>
                    <input 
                      type="number"
                      value={otherDebtRepayments}
                      onChange={(e) => setOtherDebtRepayments(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Proposed Monthly Mortgage (SGD)</label>
                    <input 
                      type="number"
                      value={proposedMortgageInstallment}
                      onChange={(e) => setProposedMortgageInstallment(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </Card>

                <Card className="bg-brand-navy-dark text-white border-neutral-800 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold">TDSR Limits Check</h3>
                    <div className="text-center py-6">
                      <span className="text-xs font-bold uppercase text-neutral-400 block">Computed Debt Servicing Ratio</span>
                      <span className={`text-4xl font-black mt-2 block ${tdsrPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tdsrScore}%
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-neutral-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-neutral-400 uppercase">MAS Regulatory Status</span>
                      {tdsrPassed ? (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider">PASSED (&lt;=55%)</span>
                      ) : (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider">FAILED (&gt;55%)</span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-4 leading-relaxed font-sans font-normal normal-case">
                      MAS guidelines state that a borrower's total debt servicing obligations (TDSR) cannot exceed 55% of their gross monthly income.
                    </p>
                  </div>
                </Card>
              </div>
            )
          },
          {
            id: 'prequalify',
            label: (
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                <Compass className="h-4 w-4" />
                Mortgage Pre-Qualification
              </span>
            ),
            content: <MortgagePreQualTab />
          },
          {
            id: 'progressive-payment',
            label: (
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                <Building className="h-4 w-4" />
                Progressive Payment
              </span>
            ),
            content: (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 text-left animate-in fade-in duration-200">
                <Card className="md:col-span-4 space-y-4 h-fit">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Launch Specs</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">New Launch Purchase Price (SGD)</label>
                    <input 
                      type="number"
                      value={progPrice}
                      onChange={(e) => setProgPrice(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-border space-y-1.5 text-xs leading-normal">
                    <span className="font-bold text-foreground block">What is Progressive Payment?</span>
                    <p className="text-neutral-500 font-normal text-[10px] normal-case">
                      For buildings under construction, payments are released to the developer in stages as key construction milestones are certified complete by architects.
                    </p>
                  </div>
                </Card>

                <Card className="md:col-span-8 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 pb-2 border-b border-border">Milestone Payment Schedule</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {progMilestones.map((st, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 border border-border rounded-xl bg-neutral-50/10 hover:bg-neutral-50/30 dark:hover:bg-neutral-900/10 transition-colors text-xs font-semibold">
                        <div className="space-y-0.5 text-left max-w-[70%]">
                          <span className="font-bold text-foreground block">{st.name} ({st.pct}%)</span>
                          <span className="text-[10px] text-neutral-400 block font-normal normal-case leading-normal">{st.desc}</span>
                        </div>
                        <div className="text-right flex flex-col justify-end">
                          <span className="text-sm font-black text-brand-gold">S${st.amount.toLocaleString()}</span>
                          <span className="text-[9px] text-neutral-400 font-mono mt-0.5">Cum: S${st.cumulative.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )
          },
          {
            id: 'affordability',
            label: (
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                <PiggyBank className="h-4 w-4" />
                Affordability Wizard
              </span>
            ),
            content: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left animate-in fade-in duration-200">
                <Card className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Financial Profile</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Main Buyer Salary (S$)"
                      type="number"
                      value={affSalary1}
                      onChange={(e) => setAffSalary1(Number(e.target.value))}
                    />
                    <Input
                      label="Co-Buyer Salary (S$)"
                      type="number"
                      value={affSalary2}
                      onChange={(e) => setAffSalary2(Number(e.target.value))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Available Cash (S$)"
                      type="number"
                      value={affCash}
                      onChange={(e) => setAffCash(Number(e.target.value))}
                    />
                    <Input
                      label="CPF Ordinary Acct (S$)"
                      type="number"
                      value={affCpf}
                      onChange={(e) => setAffCpf(Number(e.target.value))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Car/Credit Debts (S$/mo)"
                      type="number"
                      value={affOtherDebts}
                      onChange={(e) => setAffOtherDebts(Number(e.target.value))}
                    />
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase text-neutral-500">Interest Stress %</label>
                      <input 
                        type="number" step="0.1" value={affStressRate} onChange={(e) => setAffStressRate(Number(e.target.value))}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase text-neutral-500">Tenure Yrs</label>
                      <input 
                        type="number" value={affLoanTenure} onChange={(e) => setAffLoanTenure(Number(e.target.value))}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </Card>

                {affResult && (
                  <Card className="bg-brand-navy-dark text-white border-neutral-800 space-y-6 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold">Estimated Buying Limit</h3>
                        <Badge variant="ai">Affordability Scorecard</Badge>
                      </div>

                      <div className="text-center py-4">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase block">Max Property Purchase Price</span>
                        <span className="text-3xl font-black text-brand-gold mt-1 block">SGD {affResult.affordablePrice.toLocaleString()}</span>
                      </div>

                      <div className="space-y-2 border-t border-neutral-800 pt-4 text-xs font-semibold">
                        <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                          <span className="text-neutral-400">Supported Loan Cap (75% LTV):</span>
                          <span>S${affResult.maxLoan.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                          <span className="text-neutral-400">Total Downpayment Required (25%):</span>
                          <span>S${affResult.requiredDownpayment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                          <span className="text-neutral-400">Min cash downpayment (5%):</span>
                          <span>S${affResult.minCashDownpayment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Remaining downpayment (CPF/Cash):</span>
                          <span>S${affResult.cpfDownpayment.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-800">
                      {affResult.insufficientCapital ? (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 rounded-lg flex items-start gap-1.5">
                          <WarningIcon className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>Warning: Your combined cash/CPF is insufficient to cover the S${affResult.requiredDownpayment.toLocaleString()} downpayment. Save more or request agent decoupled options.</span>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 rounded-lg flex items-start gap-1.5">
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>Approved: Your capital reserves cover the required downpayment options successfully.</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )
          },
          {
            id: 'mortgage-comparison',
            label: (
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                <Percent className="h-4 w-4" />
                Bank Comparisons
              </span>
            ),
            content: <MortgageBankComparisonTab monthlyLoan={loanAmount} />
          },
          {
            id: 'rental-yield',
            label: (
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                <TrendingUp className="h-4 w-4" />
                Rental Yield & ROI
              </span>
            ),
            content: (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 text-left animate-in fade-in duration-200">
                <Card className="md:col-span-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Deal Parameters</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Property Purchase Price (SGD)</label>
                    <input type="number" value={yieldPrice} onChange={e => setYieldPrice(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Expected Monthly Rent (SGD)</label>
                    <input type="number" value={yieldMonthlyRent} onChange={e => setYieldMonthlyRent(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Annual Outgoings (Taxes/Maintenance)</label>
                    <input type="number" value={yieldExpenses} onChange={e => setYieldExpenses(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Annual Mortgage Interest (SGD)</label>
                    <input type="number" value={yieldMortgageInterest} onChange={e => setYieldMortgageInterest(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">Total Cash Invested (Downpayment+Duties)</label>
                    <input type="number" value={yieldCashInvested} onChange={e => setYieldCashInvested(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs focus:outline-none" />
                  </div>
                </Card>

                {yieldResult && (
                  <Card className="md:col-span-7 bg-brand-navy-dark text-white border-neutral-800 space-y-6 flex flex-col justify-between">
                    <div className="space-y-4 text-xs font-semibold">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-gold">Investment Returns Analysis</h3>
                        <Badge variant="success">Yield Computed</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-center py-4 border-b border-neutral-800">
                        <div>
                          <span className="text-[9px] text-neutral-400 font-bold uppercase block">Gross Rental Yield</span>
                          <span className="text-2xl font-black text-white mt-1 block">{yieldResult.grossYield}%</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 font-bold uppercase block">Net Rental Yield</span>
                          <span className="text-2xl font-black text-brand-gold mt-1 block">{yieldResult.netYield}%</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                          <span className="text-neutral-400">Annual Gross Rental Income:</span>
                          <span>S${yieldResult.annualGrossRent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                          <span className="text-neutral-400">Net Rental Income (after costs):</span>
                          <span>S${yieldResult.netRentalIncome.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                          <span className="text-neutral-400">Net Annual Cashflow (after mortgage interest):</span>
                          <span className={yieldResult.cashFlowAfterMortgage >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            S${yieldResult.cashFlowAfterMortgage.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 items-baseline">
                          <span className="text-brand-gold uppercase text-[10px] font-black">Cash-on-Cash Return (ROI):</span>
                          <span className="text-lg font-black text-brand-gold">{yieldResult.cashOnCashROI}%</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )
          },
          {
            id: 'wizard360',
            label: (
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-xs font-bold">
                <Sparkles className="h-4 w-4" />
                Homeowner 360°
              </span>
            ),
            content: <HomeownerWizard360Tab />
          }
        ]}
      />

    </div>
  );
}

// 4. SUB-TAB COMPONENTS
function MortgagePreQualTab() {
  const [applicantName, setApplicantName] = useState('');
  const [nationality, setNationality] = useState<'citizen' | 'pr' | 'foreigner'>('citizen');
  const [employmentType, setEmploymentType] = useState<'employed' | 'selfEmployed' | 'business'>('employed');
  const [monthlyIncome, setMonthlyIncome] = useState(12000);
  const [existingDebts, setExistingDebts] = useState(1200);
  const [propertyPrice, setPropertyPrice] = useState(1500000);
  const [downPaymentPct, setDownPaymentPct] = useState(25);
  const [selectedBank, setSelectedBank] = useState('dbs');
  const [loanTenure, setLoanTenure] = useState(25);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const banks = [
    { id: 'dbs', name: 'DBS / POSB Bank', logo: '🏦', rate: 3.08, maxLtv: 75 },
    { id: 'ocbc', name: 'OCBC Bank', logo: '🏛️', rate: 3.15, maxLtv: 75 },
    { id: 'uob', name: 'UOB Bank', logo: '🏢', rate: 3.22, maxLtv: 75 },
    { id: 'standard', name: 'Standard Chartered', logo: '🌏', rate: 3.35, maxLtv: 75 },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    setTimeout(() => {
      const bank = banks.find(b => b.id === selectedBank)!;
      const downPayment = propertyPrice * (downPaymentPct / 100);
      const loanAmount = propertyPrice - downPayment;
      const maxLoanByLtv = propertyPrice * (bank.maxLtv / 100);
      const r = (bank.rate / 100) / 12;
      const n = loanTenure * 12;
      const monthly = loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const totalDebt = existingDebts + monthly;
      const tdsr = (totalDebt / monthlyIncome) * 100;
      const msr = (monthly / monthlyIncome) * 100;
      const passed = tdsr <= 55;

      setResult({
        bank,
        loanAmount: Math.round(Math.min(loanAmount, maxLoanByLtv)),
        downPayment: Math.round(downPayment),
        monthly: Math.round(monthly),
        tdsr: Math.round(tdsr),
        msr: Math.round(msr),
        passed,
        refNo: `VRENT-PQ-${Date.now().toString().slice(-6)}`,
        applicantName: applicantName || 'Applicant'
      });
      setLoading(false);
    }, 1400);
  };

  return (
    <div className="space-y-6 pt-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <form onSubmit={handleSubmit} className="md:col-span-7 space-y-5">
          <Card className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Select Partner Bank</h3>
            <div className="grid grid-cols-2 gap-3">
              {banks.map(bank => (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => setSelectedBank(bank.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedBank === bank.id ? 'border-brand-gold bg-brand-gold/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{bank.logo}</span>
                    <span className="text-[9px] font-black text-brand-gold">{bank.rate}% p.a.</span>
                  </div>
                  <span className="text-[10px] font-bold text-foreground block mt-1.5">{bank.name}</span>
                  <span className="text-[8px] text-neutral-400 font-bold uppercase">Max LTV: {bank.maxLtv}%</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Applicant Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Tan Wei Ming"
                  value={applicantName}
                  onChange={e => setApplicantName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Nationality Status</label>
                <select
                  value={nationality}
                  onChange={e => setNationality(e.target.value as any)}
                  className="w-full text-xs font-bold rounded-lg border border-border bg-card p-2 text-foreground focus:outline-none"
                >
                  <option value="citizen">Singapore Citizen</option>
                  <option value="pr">Permanent Resident</option>
                  <option value="foreigner">Foreigner / EP Holder</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Employment Type</label>
                <select
                  value={employmentType}
                  onChange={e => setEmploymentType(e.target.value as any)}
                  className="w-full text-xs font-bold rounded-lg border border-border bg-card p-2 text-foreground focus:outline-none"
                >
                  <option value="employed">Salaried Employee</option>
                  <option value="selfEmployed">Self-Employed</option>
                  <option value="business">Business Director</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Gross Monthly Income (SGD)</label>
                <input type="number" required value={monthlyIncome} onChange={e => setMonthlyIncome(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Existing Monthly Debts</label>
                <input type="number" value={existingDebts} onChange={e => setExistingDebts(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs focus:outline-none" />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Property & Loan Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Property Value (SGD)</label>
                <input type="number" required value={propertyPrice} onChange={e => setPropertyPrice(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Down Payment (%)</label>
                <select value={downPaymentPct} onChange={e => setDownPaymentPct(Number(e.target.value))} className="w-full text-xs font-bold rounded-lg border border-border bg-card p-2 text-foreground focus:outline-none">
                  <option value={25}>25% (Min for Private)</option>
                  <option value={30}>30%</option>
                  <option value={40}>40%</option>
                  <option value={50}>50%</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-neutral-500 block">Loan Tenure (Years)</label>
                <select value={loanTenure} onChange={e => setLoanTenure(Number(e.target.value))} className="w-full text-xs font-bold rounded-lg border border-border bg-card p-2 text-foreground focus:outline-none">
                  <option value={15}>15 Years</option>
                  <option value={20}>20 Years</option>
                  <option value={25}>25 Years</option>
                  <option value={30}>30 Years</option>
                </select>
              </div>
            </div>
          </Card>

          <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider py-3 text-sm" isLoading={loading}>
            Submit Pre-Qualification Request
          </Button>
        </form>

        <div className="md:col-span-5 text-xs text-left">
          {!result && !loading ? (
            <Card className="h-full border-dashed border-border flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[400px]">
              <div className="h-14 w-14 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center text-2xl">🏦</div>
              <h4 className="text-sm font-bold uppercase text-foreground">Awaiting Application</h4>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                Fill in your profile and loan details, then submit to receive a live conditional In-Principle Approval (IPA).
              </p>
            </Card>
          ) : loading ? (
            <Card className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[400px]">
              <div className="h-10 w-10 rounded-full border-4 border-brand-gold border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Transmitting to Bank Systems...</p>
            </Card>
          ) : result && (
            <div className="space-y-4">
              <Card className={`p-6 space-y-4 border-2 ${ result.passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">{result.bank.logo} {result.bank.name}</span>
                    <h3 className={`text-sm font-black uppercase mt-1 ${ result.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                      {result.passed ? '✅ Conditionally Approved' : '❌ Declined'}
                    </h3>
                  </div>
                  <span className="text-[8px] font-mono text-neutral-400 border border-border rounded px-2 py-1">Ref: {result.refNo}</span>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed normal-case">
                  {result.passed
                    ? `Dear ${result.applicantName}, based on your submitted profile, ${result.bank.name} has issued a conditional In-Principle Approval (IPA) for the mortgage loan cap stated below.`
                    : `Dear ${result.applicantName}, we regret that your application fails to satisfy MAS TDSR constraints of 55%.`
                  }
                </p>
                <div className="space-y-2 border-t border-border/50 pt-4">
                  {[
                    { label: 'Approved Loan Amount', value: `S$${result.loanAmount.toLocaleString()}`, highlight: true },
                    { label: 'Required Down Payment', value: `S$${result.downPayment.toLocaleString()}`, highlight: false },
                    { label: 'Monthly Installment', value: `S$${result.monthly.toLocaleString()}/month`, highlight: false },
                    { label: 'Interest Rate', value: `${result.bank.rate}% p.a.`, highlight: false },
                    { label: 'TDSR Ratio', value: `${result.tdsr}%`, highlight: false }
                  ].map((row, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold">
                      <span className="text-neutral-500 uppercase text-[9px]">{row.label}</span>
                      <span className={row.highlight ? 'text-brand-gold text-sm font-black' : 'text-foreground'}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MortgageBankComparisonTab({ monthlyLoan }: { monthlyLoan: number }) {
  const [calcLoan, setCalcLoan] = useState<number>(monthlyLoan || 1000000);
  const [tenure, setTenure] = useState<number>(25);

  const packages = [
    { bank: "DBS Bank", type: "Fixed Rate", rate: 3.08, logo: "🏦", lockin: "2 Years", desc: "Best safety from rate hikes." },
    { bank: "UOB Bank", type: "SORA-Floating", rate: 3.25, logo: "🏢", lockin: "1 Year", desc: "Pegged to 3-Month SORA median." },
    { bank: "OCBC Bank", type: "Fixed Promotion", rate: 2.99, logo: "🏛️", lockin: "3 Years", desc: "Special campaign promotional rate." },
    { bank: "Standard Chartered", type: "Floating Rate", rate: 3.35, logo: "🌏", lockin: "None", desc: "Zero lock-in flexible payments." }
  ];

  return (
    <div className="space-y-6 pt-4 text-left animate-in fade-in duration-200">
      <Card className="p-4 flex gap-4 items-end flex-wrap">
        <div className="flex-grow min-w-[200px]">
          <Input 
            label="Loan Principal (SGD)" 
            type="number" 
            value={calcLoan} 
            onChange={(e) => setCalcLoan(Number(e.target.value))} 
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">Tenure Yrs</label>
          <select 
            value={tenure} 
            onChange={(e) => setTenure(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-card p-2 text-sm text-foreground focus:outline-none"
          >
            <option value={15}>15 Years</option>
            <option value={20}>20 Years</option>
            <option value={25}>25 Years</option>
            <option value={30}>30 Years</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {packages.map((pkg, idx) => {
          const r = (pkg.rate / 100) / 12;
          const n = tenure * 12;
          const monthly = calcLoan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          return (
            <Card key={idx} className="p-5 flex flex-col justify-between h-52">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{pkg.logo}</span>
                    <div>
                      <span className="text-xs font-black text-foreground block">{pkg.bank}</span>
                      <span className="text-[9px] text-neutral-400 font-bold uppercase">{pkg.type}</span>
                    </div>
                  </div>
                  <Badge variant="gold" className="text-[9px] font-mono">{pkg.rate}% p.a.</Badge>
                </div>
                <p className="text-[10px] text-neutral-400 mt-3 font-normal normal-case leading-normal">{pkg.desc}</p>
                <div className="flex items-center gap-1.5 mt-2 text-[9px] text-neutral-500 font-bold uppercase">
                  <span>Lock-in: {pkg.lockin}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-baseline mt-4">
                <span className="text-[9px] text-neutral-400 font-bold uppercase">Est. Repayment</span>
                <span className="text-base font-black text-brand-gold">S${Math.round(monthly).toLocaleString()} /mo</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function HomeownerWizard360Tab() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState('citizen_married');
  const [ownCount, setOwnCount] = useState(0);
  const [cash, setCash] = useState(250000);
  const [cpf, setCpf] = useState(180000);
  const [income, setIncome] = useState(16000);
  const [intent, setIntent] = useState('upgrade'); // upgrade | first_home | invest
  
  // Scorecard states
  const [score, setScore] = useState(0);
  const [strategy, setStrategy] = useState<string[]>([]);

  const runDiagnostics = () => {
    let finalScore = 90;
    const tips = [];

    if (profile === 'foreigner') {
      finalScore -= 30;
      tips.push("⚠️ Subject to 60% ABSD unless covered by FTA treaties (US Citizens, Swiss, Norwegian).");
    } else if (profile === 'citizen_married' && intent === 'upgrade') {
      tips.push("💡 Upgrader Concession: You can claim full ABSD remission on your second residential purchase if you sell your first HDB flat within 6 months of completion.");
    }

    if (ownCount >= 1 && intent === 'invest') {
      tips.push("💡 Decoupling Strategy: Consider holding properties under separate individual names to avoid the 20% ABSD rate on second residential properties.");
    }

    const netWorth = cash + cpf;
    if (netWorth < 200000) {
      finalScore -= 15;
      tips.push("⚠️ Low liquidity bounds detected. Consider HDB resale routes rather than high-leverage private launch contracts.");
    }

    if (income * 0.55 < 2000) {
      finalScore -= 10;
    }

    setScore(Math.max(20, finalScore));
    setStrategy(tips);
    setStep(3);
  };

  return (
    <div className="space-y-6 pt-4 text-left animate-in fade-in duration-200">
      
      {step === 1 && (
        <Card className="p-6 space-y-5 max-w-lg mx-auto">
          <div className="text-center space-y-2">
            <div className="h-10 w-10 bg-brand-gold/10 rounded-full flex items-center justify-center text-brand-gold mx-auto">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Homeowner 360° Financial Diagnostic</h3>
            <p className="text-xs text-neutral-400 normal-case">Answer a 3-step questionnaire to map your debt thresholds and ABSD optimization strategy.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-neutral-500">Applicant Status Profile</label>
              <select value={profile} onChange={e => setProfile(e.target.value)} className="w-full bg-card border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none">
                <option value="citizen_married">Singapore Citizen Couple (Married)</option>
                <option value="citizen_single">Singapore Citizen (Single &gt;35)</option>
                <option value="pr_married">Permanent Resident Couple</option>
                <option value="foreigner">Foreign Investor</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-neutral-500">Current Properties Owned in Singapore</label>
              <select value={ownCount} onChange={e => setOwnCount(Number(e.target.value))} className="w-full bg-card border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none">
                <option value={0}>0 Properties (First Home)</option>
                <option value={1}>1 Property</option>
                <option value={2}>2 or more properties</option>
              </select>
            </div>
          </div>

          <Button variant="gold" className="w-full font-bold uppercase tracking-wider py-2.5" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => setStep(2)}>
            Continue to Assets
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 space-y-5 max-w-lg mx-auto">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Step 2: Capital Reserves</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Liquid Cash Assets (S$)" type="number" value={cash} onChange={e => setCash(Number(e.target.value))} />
              <Input label="CPF OA Balance (S$)" type="number" value={cpf} onChange={e => setCpf(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Monthly Household Salary (S$)" type="number" value={income} onChange={e => setIncome(Number(e.target.value))} />
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-neutral-500">Primary Objective</label>
                <select value={intent} onChange={e => setIntent(e.target.value)} className="w-full bg-card border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none">
                  <option value="upgrade">HDB to Condo Upgrader</option>
                  <option value="first_home">First Home purchase</option>
                  <option value="invest">Pure Yield Investment</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button variant="gold" className="flex-1 font-bold uppercase tracking-wider" onClick={runDiagnostics}>
              Evaluate Assessment
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in zoom-in duration-200">
          <Card className="md:col-span-5 bg-brand-navy-dark text-white border-neutral-800 text-center p-6 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Diagnostic Outcome</span>
              <h4 className="text-sm font-bold uppercase text-white mt-1">Financial Score</h4>
            </div>
            
            <div className="py-8">
              <span className={`text-5xl font-black ${score >= 80 ? 'text-emerald-400' : (score >= 60 ? 'text-amber-400' : 'text-red-400')}`}>
                {score} <span className="text-xs text-white">/ 100</span>
              </span>
              <span className="text-[10px] text-neutral-400 block font-bold uppercase mt-2">
                {score >= 80 ? 'EXCELLENT FINANCIAL STANDING' : (score >= 60 ? 'STABLE - WATCH DEBT CONSTRAINTS' : 'CRITICAL LIMIT RISKS')}
              </span>
            </div>

            <Button variant="outline" className="text-white border-neutral-700 w-full" onClick={() => setStep(1)}>
              Restart Wizard
            </Button>
          </Card>

          <Card className="md:col-span-7 p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 pb-2 border-b border-border flex items-center gap-1">
              <Sparkles className="h-4.5 w-4.5 text-brand-gold" />
              Strategic Recommendations
            </h3>
            {strategy.length > 0 ? (
              <div className="space-y-3.5">
                {strategy.map((item, i) => (
                  <div key={i} className="p-3 border border-border rounded-xl bg-neutral-50/10 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans normal-case">
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 bg-neutral-50 border border-border rounded-xl text-xs text-neutral-500 font-normal normal-case leading-normal font-sans">
                You are in prime position for first property purchase. Ensure you secure a standard bank IPA letter before signing the option to purchase.
              </div>
            )}
          </Card>
        </div>
      )}

    </div>
  );
}
