"use client";

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sparkles, Eye, Image as ImageIcon, Download, RefreshCw, Layers } from 'lucide-react';

interface StagingStyle {
  id: string;
  name: string;
  image: string;
  description: string;
}

const stagingStyles: StagingStyle[] = [
  {
    id: 'empty',
    name: 'Empty Room (Original)',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&h=450&q=80',
    description: 'The original un-furnished room photo.'
  },
  {
    id: 'modern',
    name: 'Modern Chic',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&h=450&q=80',
    description: 'Clean lines, warm neutral tones, and sleek metallic accents.'
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian / Nordic',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&h=450&q=80',
    description: 'Minimalist functional design with light woods and soft textures.'
  },
  {
    id: 'industrial',
    name: 'Industrial Loft',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&h=450&q=80',
    description: 'Exposed bricks, dark metals, leather furniture, and raw wood.'
  },
  {
    id: 'classic',
    name: 'Royal Classic',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&h=450&q=80',
    description: 'Elegant custom moldings, deep velvet textures, and gold fixtures.'
  }
];

export default function VirtualStaging() {
  const [activeStyle, setActiveStyle] = useState<StagingStyle>(stagingStyles[1]); // Default to Modern
  const [loading, setLoading] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState('modern');

  const handleStyleChange = (style: StagingStyle) => {
    if (style.id === selectedStyleId) return;
    setLoading(true);
    setSelectedStyleId(style.id);
    setTimeout(() => {
      setActiveStyle(style);
      setLoading(false);
    }, 1200); // Realistic AI generation delay!
  };

  return (
    <Card className="overflow-hidden border-brand-gold/15 bg-neutral-900 text-white">
      {/* Header */}
      <div className="p-5 border-b border-neutral-800 flex justify-between items-center flex-wrap gap-4 bg-neutral-950/40">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-brand-gold/10 border border-brand-gold/30 rounded-lg flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-brand-gold" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">AI Virtual Staging Studio</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">Digitally furnish this property using advanced Generative AI staging models.</p>
          </div>
        </div>
        <Badge variant="ai" className="text-[9px] font-black uppercase py-1 px-2.5">AI Engine Active</Badge>
      </div>

      {/* Main Studio Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Staging Canvas (8 cols) */}
        <div className="lg:col-span-8 p-4 bg-neutral-950 flex flex-col justify-center relative min-h-[300px] lg:min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 bg-neutral-950/80 z-10 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 text-brand-gold animate-spin" />
              <p className="text-xs font-bold text-brand-gold uppercase tracking-widest animate-pulse">Rendering Staging Model...</p>
              <p className="text-[9px] text-neutral-500 uppercase">Adding furniture overlays & lighting adjustments</p>
            </div>
          ) : null}

          {/* Staged Canvas Preview */}
          <div className="rounded-xl overflow-hidden relative shadow-inner aspect-[16/9]">
            <img 
              src={activeStyle.image} 
              alt={activeStyle.name} 
              className="h-full w-full object-cover transition-all duration-700" 
            />
            {/* Corner Status Badge */}
            <span className="absolute bottom-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-brand-gold flex items-center gap-1.5 border border-neutral-800">
              <Eye className="h-3 w-3" /> {activeStyle.name}
            </span>
          </div>

          {/* Staging Actions Bar */}
          <div className="flex justify-between items-center mt-3 text-xs">
            <span className="text-neutral-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-brand-gold" /> Multi-Layer AI output
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="text-[10px] uppercase font-bold border-neutral-800 hover:border-neutral-700 text-white"
                onClick={() => handleStyleChange(stagingStyles[0])}
              >
                <ImageIcon className="h-3 w-3 mr-1" /> Original Empty Room
              </Button>
              <Button 
                size="sm" 
                variant="gold" 
                className="text-[10px] uppercase font-bold text-brand-navy"
                onClick={() => alert("Staged photo downloaded to your device.")}
              >
                <Download className="h-3 w-3 mr-1" /> Download Image
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Staging Style Selector (4 cols) */}
        <div className="lg:col-span-4 p-5 bg-neutral-900 border-l border-neutral-800 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Select Interior Style</h4>
            
            {/* Style list */}
            <div className="space-y-2.5">
              {stagingStyles.slice(1).map((style) => {
                const isSelected = selectedStyleId === style.id;
                return (
                  <div
                    key={style.id}
                    onClick={() => handleStyleChange(style)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected 
                        ? 'border-brand-gold bg-brand-navy-light/20 shadow' 
                        : 'border-neutral-800 hover:bg-neutral-800/40 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{style.name}</span>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-brand-gold animate-pulse"></span>}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">{style.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-800 text-[10px] text-neutral-500 leading-relaxed text-left">
            Staging results are generated in real-time by V-RENT Interior AI. Users can toggle styles freely. All furnishings shown are illustrative placement simulations.
          </div>
        </div>
      </div>
    </Card>
  );
}
