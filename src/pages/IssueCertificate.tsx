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

// Add these mock collections at the top (replace with real data as needed)
// TODO REPLACE WITH REAL USER COLLECTIONS
const userCollections = [
  { id: 'col1', name: 'Hackathons' },
  { id: 'col2', name: 'Courses' },
  { id: 'col3', name: 'Volunteering' },
];

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
  const [selectedCollection, setSelectedCollection] = useState<string>(userCollections[0]?.id || '');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

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
  };

  return (
    <WalletGuard>
      <div className="min-h-screen gradient-mesh">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link to="/">
            <Button
              variant="ghost"
              className="mb-6 gap-2 hover:bg-[#c7395c] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#c7395c] to-[#c7395c] bg-clip-text text-transparent">
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
                {/* Collection dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="collection">Collection</Label>
                  <Select
                    value={selectedCollection}
                    onValueChange={(value) => {
                      setSelectedCollection(value);
                      setIsCreatingCollection(value === 'create_new');
                    }}
                  >
                    <SelectTrigger id="collection">
                      <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {userCollections.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="create_new">Create new collection</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCreatingCollection && (
                    <div className="mt-2">
                      <Label htmlFor="newCollectionName">New Collection Name</Label>
                      <Input
                        id="newCollectionName"
                        placeholder="Enter collection name"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachments">Attachments (optional)</Label>
                  <p className="text-xs text-muted-foreground">Upload any supporting files as PDF (handbook, brochure, etc.).</p>
                  <div>
                    <input
                      id="attachments"
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const metas = files.map(f => ({ name: f.name, type: f.type, size: f.size }));
                        setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...metas] }));
                        // clear input so selecting same file again works
                        (e.target as HTMLInputElement).value = '';
                      }}
                      className="hidden"
                    />

                    <label htmlFor="attachments" className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                      <Plus className="h-4 w-4" />
                      <span>Upload files</span>
                    </label>
                  </div>

                  {formData.attachments.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {formData.attachments.map((a, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 bg-white/50 dark:bg-slate-900 px-3 py-2 rounded-md border border-slate-100 dark:border-slate-800">
                          <div className="text-sm truncate">{a.name} <span className="text-xs text-muted-foreground">({Math.round(a.size/1024)} KB)</span></div>
                          <Button variant="ghost" type="button" onClick={() => {
                            const next = Array.from(formData.attachments);
                            next.splice(i, 1);
                            setFormData(prev => ({ ...prev, attachments: next }));
                          }}>Remove</Button>
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
