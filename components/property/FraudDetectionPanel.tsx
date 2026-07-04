"use client";

import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X, ExternalLink, Flag } from 'lucide-react';

interface FraudSignal {
  severity: 'high' | 'medium' | 'low';
  message: string;
}

interface FraudDetectionProps {
  propertyPrice: number;
  districtMedianPsf: number;
  listingPsf: number;
  agentIsNew?: boolean;
  hasVerifiedMedia?: boolean;
  agentCea?: string;
}

function computeRiskScore(props: FraudDetectionProps): { score: number; signals: FraudSignal[] } {
  const signals: FraudSignal[] = [];
  let score = 0;

  const priceDelta = ((props.districtMedianPsf - props.listingPsf) / props.districtMedianPsf) * 100;
  if (priceDelta > 30) {
    score += 50;
    signals.push({ severity: 'high', message: `Listing PSF (S$${props.listingPsf}) is ${priceDelta.toFixed(0)}% below district median — significantly underpriced.` });
  } else if (priceDelta > 15) {
    score += 20;
    signals.push({ severity: 'medium', message: `Listing PSF is ${priceDelta.toFixed(0)}% below district median. Verify with agent.` });
  }

  if (props.agentIsNew) {
    score += 25;
    signals.push({ severity: 'medium', message: 'Agent account created recently. Verify CEA licence on CEA Public Register.' });
  }

  if (!props.hasVerifiedMedia) {
    score += 20;
    signals.push({ severity: 'low', message: 'No verified professional photos or video tour attached to this listing.' });
  }

  return { score: Math.min(score, 100), signals };
}

export default function FraudDetectionPanel(props: FraudDetectionProps) {
  const [dismissed, setDismissed] = useState(false);
  const [reported, setReported] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { score, signals } = computeRiskScore(props);

  if (signals.length === 0 || dismissed) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span className="text-xs font-bold text-emerald-500">Listing passed V-RENT fraud detection checks</span>
      </div>
    );
  }

  const riskLevel = score >= 50 ? 'High Risk' : score >= 25 ? 'Medium Risk' : 'Low Risk';
  const riskColor = score >= 50 
    ? 'border-red-500/30 bg-red-500/5' 
    : score >= 25 
    ? 'border-amber-500/30 bg-amber-500/5' 
    : 'border-yellow-500/20 bg-yellow-500/5';
  const riskTextColor = score >= 50 ? 'text-red-500' : score >= 25 ? 'text-amber-500' : 'text-yellow-500';
  const iconColor = score >= 50 ? 'text-red-500' : score >= 25 ? 'text-amber-500' : 'text-yellow-500';

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${riskColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
          <div>
            <h4 className={`text-sm font-black uppercase tracking-wider ${riskTextColor}`}>
              Fraud Alert — {riskLevel}
            </h4>
            <p className="text-[10px] text-neutral-500 mt-0.5">V-RENT AI detected {signals.length} flag{signals.length > 1 ? 's' : ''} on this listing · Risk Score: {score}/100</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Risk Score Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${score >= 50 ? 'bg-red-500' : score >= 25 ? 'bg-amber-500' : 'bg-yellow-500'}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-neutral-400 font-bold">
          <span>Safe</span>
          <span>Risk Score: {score}/100</span>
          <span>High Risk</span>
        </div>
      </div>

      {/* Signals */}
      <div className="space-y-2">
        {signals.slice(0, showDetails ? undefined : 1).map((sig, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${sig.severity === 'high' ? 'bg-red-500' : sig.severity === 'medium' ? 'bg-amber-500' : 'bg-yellow-500'}`} />
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{sig.message}</p>
          </div>
        ))}
        {signals.length > 1 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`text-[11px] font-bold cursor-pointer hover:underline ${riskTextColor}`}
          >
            {showDetails ? 'Show less' : `+${signals.length - 1} more signal${signals.length > 2 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href="https://www.cea.gov.sg/aceas/public-register"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider hover:underline cursor-pointer ${riskTextColor}`}
        >
          <ExternalLink className="h-3 w-3" /> Verify Agent on CEA Register
        </a>
        {!reported ? (
          <button
            onClick={() => setReported(true)}
            className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider hover:underline cursor-pointer ${riskTextColor} ml-auto`}
          >
            <Flag className="h-3 w-3" /> Report Listing
          </button>
        ) : (
          <span className="text-[11px] font-bold text-emerald-500 ml-auto flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Reported to V-RENT Trust & Safety
          </span>
        )}
      </div>
    </div>
  );
}
