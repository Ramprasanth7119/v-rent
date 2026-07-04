"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Property } from '../../lib/mock-data/properties';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Heart, Compass, Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  layout?: 'grid' | 'list' | 'preview';
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  layout = 'grid',
}) => {
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatPrice = (p: number) => {
    if (p >= 1000000) return `$${(p / 1000000).toFixed(2)}M`;
    return `$${p.toLocaleString()}`;
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const toggleShortlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShortlisted(!isShortlisted);
  };

  if (layout === 'preview') {
    return (
      <Link href={`/property/${property.id}`}>
        <Card className="p-3 w-72 flex gap-3 cursor-pointer hover:shadow-md transition-shadow">
          <div className="h-20 w-24 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 relative">
            <img 
              src={property.images[0]} 
              alt={property.title} 
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
            <div>
              <h4 className="text-xs font-bold text-foreground truncate leading-snug">{property.title}</h4>
              <p className="text-[10px] text-neutral-400 truncate mt-0.5">{property.address}</p>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs font-extrabold text-brand-navy dark:text-brand-gold">
                {formatPrice(property.price)}
                {property.listingType === 'Rent' && <span className="text-[9px] font-normal text-neutral-400">/m</span>}
              </span>
              <span className="text-[9px] text-neutral-400 font-bold">{property.sizeSqft} sqft</span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  if (layout === 'list') {
    return (
      <Link href={`/property/${property.id}`}>
        <Card hoverEffect className="p-4 flex flex-col sm:flex-row gap-5 cursor-pointer w-full">
          {/* Image carousel container */}
          <div className="w-full sm:w-60 h-44 rounded-xl overflow-hidden bg-neutral-100 relative flex-shrink-0 group">
            <img 
              src={property.images[currentImageIndex]} 
              alt={property.title} 
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gallery controls */}
            {property.images.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            
            {/* Top badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
              {property.verified && <Badge variant="success">Verified</Badge>}
              {property.featured && <Badge variant="gold">Featured</Badge>}
            </div>
            
            {/* Shortlist */}
            <button 
              onClick={toggleShortlist}
              className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white transition-all cursor-pointer"
            >
              <Heart className={`h-4 w-4 transition-transform active:scale-125 ${isShortlisted ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-between py-1">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-foreground leading-tight hover:text-brand-gold transition-colors">
                    {property.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">{property.address}</p>
                </div>
                {/* AI Matching Score */}
                <Badge variant="ai" className="flex-shrink-0">
                  {property.aiMatchedScore}% AI Match
                </Badge>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                {property.description}
              </p>

              {/* Attributes */}
              <div className="flex flex-wrap gap-4 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                {property.bedrooms > 0 && <span>{property.bedrooms} Beds</span>}
                {property.bathrooms > 0 && <span>{property.bathrooms} Baths</span>}
                <span>{property.sizeSqft} sqft</span>
                <span className="text-neutral-400">|</span>
                <span>{property.tenure}</span>
                <span className="text-neutral-400">|</span>
                <span>Built {property.buildYear}</span>
              </div>
            </div>

            {/* Price Footer */}
            <div className="flex items-end justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-brand-navy dark:text-brand-gold">
                  {formatPrice(property.price)}
                  {property.listingType === 'Rent' && <span className="text-xs font-normal text-neutral-400">/m</span>}
                </span>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  S${property.psf} psf
                </span>
              </div>
              <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-neutral-400" />
                {property.mrtStation} ({property.mrtDistanceMeters}m)
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Grid layout (Default)
  return (
    <Link href={`/property/${property.id}`}>
      <Card hoverEffect className="p-0 overflow-hidden flex flex-col h-full cursor-pointer group">
        {/* Card Image */}
        <div className="relative h-48 w-full bg-neutral-100 overflow-hidden">
          <img 
            src={property.images[currentImageIndex]} 
            alt={property.title} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Gallery controls */}
          {property.images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Top badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            {property.verified && <Badge variant="success">Verified</Badge>}
            {property.featured && <Badge variant="gold">Featured</Badge>}
          </div>

          {/* Shortlist */}
          <button 
            onClick={toggleShortlist}
            className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white transition-all cursor-pointer"
          >
            <Heart className={`h-4 w-4 transition-transform active:scale-125 ${isShortlisted ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>

          {/* AI Match overlays */}
          <div className="absolute bottom-2.5 left-2.5">
            <Badge variant="ai">
              {property.aiMatchedScore}% AI Match
            </Badge>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">
              {property.areaName} · District {property.district}
            </span>
            <h3 className="text-sm font-bold text-foreground truncate group-hover:text-brand-gold transition-colors">
              {property.title}
            </h3>
            <p className="text-[11px] text-neutral-400 truncate">{property.address}</p>

            {/* Features Row */}
            <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium pt-1">
              {property.bedrooms > 0 && <span>{property.bedrooms} Beds</span>}
              {property.bathrooms > 0 && <span>{property.bathrooms} Baths</span>}
              <span>{property.sizeSqft} sqft</span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="border-t border-border mt-3 pt-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-black text-brand-navy dark:text-brand-gold leading-none">
                {formatPrice(property.price)}
                {property.listingType === 'Rent' && <span className="text-[10px] font-normal text-neutral-400">/m</span>}
              </span>
              <span className="text-[9px] text-neutral-400 mt-1">S${property.psf} psf</span>
            </div>
            <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider text-right">
              {property.mrtStation}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};
export default PropertyCard;
