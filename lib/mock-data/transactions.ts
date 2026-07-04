export interface Transaction {
  id: string;
  propertyId?: string;
  projectName: string;
  district: number;
  price: number;
  psf: number;
  sizeSqft: number;
  floor: 'Low' | 'Mid' | 'High';
  date: string; // YYYY-MM
  buyerType: 'Citizen' | 'PR' | 'Foreigner';
}

export const mockTransactions: Transaction[] = [];

const projects = [
  { name: "The Ritz-Carlton Residences", district: 9, basePrice: 9000000, basePsf: 3200, size: 2800 },
  { name: "Martin Modern", district: 9, basePrice: 3200000, basePsf: 2500, size: 1280 },
  { name: "OUE Twin Peaks", district: 9, basePrice: 2200000, basePsf: 2400, size: 900 },
  { name: "Cluny Hill Bungalow", district: 10, basePrice: 42000000, basePsf: 2800, size: 15000 },
  { name: "Leedon Green", district: 10, basePrice: 1800000, basePsf: 2200, size: 810 },
  { name: "Meyer Mansion", district: 15, basePrice: 3500000, basePsf: 2350, size: 1490 },
  { name: "Siglap Terrace", district: 15, basePrice: 5000000, basePsf: 1560, size: 3200 },
  { name: "Punggol Resale HDB", district: 19, basePrice: 700000, basePsf: 580, size: 1200 },
  { name: "The Florence Residences", district: 19, basePrice: 1200000, basePsf: 1760, size: 680 },
  { name: "Lake Grande", district: 22, basePrice: 1600000, basePsf: 1650, size: 970 },
  { name: "Jem Retail Office", district: 22, basePrice: 16000000, basePsf: 6400, size: 2500 },
  { name: "Marina Bay Suites", district: 1, basePrice: 10000000, basePsf: 3700, size: 2700 },
  { name: "SkyTerrace @ Dawson", district: 3, basePrice: 1200000, basePsf: 960, size: 1250 }
];

const buyerTypes: ('Citizen' | 'PR' | 'Foreigner')[] = ['Citizen', 'Citizen', 'PR', 'Foreigner'];
const floors: ('Low' | 'Mid' | 'High')[] = ['Low', 'Mid', 'High'];

// Let's generate 10 transaction records for each project over the past 2 years (2024 to 2026)
let txCount = 1;
for (const p of projects) {
  for (let year = 2024; year <= 2026; year++) {
    const maxMonth = year === 2026 ? 6 : 12; // 2026 goes up to June
    const months = year === 2026 ? [2, 4, 5] : [3, 7, 10]; // select representative months
    
    for (const m of months) {
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      const date = `${year}-${monthStr}`;
      
      // Let's model a 4-8% price growth over 2 years
      const growthFactor = 1 + ((year - 2024) * 12 + m) * 0.0035; 
      
      const psf = Math.round(p.basePsf * growthFactor * (0.95 + Math.random() * 0.1));
      const price = psf * p.size;
      const floor = floors[txCount % 3];
      const buyerType = buyerTypes[txCount % 4];

      mockTransactions.push({
        id: `tx-${txCount++}`,
        projectName: p.name,
        district: p.district,
        price,
        psf,
        sizeSqft: p.size,
        floor,
        date,
        buyerType
      });
    }
  }
}

// Ensure the dataset is ordered by date descending
mockTransactions.sort((a, b) => b.date.localeCompare(a.date));
export default mockTransactions;
