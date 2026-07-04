import { VaultDocument, mockDocuments } from '../mock-data/documents';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let activeDocuments = [...mockDocuments];

export const getDocuments = async (): Promise<VaultDocument[]> => {
  await delay(250);
  return activeDocuments;
};

export const uploadDocument = async (
  name: string, 
  type: VaultDocument['type'], 
  uploaderName: string, 
  fileSizeBytes: number
): Promise<VaultDocument> => {
  await delay(400);
  const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(1);
  const newDoc: VaultDocument = {
    id: `doc-${Date.now()}`,
    name,
    type,
    status: 'Draft',
    uploaderName,
    uploadDate: new Date().toISOString().split('T')[0],
    fileSize: `${sizeMb} MB`,
    version: 'v1.0',
    description: `Uploaded document for verification compliance.`,
    audits: [
      {
        action: 'Document Uploaded',
        user: uploaderName,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      }
    ]
  };

  activeDocuments = [newDoc, ...activeDocuments];
  return newDoc;
};

export const signDocument = async (id: string, signerName: string): Promise<VaultDocument | null> => {
  await delay(300);
  const docIndex = activeDocuments.findIndex(d => d.id === id);
  if (docIndex === -1) return null;

  const doc = activeDocuments[docIndex];
  const updatedDoc: VaultDocument = {
    ...doc,
    status: doc.status === 'Pending Signature' ? 'Verified' : doc.status,
    audits: [
      {
        action: 'e-Signed by user',
        user: signerName,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      },
      ...doc.audits
    ]
  };

  activeDocuments[docIndex] = updatedDoc;
  return updatedDoc;
};
