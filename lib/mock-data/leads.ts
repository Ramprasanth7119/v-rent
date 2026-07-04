export interface LeadTimelineEvent {
  id: string;
  type: 'call' | 'email' | 'whatsapp' | 'viewing' | 'offer' | 'system';
  title: string;
  description: string;
  timestamp: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  agentId: string;
  interestPropertyId: string;
  stage: 'New' | 'Contacted' | 'Viewing Scheduled' | 'Offer' | 'Under Contract' | 'Closed/Lost';
  source: 'Listing Portal' | 'AI Recommendation' | 'Referral' | 'Social Campaign';
  aiScore: number; // 0 - 100
  aiSentiment: 'Urgently Looking' | 'Budget Constrained' | 'Investor Interest' | 'Comparing Options';
  notes: string;
  timeline: LeadTimelineEvent[];
}

export const mockLeads: Lead[] = [
  {
    id: "lead-1",
    name: "Alex Tan",
    phone: "+65 9182 7364",
    email: "alex.tan@gmail.com",
    agentId: "agent-1",
    interestPropertyId: "prop-d9-1",
    stage: "New",
    source: "Listing Portal",
    aiScore: 92,
    aiSentiment: "Urgently Looking",
    notes: "Alex is looking to relocate within 2 months. High interest in Ritz-Carlton Residences Cairnhill. Budget fits asking price.",
    timeline: [
      {
        id: "evt-1-1",
        type: "system",
        title: "Lead Created",
        description: "Inquiry received from Ritz-Carlton page.",
        timestamp: "2026-07-01T09:30:00Z"
      },
      {
        id: "evt-1-2",
        type: "whatsapp",
        title: "AI Response Dispatched",
        description: "Sent initial brochures and unit floor plan.",
        timestamp: "2026-07-01T09:32:00Z"
      }
    ]
  },
  {
    id: "lead-2",
    name: "Benjamin Koh",
    phone: "+65 9273 6451",
    email: "ben.koh88@hotmail.com",
    agentId: "agent-1",
    interestPropertyId: "prop-d10-1",
    stage: "Viewing Scheduled",
    source: "Referral",
    aiScore: 95,
    aiSentiment: "Investor Interest",
    notes: "Ultra-high-net-worth investor. Looking at Cluny GCB as a multi-generational estate. Viewing scheduled for this Saturday.",
    timeline: [
      {
        id: "evt-2-1",
        type: "system",
        title: "Lead Created",
        description: "Referred by private bank contact.",
        timestamp: "2026-06-25T14:00:00Z"
      },
      {
        id: "evt-2-2",
        type: "call",
        title: "Marcus Call with Client",
        description: "Discussed buyer status rules and confirmed GCB preview details.",
        timestamp: "2026-06-26T10:15:00Z"
      },
      {
        id: "evt-2-3",
        type: "viewing",
        title: "GCB Site Visit Scheduled",
        description: "Saturday 2 PM at Cluny Hill. Guest list registered with estate security.",
        timestamp: "2026-06-27T16:00:00Z"
      }
    ]
  },
  {
    id: "lead-3",
    name: "Cheryl Lim",
    phone: "+65 9348 2910",
    email: "cheryl.lim.creative@gmail.com",
    agentId: "agent-2",
    interestPropertyId: "prop-d15-1",
    stage: "Contacted",
    source: "AI Recommendation",
    aiScore: 84,
    aiSentiment: "Comparing Options",
    notes: "Young creative director selling an older D15 inter-terrace to upgrade to Meyer Mansion. Needs sales advisory on capital gains.",
    timeline: [
      {
        id: "evt-3-1",
        type: "system",
        title: "AI Match Triggered",
        description: "AI matched portfolio profile with Meyer Mansion listings.",
        timestamp: "2026-06-28T08:00:00Z"
      },
      {
        id: "evt-3-2",
        type: "email",
        title: "Upgradation Booklet Sent",
        description: "Sent upgrading guide & stamp duty calculators.",
        timestamp: "2026-06-29T11:20:00Z"
      }
    ]
  },
  {
    id: "lead-4",
    name: "Desmond Ng",
    phone: "+65 8291 7382",
    email: "desmond.ng@techcorp.com",
    agentId: "agent-3",
    interestPropertyId: "prop-d19-1",
    stage: "Offer",
    source: "Listing Portal",
    aiScore: 91,
    aiSentiment: "Budget Constrained",
    notes: "Offered $750,000 for the Punggol Walk 5-Room HDB. Currently checking HDB loan availability.",
    timeline: [
      {
        id: "evt-4-1",
        type: "system",
        title: "Lead Created",
        description: "Inquiry received on Punggol HDB listing.",
        timestamp: "2026-06-20T10:00:00Z"
      },
      {
        id: "evt-4-2",
        type: "viewing",
        title: "Viewing Conducted",
        description: "Client visited property. Impressed by corner privacy.",
        timestamp: "2026-06-22T19:30:00Z"
      },
      {
        id: "evt-4-3",
        type: "offer",
        title: "Written Offer Received",
        description: "Client submitted offer of $750,000. Seller reviewing.",
        timestamp: "2026-06-23T11:00:00Z"
      }
    ]
  },
  {
    id: "lead-5",
    name: "Evelyn Chew",
    phone: "+65 9012 3456",
    email: "evelyn.chew@lawfirm.sg",
    agentId: "agent-2",
    interestPropertyId: "prop-d15-2",
    stage: "Under Contract",
    source: "Social Campaign",
    aiScore: 98,
    aiSentiment: "Urgently Looking",
    notes: "OTP signed and Option fee paid. Verification of paperwork in progress with document vault team.",
    timeline: [
      {
        id: "evt-5-1",
        type: "system",
        title: "Lead Sourced",
        description: "Facebook real-estate landing page conversion.",
        timestamp: "2026-06-10T12:00:00Z"
      },
      {
        id: "evt-5-2",
        type: "viewing",
        title: "First & Second Viewing",
        description: "Viewed Siglap Walk inter-terrace twice. Confirmed layout fits piano space.",
        timestamp: "2026-06-15T15:00:00Z"
      },
      {
        id: "evt-5-3",
        type: "offer",
        title: "Offer Accepted",
        description: "Offered $5,850,000. Seller signed OTP form.",
        timestamp: "2026-06-18T09:00:00Z"
      },
      {
        id: "evt-5-4",
        type: "system",
        title: "OTP Issued",
        description: "OTP signed by both parties, registered in Document Vault.",
        timestamp: "2026-06-20T10:00:00Z"
      }
    ]
  }
];

// Helper to fill up to 20 leads
const leadNames = [
  "Gabriel Goh", "Hana Rahim", "Ivan Yeo", "Jane Kuan", "Kevin Nair",
  "Lisa Chong", "Michael Lim", "Natalie Ong", "Owen Chew", "Patricia Sim",
  "Quincy Yap", "Rachel Low", "Samuel Teo", "Tariq Aziz", "Valerie Koh"
];
const phoneNumbers = [
  "9876 5432", "8765 4321", "9112 2334", "8223 3445", "9334 4556",
  "8445 5667", "9556 6778", "8667 7889", "9778 8990", "8889 9001",
  "9990 0112", "8112 2335", "9223 3446", "8334 4557", "9445 5668"
];
const sources: ('Listing Portal' | 'AI Recommendation' | 'Referral' | 'Social Campaign')[] = [
  "Listing Portal", "AI Recommendation", "Referral", "Social Campaign"
];
const sentiments: ('Urgently Looking' | 'Budget Constrained' | 'Investor Interest' | 'Comparing Options')[] = [
  "Urgently Looking", "Budget Constrained", "Investor Interest", "Comparing Options"
];
const stages: ('New' | 'Contacted' | 'Viewing Scheduled' | 'Offer' | 'Under Contract' | 'Closed/Lost')[] = [
  "New", "Contacted", "Viewing Scheduled", "Offer", "Under Contract", "Closed/Lost"
];

for (let i = 0; i < leadNames.length; i++) {
  const agentIndex = (i % 15) + 1; // Mapped across 15 agents
  const propIndex = i + 1;
  const stage = stages[i % stages.length];
  const source = sources[i % sources.length];
  const sentiment = sentiments[i % sentiments.length];
  
  mockLeads.push({
    id: `lead-gen-${i + 6}`,
    name: leadNames[i],
    phone: `+65 ${phoneNumbers[i]}`,
    email: `${leadNames[i].toLowerCase().replace(" ", ".")}@yahoo.com`,
    agentId: `agent-${agentIndex}`,
    interestPropertyId: `prop-gen-${propIndex}`,
    stage,
    source,
    aiScore: 60 + (i * 13) % 40,
    aiSentiment: sentiment,
    notes: `Interested in buying/renting ${propIndex}. Reviewing budget bounds. Checked standard stamp duties.`,
    timeline: [
      {
        id: `evt-gen-${i}-1`,
        type: "system",
        title: "Lead Created",
        description: `Enquiry parsed from ${source} for Property ${propIndex}.`,
        timestamp: "2026-06-30T10:00:00Z"
      },
      {
        id: `evt-gen-${i}-2`,
        type: "whatsapp",
        title: "Automated Message Sent",
        description: "Sent greetings and verified location matching.",
        timestamp: "2026-06-30T10:05:00Z"
      }
    ]
  });
}
