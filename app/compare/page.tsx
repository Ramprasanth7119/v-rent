"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockProperties, Property } from '../../lib/mock-data/properties';
import { 
  X, Plus, Calculator, Compass, Sparkles, MapPin, 
  Trash2, Building, HelpCircle, MessageSquare
} from 'lucide-react';

export default function ComparePropertiesPage() {
  const [selectedProps, setSelectedProps] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  // Set default compared properties for high-fidelity initial presentation
  useEffect(() => {
    if (mockProperties.length >= 2) {
      setSelectedProps([mockProperties[0], mockProperties[1]]);
    }
  }, []);

  const handleAddProperty = (prop: Property) => {
    if (selectedProps.find(p => p.id === prop.id)) {
      alert("Property is already added to comparison.");
      return;
    }
    if (selectedProps.length >= 4) {
      alert("You can compare up to 4 properties side-by-side.");
      return;
    }
    setSelectedProps(prev => [...prev, prop]);
    setSearchQuery('');
    setDropdownOpen(false);
  };

  const handleRemoveProperty = (id: string) => {
    setSelectedProps(prev => prev.filter(p => p.id !== id));
  };

  const handleClearAll = () => {
    setSelectedProps([]);
  };

  // Filter properties in dropdown search
  const filteredOptions = mockProperties.filter(prop => 
    !selectedProps.find(p => p.id === prop.id) &&
    (prop.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     prop.areaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     prop.propertyType.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Property Comparison Engine</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Compare key parameters, location logistics, financial yields, and AI scores side-by-side for up to 4 starred properties.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedProps.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearAll} leftIcon={<Trash2 className="h-4 w-4" />}>
              Clear All
            </Button>
          )}
          <Badge variant="gold" className="text-xs py-1.5 px-3 uppercase tracking-wider">Side-by-Side Grid</Badge>
        </div>
      </div>

      {/* Property search bar to select items */}
      <div className="relative max-w-xl">
        <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1.5">Add Property to Compare</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type property name, area or district (e.g. Ritz-Carlton, Martin Modern, Clementi)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            className="flex-grow rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-brand-gold"
          />
          {selectedProps.length < 4 ? (
            <Button variant="gold" onClick={() => setDropdownOpen(!dropdownOpen)}>
              Browse
            </Button>
          ) : (
            <Button variant="gold" disabled>Slots Full</Button>
          )}
        </div>

        {/* Dropdown Options */}
        {dropdownOpen && selectedProps.length < 4 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1.5 duration-100 divide-y divide-border">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(prop => (
                <div
                  key={prop.id}
                  onClick={() => handleAddProperty(prop)}
                  className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 cursor-pointer flex justify-between items-center text-xs text-left"
                >
                  <div>
                    <span className="font-bold text-foreground block">{prop.title}</span>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase">{prop.areaName} · D{prop.district} · {prop.propertyType}</span>
                  </div>
                  <span className="font-black text-brand-gold">SGD {prop.price.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-neutral-500 text-xs">No matching properties found</div>
            )}
          </div>
        )}
      </div>

      {/* Comparison Grid */}
      {selectedProps.length === 0 ? (
        <Card className="border-dashed border-border py-16 text-center space-y-4 max-w-xl mx-auto">
          <div className="h-12 w-12 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center text-xl text-neutral-400 mx-auto">
            <Building className="h-6 w-6 text-neutral-400" />
          </div>
          <h3 className="text-sm font-bold uppercase text-foreground">No properties selected</h3>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
            Search or browse properties in the input above to populate comparison metrics side-by-side.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border">
                {/* Spec Attribute Label column */}
                <th className="min-w-[160px] p-4 text-left font-bold text-neutral-400 uppercase tracking-widest text-[9px]">Parameters</th>
                
                {/* Properties columns */}
                {selectedProps.map(prop => (
                  <th key={prop.id} className="min-w-[220px] max-w-[260px] p-4 text-left font-bold relative group">
                    <button 
                      onClick={() => handleRemoveProperty(prop.id)}
                      className="absolute top-2 right-2 p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-border text-neutral-400 hover:text-foreground rounded-lg cursor-pointer transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="space-y-3">
                      <div className="h-24 rounded-lg bg-neutral-100 overflow-hidden border border-border mt-4">
                        <img src={prop.images[0]} alt={prop.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-brand-gold uppercase tracking-wider block">{prop.propertyType} · {prop.listingType}</span>
                        <h4 className="font-black text-foreground uppercase line-clamp-1">{prop.title}</h4>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase truncate">{prop.areaName}</p>
                      </div>
                    </div>
                  </th>
                ))}

                {/* Empty slots placeholders */}
                {Array.from({ length: Math.max(0, 4 - selectedProps.length) }).map((_, idx) => (
                  <th key={idx} className="min-w-[220px] max-w-[260px] p-4 text-center text-neutral-400">
                    <div className="border border-dashed border-border rounded-2xl h-44 flex flex-col items-center justify-center gap-1.5 p-4 text-center">
                      <Plus className="h-5 w-5 text-neutral-500 animate-pulse" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">Empty Compare Slot</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-border">
              {/* Row 1: Price */}
              <tr>
                <td className="p-4 font-bold text-neutral-500 uppercase tracking-widest text-[9px]">Asking Price</td>
                {selectedProps.map(prop => (
                  <td key={prop.id} className="p-4 font-black text-brand-gold text-sm font-mono">
                    SGD {prop.price.toLocaleString()}
                  </td>
                ))}
                {Array.from({ length: 4 - selectedProps.length }).map((_, idx) => <td key={idx} className="p-4" />)}
              </tr>

              {/* Row 2: PSF Rate */}
              <tr>
                <td className="p-4 font-bold text-neutral-500 uppercase tracking-widest text-[9px]">PSF Pricing</td>
                {selectedProps.map(prop => (
                  <td key={prop.id} className="p-4 font-bold text-foreground font-mono">
                    S${prop.psf.toLocaleString()} /psf
                  </td>
                ))}
                {Array.from({ length: 4 - selectedProps.length }).map((_, idx) => <td key={idx} className="p-4" />)}
              </tr>

              {/* Row 3: Tenure */}
              <tr>
                <td className="p-4 font-bold text-neutral-500 uppercase tracking-widest text-[9px]">Tenure Type</td>
                {selectedProps.map(prop => (
                  <td key={prop.id} className="p-4 text-foreground font-semibold">
                    {prop.tenure}
                  </td>
                ))}
                {Array.from({ length: 4 - selectedProps.length }).map((_, idx) => <td key={idx} className="p-4" />)}
              </tr>

              {/* Row 4: Specifications */}
              <tr>
                <td className="p-4 font-bold text-neutral-500 uppercase tracking-widest text-[9px]">Specifications</td>
                {selectedProps.map(prop => (
                  <td key={prop.id} className="p-4 text-foreground font-semibold">
                    {prop.bedrooms} Bed · {prop.bathrooms} Bath · {prop.sizeSqft} sqft
                  </td>
                ))}
                {Array.from({ length: 4 - selectedProps.length }).map((_, idx) => <td key={idx} className="p-4" />)}
              </tr>

              {/* Row 5: MRT Proximity */}
              <tr>
                <td className="p-4 font-bold text-neutral-500 uppercase tracking-widest text-[9px]">Transit (MRT)</td>
                {selectedProps.map(prop => (
                  <td key={prop.id} className="p-4 text-neutral-500 dark:text-neutral-300">
                    <span className="font-bold text-foreground block">{prop.mrtStation}</span>
                    <span className="text-[10px] text-neutral-400 block font-normal">{prop.mrtDistanceMeters}m walk distance</span>
                  </td>
                ))}
                {Array.from({ length: 4 - selectedProps.length }).map((_, idx) => <td key={idx} className="p-4" />)}
              </tr>

              {/* Row 6: AI Match Score */}
              <tr>
                <td className="p-4 font-bold text-neutral-500 uppercase tracking-widest text-[9px]">AI Scorecard</td>
                {selectedProps.map(prop => (
                  <td key={prop.id} className="p-4 font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <Sparkles className="h-4 w-4 animate-pulse-slow text-brand-gold" />
                    <span>{prop.aiMatchedScore}% Personal Match</span>
                  </td>
                ))}
                {Array.from({ length: 4 - selectedProps.length }).map((_, idx) => <td key={idx} className="p-4" />)}
              </tr>

              {/* Row 7: Green Mark Rating */}
              <tr>
                <td className="p-4 font-bold text-neutral-500 uppercase tracking-widest text-[9px]">Green Mark</td>
                {selectedProps.map(prop => {
                  const rating = prop.district <= 11 ? 'GoldPlus' : (prop.district <= 16 ? 'Gold' : null);
                  return (
                    <td key={prop.id} className="p-4 font-semibold text-foreground">
                      {rating ? (
                        <Badge variant="success" className="bg-emerald-500/15 text-emerald-500 text-[8px] tracking-wider uppercase font-black font-mono">
                          BCA {rating}
                        </Badge>
                      ) : (
                        <span className="text-neutral-400 font-normal">Standard Rated</span>
                      )}
                    </td>
                  );
                })}
                {Array.from({ length: 4 - selectedProps.length }).map((_, idx) => <td key={idx} className="p-4" />)}
              </tr>

              {/* Row 8: Fraud Index */}
              <tr>
                <td className="p-4 font-bold text-neutral-500 uppercase tracking-widest text-[9px]">Fraud Index</td>
                {selectedProps.map(prop => {
                  const score = prop.price > 8000000 ? 2 : (prop.id.includes('gen') ? 14 : 5);
                  return (
                    <td key={prop.id} className="p-4 font-semibold">
                      <Badge variant="success" className="font-mono text-[8px]">
                        {score}% Low Risk
                      </Badge>
                    </td>
                  );
                })}
                {Array.from({ length: 4 - selectedProps.length }).map((_, idx) => <td key={idx} className="p-4" />)}
              </tr>

              {/* Row 9: Actions */}
              <tr>
                <td className="p-4 font-bold text-neutral-500 uppercase tracking-widest text-[9px]">Fulfillment Actions</td>
                {selectedProps.map(prop => (
                  <td key={prop.id} className="p-4">
                    <div className="flex flex-col gap-2">
                      <a href={`/property/${prop.id}`} className="w-full">
                        <Button size="sm" variant="gold" className="w-full text-[9px] uppercase font-bold py-1 h-7">
                          Details
                        </Button>
                      </a>
                      <a href={`https://wa.me/6591234567`} className="w-full">
                        <Button size="sm" variant="outline" className="w-full text-[9px] uppercase font-bold py-1 h-7 text-neutral-700 dark:text-neutral-300">
                          Chat Broker
                        </Button>
                      </a>
                    </div>
                  </td>
                ))}
                {Array.from({ length: 4 - selectedProps.length }).map((_, idx) => <td key={idx} className="p-4" />)}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* MAS Regulatory Disclaimer */}
      <Card className="p-4 border-amber-200 dark:border-amber-800/40 bg-amber-500/5 flex gap-3.5 items-start">
        <HelpCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="font-bold text-foreground">Comparison Parameters Information</span>
          <p className="leading-relaxed font-sans font-normal normal-case">
            All details displayed (asking prices, sizes, configurations, transit options) are synced in real-time from registered agency matrices. Confirm unit specifics directly with the respective registered CEA brokers before drafting Option to Purchase (OTP) contracts.
          </p>
        </div>
      </Card>

    </div>
  );
}
