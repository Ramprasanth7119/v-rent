"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Input';
import { 
  getDocuments, uploadDocument, signDocument 
} from '../../lib/services/documents';
import { VaultDocument } from '../../lib/mock-data/documents';
import { FileText, ArrowRight, ShieldCheck, Download, Edit3, Plus, UserCheck } from 'lucide-react';

export default function DocumentVaultPage() {
  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  // Upload States
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<VaultDocument['type']>('Tenancy Agreement');

  const loadDocs = async () => {
    setLoading(true);
    const res = await getDocuments();
    setDocs(res);
    // Auto-select first document
    if (res.length > 0 && !selectedDoc) {
      setSelectedDoc(res[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleSelectRow = (row: VaultDocument) => {
    setSelectedDoc(row);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim()) return;
    
    setUploadModalOpen(false);
    setLoading(true);
    
    // Simulate uploading a file (size 1.2MB = 1258291 bytes)
    await uploadDocument(uploadName, uploadType, 'Client User', 1258291);
    setUploadName('');
    
    // Reload
    const res = await getDocuments();
    setDocs(res);
    setSelectedDoc(res[0]);
    setLoading(false);
  };

  const handleSignConfirm = async () => {
    if (!selectedDoc) return;
    setSignSuccess(true);
    setTimeout(async () => {
      const updated = await signDocument(selectedDoc.id, 'Marcus Lim (Agent Counter-Sign)');
      if (updated) {
        setSelectedDoc(updated);
        loadDocs();
      }
      setSignatureModalOpen(false);
      setSignSuccess(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Secure Document Vault</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Store, audit, and sign real estate contracts securely utilizing Singpass identity checks.
          </p>
        </div>
        <Button size="sm" variant="gold" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setUploadModalOpen(true)}>
          Upload File
        </Button>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Table Panel (~8 cols) */}
        <div className="lg:col-span-8">
          <Table
            columns={[
              { key: 'name', header: 'Document Name', render: (row) => (
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-brand-gold flex-shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-foreground text-xs truncate max-w-[200px] sm:max-w-xs">{row.name}</h4>
                    <p className="text-[9px] text-neutral-400 mt-0.5">{row.type} · {row.fileSize}</p>
                  </div>
                </div>
              )},
              { key: 'uploadDate', header: 'Uploaded', render: (row) => (
                <span className="text-neutral-400 text-xs font-semibold">{row.uploadDate}</span>
              )},
              { key: 'version', header: 'Version', render: (row) => (
                <span className="text-neutral-400 text-xs font-mono">{row.version}</span>
              )},
              { key: 'status', header: 'Status Status', render: (row) => {
                const colors = {
                  Draft: 'secondary' as const,
                  'Pending Signature': 'warning' as const,
                  Verified: 'success' as const,
                  Expired: 'danger' as const
                };
                return <Badge variant={colors[row.status]}>{row.status}</Badge>;
              }}
            ]}
            data={docs}
            isLoading={loading}
            onRowClick={handleSelectRow}
          />
        </div>

        {/* Right Details Panel (~4 cols) */}
        <div className="lg:col-span-4 sticky top-20">
          {selectedDoc ? (
            <Card className="space-y-6">
              
              {/* Header Title */}
              <div className="space-y-2 pb-4 border-b border-border">
                <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest leading-none">
                  Document Identity Profile
                </span>
                <h3 className="text-sm font-bold text-foreground truncate">{selectedDoc.name}</h3>
                <p className="text-xs text-neutral-400">{selectedDoc.description}</p>
              </div>

              {/* Status & Action */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-neutral-400">
                  <span>Signatures Required:</span>
                  <Badge variant={selectedDoc.status === 'Verified' ? 'success' : 'warning'}>
                    {selectedDoc.status === 'Verified' ? 'Fully Signed' : 'Signatures Pending'}
                  </Badge>
                </div>

                {selectedDoc.status === 'Pending Signature' && (
                  <Button variant="gold" className="w-full font-bold uppercase tracking-wider" onClick={() => setSignatureModalOpen(true)}>
                    e-Sign Document via Singpass
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 font-bold" onClick={() => alert("Downloading encrypted file...")}>
                    <Download className="h-4 w-4 mr-1.5" /> Download
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1 font-bold" onClick={() => alert("Launching document revision workflow.")}>
                    <Edit3 className="h-4 w-4 mr-1.5" /> Revisions
                  </Button>
                </div>
              </div>

              {/* Audit history list */}
              <div className="space-y-3 pt-4 border-t border-border text-xs">
                <span className="font-bold text-neutral-400 uppercase tracking-widest text-[9px] block">
                  Document Audit Registers
                </span>
                
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  {selectedDoc.audits.map((a, index) => (
                    <div key={index} className="flex justify-between items-start gap-4 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground block">{a.action}</span>
                        <span className="text-[10px] text-neutral-400 block">By: {a.user}</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 font-bold whitespace-nowrap">{a.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>

            </Card>
          ) : (
            <Card className="p-8 text-center text-xs text-neutral-400 border-dashed">
              Select a document to inspect details.
            </Card>
          )}
        </div>

      </div>

      {/* MODAL 1: UPLOAD DOCUMENT */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Compliance Document"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          <div className="space-y-2">
            <label className="text-[10px] block">Document Filename</label>
            <input
              type="text"
              required
              placeholder="e.g. Option_To_Purchase_Cairnhill.pdf"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] block">Document Category</label>
            <Select
              options={[
                { value: 'Tenancy Agreement', label: 'Tenancy Agreement Form' },
                { value: 'Option to Purchase', label: 'Option to Purchase (OTP)' },
                { value: 'Buyer Identity', label: 'NRIC Identity Verification' },
                { value: 'Floor Plan', label: 'Title Deed Floorplan Layout' }
              ]}
              value={uploadType}
              onChange={(e: any) => setUploadType(e.target.value)}
            />
          </div>

          <Button type="submit" variant="gold" className="w-full font-bold uppercase tracking-wider pt-3 pb-3">
            Add to Vault
          </Button>
        </form>
      </Modal>

      {/* MODAL 2: E-SIGNATURE SIMULATOR */}
      <Modal
        isOpen={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        title="Singpass e-Signature Verification Gate"
      >
        {signSuccess ? (
          <div className="text-center p-8 space-y-4">
            <div className="h-10 w-10 bg-emerald-500/15 border border-emerald-400 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
              <UserCheck className="h-5 w-5 animate-bounce" />
            </div>
            <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase">Signature Authenticated</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Identity verified against Government Singpass database registries. Registering audit logs...
            </p>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              You are signing <span className="font-bold text-foreground">"{selectedDoc?.name}"</span>. 
              This will lock the current file version and dispatch notifications to counter-signing verified brokers.
            </p>

            <Card className="p-4 border-emerald-500/10 bg-emerald-500/5 text-xs text-left text-neutral-500 dark:text-neutral-400">
              <span className="font-bold text-foreground block mb-1">Singpass Security check</span>
              Singpass verification ensures PDPA data compliance and legally binding CEA contract validation.
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-grow font-bold" onClick={() => setSignatureModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="gold" className="flex-grow font-bold uppercase tracking-wider" onClick={handleSignConfirm}>
                Authenticate & e-Sign
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
