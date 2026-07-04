export interface DocumentAuditLog {
  action: string;
  user: string;
  timestamp: string;
}

export interface VaultDocument {
  id: string;
  name: string;
  type: 'Tenancy Agreement' | 'Option to Purchase' | 'HDB Checklist' | 'MAS Pre-Qualification' | 'Buyer Identity' | 'Floor Plan';
  status: 'Draft' | 'Pending Signature' | 'Verified' | 'Expired';
  uploaderName: string;
  uploadDate: string;
  fileSize: string;
  version: string;
  description: string;
  audits: DocumentAuditLog[];
}

export const mockDocuments: VaultDocument[] = [
  {
    id: "doc-1",
    name: "Tenancy_Agreement_Martin_Modern_8M.pdf",
    type: "Tenancy Agreement",
    status: "Verified",
    uploaderName: "Sherry Tan (Agent)",
    uploadDate: "2026-06-25",
    fileSize: "1.8 MB",
    version: "v1.2",
    description: "Standard TA for Martin Modern Unit #18-04, 1-year tenancy at $5,200/m.",
    audits: [
      { action: "Document Uploaded", user: "Sherry Tan (Agent)", timestamp: "2026-06-25 10:14" },
      { action: "e-Signed by Tenant", user: "Alex Tan (Tenant)", timestamp: "2026-06-25 14:22" },
      { action: "PDPA Compliance Checked", user: "Platform Compliance Bot", timestamp: "2026-06-25 14:23" },
      { action: "Counter-signed by Landlord", user: "Lee S. K. (Landlord)", timestamp: "2026-06-26 09:12" },
      { action: "Status marked Verified", user: "Marcus Lim (Approver)", timestamp: "2026-06-26 09:30" }
    ]
  },
  {
    id: "doc-2",
    name: "OTP_Siglap_Walk_42_Signed.pdf",
    type: "Option to Purchase",
    status: "Pending Signature",
    uploaderName: "Marcus Lim (Agent)",
    uploadDate: "2026-06-28",
    fileSize: "2.4 MB",
    version: "v1.0",
    description: "Option to Purchase for Siglap Walk Landed. Option fee of 1% ($58,500) registered.",
    audits: [
      { action: "Document Uploaded", user: "Marcus Lim (Agent)", timestamp: "2026-06-28 16:30" },
      { action: "Signed by Sellers", user: "Soh Keng Seng & Wife (Sellers)", timestamp: "2026-06-29 10:00" },
      { action: "Signature Request Dispatched", user: "Evelyn Chew (Buyer)", timestamp: "2026-06-29 10:05" }
    ]
  },
  {
    id: "doc-3",
    name: "Buyer_NRIC_KYC_Evelyn_Chew.pdf",
    type: "Buyer Identity",
    status: "Verified",
    uploaderName: "Evelyn Chew (Buyer)",
    uploadDate: "2026-06-15",
    fileSize: "950 KB",
    version: "v1.0",
    description: "Verification NRIC front/back for KYC check. Singpass verification logged.",
    audits: [
      { action: "Document Uploaded", user: "Evelyn Chew (Buyer)", timestamp: "2026-06-15 11:20" },
      { action: "Government API Check OK", user: "CEA Registry Gateway", timestamp: "2026-06-15 11:22" },
      { action: "Status marked Verified", user: "Platform Compliance Bot", timestamp: "2026-06-15 11:23" }
    ]
  },
  {
    id: "doc-4",
    name: "UOB_HomeLoan_PreQual_AlexTan.pdf",
    type: "MAS Pre-Qualification",
    status: "Verified",
    uploaderName: "Alex Tan (Buyer)",
    uploadDate: "2026-07-01",
    fileSize: "1.2 MB",
    version: "v1.1",
    description: "Pre-qualification bank offer letter. Max financing loan quantum $2,100,000 at 3.15% fixed.",
    audits: [
      { action: "Document Uploaded", user: "Alex Tan (Buyer)", timestamp: "2026-07-01 08:00" },
      { action: "Stripe OCR Extracted Data", user: "V-RENT OCR Parser", timestamp: "2026-07-01 08:02" },
      { action: "Approved Bank Package Verified", user: "Marcus Lim (Agent)", timestamp: "2026-07-01 11:15" }
    ]
  },
  {
    id: "doc-5",
    name: "Floorplan_Meyer_Mansion_3BR.pdf",
    type: "Floor Plan",
    status: "Verified",
    uploaderName: "Sherry Tan (Agent)",
    uploadDate: "2026-05-10",
    fileSize: "3.2 MB",
    version: "v2.0",
    description: "Official developer blueprint layout for Meyer Mansion Type C1 (3-Bedroom premium).",
    audits: [
      { action: "Document Uploaded", user: "Developer Portal Sync", timestamp: "2026-05-10 14:00" }
    ]
  },
  {
    id: "doc-6",
    name: "Draft_HDB_Resale_Checklist_Sumang.pdf",
    type: "HDB Checklist",
    status: "Draft",
    uploaderName: "Daniel Teo (Agent)",
    uploadDate: "2026-07-02",
    fileSize: "850 KB",
    version: "v0.1",
    description: "HDB resale checklist draft for Piermont Grand EC transaction.",
    audits: [
      { action: "Document Created", user: "Daniel Teo (Agent)", timestamp: "2026-07-02 18:22" }
    ]
  }
];
