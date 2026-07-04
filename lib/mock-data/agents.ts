export interface Agent {
  id: string;
  name: string;
  agencyName: string;
  branchName: string;
  ceaNumber: string;
  rating: number;
  reviewsCount: number;
  languages: string[];
  specializations: string[];
  avatar: string;
  phone: string;
  email: string;
  activeListingsCount: number;
  salesVolumeSGD: number;
  experienceYears: number;
  bio: string;
}

export const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Marcus Lim",
    agencyName: "V-RENT Realty Group",
    branchName: "Orchard Prestige Office",
    ceaNumber: "R058921A",
    rating: 4.9,
    reviewsCount: 142,
    languages: ["English", "Mandarin"],
    specializations: ["Luxury Condos", "GCB Enclaves", "Asset Restructuring"],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
    phone: "+65 9123 4567",
    email: "marcus.lim@vrent.com",
    activeListingsCount: 18,
    salesVolumeSGD: 124000000,
    experienceYears: 12,
    bio: "Specializing in District 9 and 10 high-net-worth property acquisition and portfolio asset planning. Ex-private banker."
  },
  {
    id: "agent-2",
    name: "Sherry Tan",
    agencyName: "V-RENT Realty Group",
    branchName: "East Coast & Katong Branch",
    ceaNumber: "R061483D",
    rating: 4.85,
    reviewsCount: 98,
    languages: ["English", "Mandarin", "Hokkien"],
    specializations: ["East Coast Condos", "Sea-View Properties", "HDB Upgraders"],
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80",
    phone: "+65 9234 5678",
    email: "sherry.tan@vrent.com",
    activeListingsCount: 12,
    salesVolumeSGD: 58000000,
    experienceYears: 8,
    bio: "Passionate about helping families find their ideal homes along the East Coast. Professional service with heart."
  },
  {
    id: "agent-3",
    name: "Daniel Teo",
    agencyName: "V-RENT Realty Group",
    branchName: "North-East Hub (Hougang)",
    ceaNumber: "R049281I",
    rating: 4.95,
    reviewsCount: 215,
    languages: ["English", "Mandarin", "Teochew"],
    specializations: ["HDB Resale Expert", "EC Launch Planning", "First-Time Buyers"],
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
    phone: "+65 8123 4567",
    email: "daniel.teo@vrent.com",
    activeListingsCount: 22,
    salesVolumeSGD: 78000000,
    experienceYears: 10,
    bio: "Top HDB Resale broker in Punggol and Sengkang. Expert negotiator helping first-time buyers navigate the complex MAS TDSR constraints."
  },
  {
    id: "agent-4",
    name: "Farhan Syarif",
    agencyName: "V-RENT Alliance",
    branchName: "Jurong & West Region Branch",
    ceaNumber: "R038291F",
    rating: 4.8,
    reviewsCount: 65,
    languages: ["English", "Malay", "Bahasa"],
    specializations: ["Commercial Properties", "Industrial Spaces", "JLD Transformation Zone"],
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&h=150&q=80",
    phone: "+65 8234 5678",
    email: "farhan.s@vrent.com",
    activeListingsCount: 9,
    salesVolumeSGD: 42000000,
    experienceYears: 7,
    bio: "Focused on commercial rentals and corporate office leasing. Deep knowledge of Jurong's industrial growth vectors."
  },
  {
    id: "agent-5",
    name: "Priya Murugan",
    agencyName: "V-RENT Alliance",
    branchName: "Central & Holland District Office",
    ceaNumber: "R029831J",
    rating: 4.78,
    reviewsCount: 88,
    languages: ["English", "Tamil", "Malay"],
    specializations: ["Holland Landed Estates", "Expat Relocation", "Rental Yield Analysis"],
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80",
    phone: "+65 9345 6789",
    email: "priya.m@vrent.com",
    activeListingsCount: 11,
    salesVolumeSGD: 36000000,
    experienceYears: 9,
    bio: "Relocation advisory specialist assisting MNC executives in finding properties around Holland, Tanglin, and Kent Ridge."
  }
];

// Helper to fill agents dynamically up to 15
const firstNames = ["Joshua", "Wei", "Sarah", "Kimberly", "Zack", "Aisha", "Nicholas", "Elaine", "Raj", "Clara"];
const lastNames = ["Ang", "Wong", "Chen", "Goh", "Lee", "Rahman", "Ong", "Chua", "Nair", "Tay"];
const branches = ["Marina Bay HQ", "Tampines Regional Office", "Yishun Hub", "Newton Prestige Office", "Woodlands Branch"];

for (let i = 6; i <= 15; i++) {
  const fName = firstNames[(i - 6) % firstNames.length];
  const lName = lastNames[(i - 6) % lastNames.length];
  const branch = branches[(i - 6) % branches.length];
  const cea = `R0${300000 + i * 2891}X`;
  
  mockAgents.push({
    id: `agent-${i}`,
    name: `${fName} ${lName}`,
    agencyName: i % 2 === 0 ? "V-RENT Realty Group" : "V-RENT Alliance",
    branchName: branch,
    ceaNumber: cea,
    rating: Number((4.5 + (i * 0.04) % 0.5).toFixed(2)),
    reviewsCount: 20 + i * 8,
    languages: ["English", i % 3 === 0 ? "Mandarin" : (i % 3 === 1 ? "Malay" : "Tamil")],
    specializations: [i % 2 === 0 ? "Condo Sales" : "HDB Resale", "Investment Yield Optimizing"],
    avatar: i % 2 === 0 
      ? `https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80`
      : `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80`,
    phone: `+65 ${8000 + i}-${1000 + i * 5}`,
    email: `${fName.toLowerCase()}.${lName.toLowerCase()}@vrent.com`,
    activeListingsCount: 5 + i % 6,
    salesVolumeSGD: 15000000 + i * 2500000,
    experienceYears: 3 + (i % 10),
    bio: `Dedicated Real Estate Advisor with V-RENT. Committed to delivering seamless digital transaction experiences for client success.`
  });
}
export default mockAgents;
