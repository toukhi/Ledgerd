import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { WalletGuard } from '@/components/WalletGuard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CertificateCategory, CertificateMeta } from '@/types/certificate';
import { issueMockCertificate } from '@/lib/mockChain';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { ArrowLeft, Send, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isAddress } from 'viem';

const categories: CertificateCategory[] = ['Internship', 'Hackathon', 'Course', 'Volunteering', 'Other'];

export default function IssueCertificate() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const addCertificate = useAppStore((state) => state.addCertificate);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    recipient: '',
    title: '',
    description: '',
    issuerName: '',
    category: '' as CertificateCategory,
    skills: '',
    evidenceUrls: '',
    usefulLinks: [''],
    startDate: '',
    endDate: '',
    imageUrl: '',
    attachments: [] as { name: string; type?: string; size: number }[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [mappingLoadingIds, setMappingLoadingIds] = useState<string[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState<{ value: CertificateCategory; confidence: number; source?: any } | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipient || !isAddress(formData.recipient)) {
      newErrors.recipient = 'Valid recipient address required';
    }

    if (formData.title.length < 3 || formData.title.length > 80) {
      newErrors.title = 'Title must be 3-80 characters';
    }

    if (formData.description.length < 20 || formData.description.length > 1000) {
      newErrors.description = 'Description must be 20-1000 characters';
    }

    if (!formData.issuerName) {
      newErrors.issuerName = 'Issuer name is required';
    }

    if (formData.evidenceUrls) {
      const urls = formData.evidenceUrls.split(',').map(u => u.trim());
      const invalidUrls = urls.filter(url => url && !url.startsWith('https://'));
      if (invalidUrls.length > 0) {
        newErrors.evidenceUrls = 'Evidence URLs must be valid https:// URLs';
      }
    }

    // validate usefulLinks array (optional)
    if (formData.usefulLinks && Array.isArray(formData.usefulLinks)) {
      const invalid = (formData.usefulLinks as string[]).filter(l => l && !l.startsWith('https://'));
      if (invalid.length > 0) {
        newErrors.usefulLinks = 'Useful links must be valid https:// URLs';
      }
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !address) return;

    setIsSubmitting(true);

    try {
      const meta: CertificateMeta = {
        title: formData.title,
        description: formData.description,
        issuerName: formData.issuerName,
        category: formData.category || undefined,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        evidenceUrls: formData.evidenceUrls ? formData.evidenceUrls.split(',').map(u => u.trim()).filter(Boolean) : undefined,
        usefulLinks: formData.usefulLinks ? (Array.isArray(formData.usefulLinks) ? formData.usefulLinks.map(u => u.trim()).filter(Boolean) : undefined) : undefined,
        attachments: formData.attachments && formData.attachments.length > 0 ? formData.attachments : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        image: formData.imageUrl || undefined,
      };

      const newCert = issueMockCertificate({
        issuer: address,
        recipient: formData.recipient as `0x${string}`,
        status: 'PENDING',
        tokenURI: 'ipfs://TODO',
        meta,
      });

      addCertificate(newCert);
      
      toast.success('Certificate issued successfully!', {
        description: 'Recipient will be notified to accept or decline.',
      });

      navigate('/');
    } catch (error) {
      toast.error('Failed to issue certificate');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // clear suggested category if user changes category manually
    if (field === 'category') setSuggestedCategory(null);
  };

  const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:4000';

  const addMappingLoading = (id: string) => setMappingLoadingIds(prev => Array.from(new Set([...prev, id])));
  const removeMappingLoading = (id: string) => setMappingLoadingIds(prev => prev.filter(x => x !== id));

  // Map simple extraction result to form fields (heuristic)
  const mapExtractionToForm = (result: any) => {
    try {
      const plain: string = result.plainText || '';
      const text = String(plain).replace(/\f/g, '\n');
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const mapped: Partial<typeof formData> = {};

      // Title: first reasonably short non-empty line
      if (!formData.title) {
        const candidate = lines.find(l => l.length >= 5 && l.length <= 120);
        if (candidate) mapped.title = candidate;
      }

      // Issuer: look for 'Issued by' or 'Issuer' or second line
      if (!formData.issuerName) {
        const issuerLine = lines.find(l => /issued by|issuer[:\-]/i.test(l)) || lines[1] || null;
        if (issuerLine) mapped.issuerName = issuerLine.replace(/^(issued by[:\-]?)/i, '').trim();
      }

      // Links: find https:// occurrences
      if ((!formData.usefulLinks || (Array.isArray(formData.usefulLinks) && (formData.usefulLinks as string[]).every(v => !v))) ) {
        const urls = Array.from(new Set((plain.match(/https?:\/\/[^\s)]+/g) || [])));
        if (urls.length > 0) mapped.usefulLinks = urls;
      }

      // Dates: look for ISO or common date formats
      if (!formData.startDate || !formData.endDate) {
        const dateRegexes = [ /\d{4}-\d{2}-\d{2}/g, /\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4}/g, /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/gi ];
        const found: string[] = [];
        for (const r of dateRegexes) {
          const m = plain.match(r);
          if (m) found.push(...m);
        }
        if (found.length === 1) {
          mapped.startDate = found[0];
        } else if (found.length >= 2) {
          mapped.startDate = found[0];
          mapped.endDate = found[1];
        }
      }

      // Description: take some lines after the title as description candidate
      if (!formData.description) {
        if (lines.length > 2) {
          const desc = lines.slice(2, 7).join(' ');
          if (desc.length > 30) mapped.description = desc;
        }
      }

      return mapped;
    } catch (e) {
      console.warn('mapping error', e);
      return {};
    }
  };

  const uploadAndExtract = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const uploader = address || 'anonymous';
      fd.append('uploader', uploader);

      const res = await fetch(`${BACKEND}/api/upload`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('upload failed');
      const data = await res.json();
      const uploaded = data.files || [];

      // update attachments metadata with upload ids and apply mapping returned in response (if present)
      const metas = uploaded.map((u: any, i: number) => ({ name: u.originalName || files[i].name, type: files[i].type, size: files[i].size, uploadId: u.id }));
      // append only new attachments (dedupe by uploadId or name-size)
      setFormData(prev => {
        const existing = Array.isArray(prev.attachments) ? prev.attachments : [];
        const keys = new Set(existing.map(a => (a as any).uploadId || `${(a as any).name}-${(a as any).size}`));
        const toAdd = metas.filter(m => {
          const k = m.uploadId || `${m.name}-${m.size}`;
          return !keys.has(k);
        });
        return { ...prev, attachments: [...existing, ...toAdd] };
      });

      const isPresent = (val: any) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'string') return val.trim().length > 0;
        if (Array.isArray(val)) return val.some(v => typeof v === 'string' ? v.trim().length > 0 : !!v);
        return true;
      };

      for (const f of uploaded) {
        try {
          // If server returned mapping in upload response, use it to prefill fields
          const mapping = f.mapping || (f.result && f.result.mapping) || null;
          const extraction = f.extraction || (f.result && f.result.result) || null;
          // debug log mapping for dev
          if (mapping) console.debug('[upload] mapping for', f.originalName || f.filename || f.id, mapping);
          if (mapping) {
            // mapping fields: title, issuer, usefulLinks, startDate, endDate, description, recipient, recipientAddress, skills
            const mappedFields: Partial<typeof formData> = {};
            if (mapping.title && mapping.title.value) mappedFields.title = mapping.title.value;
            if (mapping.issuer && mapping.issuer.value) mappedFields.issuerName = mapping.issuer.value;
            if (mapping.usefulLinks && Array.isArray(mapping.usefulLinks.value)) mappedFields.usefulLinks = mapping.usefulLinks.value;
            // Dates: accept startDate/endDate or issuedDate
            const formatToInputDate = (v: string | undefined | null) => {
              if (!v) return undefined;
              // try native parse first
              const parsed = Date.parse(String(v));
              if (!isNaN(parsed)) {
                const d = new Date(parsed);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
              }
              // fallback: match DD.MM.YYYY or DD/MM/YYYY or D-M-YYYY
              const m = String(v).match(/(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})/);
              if (m) {
                let day = m[1];
                let month = m[2];
                let year = m[3];
                if (year.length === 2) {
                  year = Number(year) > 50 ? `19${year}` : `20${year}`;
                }
                // assume DD/MM/YYYY
                const yyyy = year;
                const mm = String(Number(month)).padStart(2, '0');
                const dd = String(Number(day)).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
              }
              return undefined;
            };

            if (mapping.startDate && mapping.startDate.value) mappedFields.startDate = formatToInputDate(mapping.startDate.value) || mapping.startDate.value;
            if (mapping.endDate && mapping.endDate.value) mappedFields.endDate = formatToInputDate(mapping.endDate.value) || mapping.endDate.value;
            if (!mappedFields.startDate && mapping.issuedDate && mapping.issuedDate.value) mappedFields.startDate = formatToInputDate(mapping.issuedDate.value) || mapping.issuedDate.value;

            if (mapping.description && mapping.description.value) mappedFields.description = mapping.description.value;
            if (mapping.skills && Array.isArray(mapping.skills.value)) mappedFields.skills = (mapping.skills.value as string[]).join(', ');
            // recipient: accept explicit recipientAddress or look for recipient (but only use if looks like an ETH address)
            const ethMatch = (s?: string) => !!(s && /^0x[a-fA-F0-9]{40}$/.test(s.trim()));
            if (mapping.recipientAddress && mapping.recipientAddress.value && ethMatch(mapping.recipientAddress.value)) mappedFields.recipient = mapping.recipientAddress.value;
            else if (mapping.recipient && mapping.recipient.value && ethMatch(mapping.recipient.value)) mappedFields.recipient = mapping.recipient.value;

            // Merge mapped fields into form, but don't overwrite existing non-empty user input
            setFormData(prev => {
              const next = { ...prev } as any;
              Object.entries(mappedFields).forEach(([k, v]) => {
                if (!isPresent((prev as any)[k])) next[k] = v;
              });
              return next;
            });
            toast.success('Prefilled fields from attachment', { description: `File: ${f.originalName}` });
          } else if (extraction) {
            const mapped = mapExtractionToForm(extraction);
            setFormData(prev => {
              const next = { ...prev } as any;
              Object.entries(mapped).forEach(([k, v]) => {
                if (!isPresent((prev as any)[k])) next[k] = v;
              });
              return next;
            });
            toast.success('Prefilled fields from attachment', { description: `File: ${f.originalName}` });
          }
        } catch (err) {
          console.error('apply mapping error', err);
        }
      }
    } catch (err) {
      console.error('uploadAndExtract error', err);
      toast.error('Failed to upload and extract files');
    } finally {
      setIsProcessingFiles(false);
    }
  };

  // apply mapping object into form fields (merge-only)
  const applyMappingObject = (mapping: any, originalName?: string) => {
    const isPresent = (val: any) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'string') return val.trim().length > 0;
      if (Array.isArray(val)) return val.some(v => typeof v === 'string' ? v.trim().length > 0 : !!v);
      return true;
    };

    const formatToInputDate = (v: string | undefined | null) => {
      if (!v) return undefined;
      const parsed = Date.parse(String(v));
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      const m = String(v).match(/(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})/);
      if (m) {
        let day = m[1];
        let month = m[2];
        let year = m[3];
        if (year.length === 2) {
          year = Number(year) > 50 ? `19${year}` : `20${year}`;
        }
        const yyyy = year;
        const mm = String(Number(month)).padStart(2, '0');
        const dd = String(Number(day)).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return undefined;
    };

    const mappedFields: Partial<typeof formData> = {};
    if (mapping.title && mapping.title.value) mappedFields.title = mapping.title.value;
    if (mapping.issuer && mapping.issuer.value) mappedFields.issuerName = mapping.issuer.value;
    if (mapping.usefulLinks && Array.isArray(mapping.usefulLinks.value)) mappedFields.usefulLinks = mapping.usefulLinks.value;
    if (mapping.startDate && mapping.startDate.value) mappedFields.startDate = formatToInputDate(mapping.startDate.value) || mapping.startDate.value;
    if (mapping.endDate && mapping.endDate.value) mappedFields.endDate = formatToInputDate(mapping.endDate.value) || mapping.endDate.value;
    if (!mappedFields.startDate && mapping.issuedDate && mapping.issuedDate.value) mappedFields.startDate = formatToInputDate(mapping.issuedDate.value) || mapping.issuedDate.value;
    if (mapping.description && mapping.description.value) mappedFields.description = mapping.description.value;
    if (mapping.skills && Array.isArray(mapping.skills.value)) mappedFields.skills = (mapping.skills.value as string[]).join(', ');
    const ethMatch = (s?: string) => !!(s && /^0x[a-fA-F0-9]{40}$/.test(s.trim()));
    if (mapping.recipientAddress && mapping.recipientAddress.value && ethMatch(mapping.recipientAddress.value)) mappedFields.recipient = mapping.recipientAddress.value;
    else if (mapping.recipient && mapping.recipient.value && ethMatch(mapping.recipient.value)) mappedFields.recipient = mapping.recipient.value;

    // Category: if mapping suggests a category, auto-apply when confidence >= 0.6
    if (mapping.category && mapping.category.value) {
      try {
        const catVal = mapping.category.value as CertificateCategory;
        const conf = Number(mapping.category.confidence) || 0;
        if (!isPresent(formData.category) && conf >= 0.6 && categories.includes(catVal)) {
          (mappedFields as any).category = catVal;
          setSuggestedCategory(null);
        } else if (categories.includes(catVal)) {
          setSuggestedCategory({ value: catVal, confidence: conf, source: mapping.category.sources && mapping.category.sources[0] });
        }
      } catch (e) {
        // ignore
      }
    }

    setFormData(prev => {
      const next = { ...prev } as any;
      Object.entries(mappedFields).forEach(([k, v]) => {
        if (!isPresent((prev as any)[k])) next[k] = v;
      });
      return next;
    });
    // if mapping included category suggestion, set suggestedCategory state
    if (mapping.category && mapping.category.value) {
      const catVal = mapping.category.value as CertificateCategory;
      const conf = Number(mapping.category.confidence) || 0;
      if (conf >= 0.6 && categories.includes(catVal) && !formData.category) {
        setFormData(prev => ({ ...prev, category: catVal }));
        setSuggestedCategory(null);
      } else if (categories.includes(catVal)) {
        setSuggestedCategory({ value: catVal, confidence: conf, source: mapping.category.sources && mapping.category.sources[0] });
      }
    }

    toast.success('Prefilled fields from attachment', { description: `File: ${originalName || 'attachment'}` });
  };

  // Trigger fetching mapping for a particular upload id and apply it
  const handleFillFromAttachment = async (uploadId?: string, originalName?: string) => {
    if (!uploadId) {
      toast.error('No upload id available for this attachment');
      return;
    }
    addMappingLoading(uploadId);
    try {
      // Try GET /api/mapping/:id first
      let mapping = null;
      const tryGet = async () => {
        const mappingRes = await fetch(`${BACKEND}/api/mapping/${uploadId}`);
        if (mappingRes.status === 200) {
          const j = await mappingRes.json();
          return j.mapping || null;
        }
        if (mappingRes.status === 202) return { status: 202 };
        if (mappingRes.status === 404) return null;
        if (mappingRes.status === 500) {
          const j = await mappingRes.json().catch(() => ({}));
          throw new Error(j.error || 'server_error');
        }
        return null;
      };

      let g = await tryGet();
      if (g && (g as any).status === 202) {
        // wait/poll until mapping ready
        const maxAttempts = 40; // ~1 minute
        let attempts = 0;
        while (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 1500));
          const r2 = await tryGet();
          if (r2 && (r2 as any).status !== 202) { g = r2; break; }
          attempts++;
        }
      }

      if (!g) {
        // 404 -> trigger mapping via POST /api/map
        const mapCall = await fetch(`${BACKEND}/api/map`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: uploadId }),
        });
        if (mapCall.status === 200) {
          const j = await mapCall.json();
          mapping = j.mapping || null;
        } else if (mapCall.status === 202) {
          // queued/processing: poll GET /api/mapping/:id
          const maxAttempts = 60; // ~90s
          let attempts = 0;
          while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1500));
            const r = await fetch(`${BACKEND}/api/mapping/${uploadId}`);
            if (r.status === 200) { const j = await r.json(); mapping = j.mapping || null; break; }
            if (r.status === 500) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'processing_error'); }
            attempts++;
          }
        } else if (mapCall.status === 409) {
          // mapping was accepted by user; fetch existing mapping
          const r = await fetch(`${BACKEND}/api/mapping/${uploadId}`);
          if (r.ok) { const j = await r.json(); mapping = j.mapping || null; }
        } else {
          const txt = await mapCall.text();
          console.warn('map call failed', mapCall.status, txt);
        }
      } else if (g && (g as any).status !== 202) {
        mapping = g as any;
      }

      if (mapping) applyMappingObject(mapping, originalName);
      else toast.error('No mapping found for this file');
    } catch (e) {
      console.error('fill mapping error', e);
      toast.error('Failed to fetch mapping');
    } finally {
      removeMappingLoading(uploadId);
    }
  };

  const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [] as File[]);
    // clear input so selecting same file again works
    (e.target as HTMLInputElement).value = '';
    // upload and extract in background
    uploadAndExtract(files);
  };

  return (
    <WalletGuard>
      <div className="min-h-screen gradient-mesh">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link to="/">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Issue Certificate
            </h1>
            <p className="text-muted-foreground">
              Create a new on-chain certificate for a recipient
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form */}
            <Card className="glass-card p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="attachments">Attachments (optional)</Label>
                  <p className="text-xs text-muted-foreground">Upload any supporting files as PDF (handbook, brochure, etc.).</p>
                  <div>
                    <input
                      id="attachments"
                      type="file"
                      multiple
                      onChange={handleAttachmentsChange}
                      className="hidden"
                    />

                    <label htmlFor="attachments" className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                      <Plus className="h-4 w-4" />
                      <span>{isProcessingFiles ? 'Processing...' : 'Upload files'}</span>
                    </label>
                  </div>

                  {formData.attachments.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {formData.attachments.map((a, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 bg-white/50 dark:bg-slate-900 px-3 py-2 rounded-md border border-slate-100 dark:border-slate-800">
                          <div className="text-sm truncate">{a.name} <span className="text-xs text-muted-foreground">({Math.round(a.size/1024)} KB)</span></div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" type="button" onClick={() => {
                              const next = Array.from(formData.attachments);
                              next.splice(i, 1);
                              setFormData(prev => ({ ...prev, attachments: next }));
                            }}>Remove</Button>
                            <Button variant="outline" size="sm" type="button" onClick={() => handleFillFromAttachment((a as any).uploadId, a.name)}>
                              {mappingLoadingIds.includes((a as any).uploadId) ? 'Filling...' : 'Fill out'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Label htmlFor="recipient">Recipient Address *</Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={formData.recipient}
                    onChange={(e) => updateField('recipient', e.target.value)}
                    className={errors.recipient ? 'border-destructive' : ''}
                  />
                  {errors.recipient && (
                    <p className="text-sm text-destructive">{errors.recipient}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Certificate Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Hackathon Participant"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className={errors.title ? 'border-destructive' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issuerName">Organization / Issuer Name *</Label>
                  <Input
                    id="issuerName"
                    placeholder="e.g., START Hack"
                    value={formData.issuerName}
                    onChange={(e) => updateField('issuerName', e.target.value)}
                    className={errors.issuerName ? 'border-destructive' : ''}
                  />
                  {errors.issuerName && (
                    <p className="text-sm text-destructive">{errors.issuerName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usefulLinks">Useful Links (optional)</Label>
                  <p className="text-xs text-muted-foreground">Add helpful links (event page, etc.). Must start with https://</p>
                  <div className="space-y-2">
                    {(formData.usefulLinks as string[]).map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="https://"
                          value={link}
                          onChange={(e) => {
                            const next = Array.from(formData.usefulLinks as string[]);
                            next[idx] = e.target.value;
                            setFormData(prev => ({ ...prev, usefulLinks: next }));
                            if (errors.usefulLinks) setErrors(prev => ({ ...prev, usefulLinks: '' }));
                          }}
                        />
                        <Button type="button" variant="ghost" onClick={() => {
                          const next = Array.from(formData.usefulLinks as string[]);
                          next.splice(idx, 1);
                          setFormData(prev => ({ ...prev, usefulLinks: next }));
                        }}>
                          Remove
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, usefulLinks: [...(prev.usefulLinks as string[]), ''] }))}
                      className="bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2"
                    >
                      + Add link
                    </Button>
                  </div>
                  {errors.usefulLinks && (
                    <p className="text-sm text-destructive">{errors.usefulLinks}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what the recipient accomplished..."
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className={errors.description ? 'border-destructive' : ''}
                    rows={4}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {suggestedCategory && !formData.category && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <div>Suggested: <strong className="text-primary">{suggestedCategory.value}</strong> ({Math.round(suggestedCategory.confidence * 100)}%)</div>
                      {suggestedCategory.source && (
                        <div className="italic">— source: page {suggestedCategory.source.page}</div>
                      )}
                      {suggestedCategory.confidence < 0.6 && (
                        <button className="ml-4 text-xs underline" type="button" onClick={() => {
                          setFormData(prev => ({ ...prev, category: suggestedCategory.value }));
                          setSuggestedCategory(null);
                        }}>Apply suggestion</button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => updateField('endDate', e.target.value)}
                      className={errors.endDate ? 'border-destructive' : ''}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-destructive">{errors.endDate}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skills">Skills (comma-separated)</Label>
                  <Input
                    id="skills"
                    placeholder="e.g., Solidity, React, Web3"
                    value={formData.skills}
                    onChange={(e) => updateField('skills', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evidenceUrls">Evidence URLs (comma-separated)</Label>
                  <Input
                    id="evidenceUrls"
                    placeholder="e.g., https://github.com/project"
                    value={formData.evidenceUrls}
                    onChange={(e) => updateField('evidenceUrls', e.target.value)}
                    className={errors.evidenceUrls ? 'border-destructive' : ''}
                  />
                  {errors.evidenceUrls && (
                    <p className="text-sm text-destructive">{errors.evidenceUrls}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Certificate Image URL</Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={(e) => updateField('imageUrl', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for auto-generated certificate
                  </p>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                  <Send className="h-4 w-4" />
                  {isSubmitting ? 'Issuing...' : 'Issue Certificate'}
                </Button>
              </form>
            </Card>

            {/* Preview */}
            <Card className="glass-card p-6 h-fit sticky top-24">
              <h3 className="font-semibold mb-4">Preview</h3>
              <div className="space-y-4">
                {formData.imageUrl && (
                  <img 
                    src={formData.imageUrl} 
                    alt="Certificate preview"
                    className="w-full rounded-lg"
                  />
                )}
                <div>
                  <h4 className="font-semibold text-lg">{formData.title || 'Certificate Title'}</h4>
                  <p className="text-sm text-muted-foreground">{formData.issuerName || 'Issuer Name'}</p>
                </div>
                {formData.description && (
                  <p className="text-sm line-clamp-3">{formData.description}</p>
                )}
                {formData.skills && (
                  <div className="flex flex-wrap gap-1">
                    {formData.skills.split(',').map((skill, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </WalletGuard>
  );
}
