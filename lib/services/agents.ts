import { Agent, mockAgents } from '../mock-data/agents';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getAgents = async (filters?: { query?: string; specialization?: string; language?: string }): Promise<Agent[]> => {
  await delay(300);
  let agents = [...mockAgents];

  if (!filters) return agents;

  if (filters.query) {
    const q = filters.query.toLowerCase();
    agents = agents.filter(a => 
      a.name.toLowerCase().includes(q) ||
      a.agencyName.toLowerCase().includes(q) ||
      a.ceaNumber.toLowerCase().includes(q)
    );
  }

  if (filters.specialization) {
    agents = agents.filter(a => a.specializations.includes(filters.specialization!));
  }

  if (filters.language) {
    agents = agents.filter(a => a.languages.includes(filters.language!));
  }

  return agents;
};

export const getAgentById = async (id: string): Promise<Agent | null> => {
  await delay(150);
  return mockAgents.find(a => a.id === id) || null;
};
