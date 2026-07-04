import { Lead, mockLeads, LeadTimelineEvent } from '../mock-data/leads';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Keep local in-memory active list
let activeLeads = [...mockLeads];

export const getLeads = async (agentId?: string): Promise<Lead[]> => {
  await delay(300);
  if (agentId) {
    return activeLeads.filter(l => l.agentId === agentId);
  }
  return activeLeads;
};

export const getLeadById = async (id: string): Promise<Lead | null> => {
  await delay(150);
  return activeLeads.find(l => l.id === id) || null;
};

export const updateLeadStage = async (id: string, stage: Lead['stage']): Promise<Lead | null> => {
  await delay(200);
  const leadIndex = activeLeads.findIndex(l => l.id === id);
  if (leadIndex === -1) return null;
  
  const lead = activeLeads[leadIndex];
  const oldStage = lead.stage;
  
  if (oldStage === stage) return lead;

  const newEvent: LeadTimelineEvent = {
    id: `evt-sys-${Date.now()}`,
    type: 'system',
    title: `Pipeline Stage Updated`,
    description: `Moved from '${oldStage}' to '${stage}'.`,
    timestamp: new Date().toISOString()
  };

  const updatedLead: Lead = {
    ...lead,
    stage,
    timeline: [newEvent, ...lead.timeline]
  };

  activeLeads[leadIndex] = updatedLead;
  return updatedLead;
};

export const addLeadNote = async (id: string, noteText: string, agentName: string): Promise<Lead | null> => {
  await delay(150);
  const leadIndex = activeLeads.findIndex(l => l.id === id);
  if (leadIndex === -1) return null;

  const lead = activeLeads[leadIndex];
  const newEvent: LeadTimelineEvent = {
    id: `evt-note-${Date.now()}`,
    type: 'call',
    title: `Note added by ${agentName}`,
    description: noteText,
    timestamp: new Date().toISOString()
  };

  const updatedLead: Lead = {
    ...lead,
    notes: `${noteText}\n\n${lead.notes}`,
    timeline: [newEvent, ...lead.timeline]
  };

  activeLeads[leadIndex] = updatedLead;
  return updatedLead;
};
