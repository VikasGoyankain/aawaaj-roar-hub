import { useEffect, useState, useCallback } from 'react';
import SEO from '@/components/SEO';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Globe,
  Mail,
  Link2,
  Plus,
  Pencil,
  Trash2,
  Save,
  GripVertical,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Facebook,
  LayoutTemplate,
  RefreshCw,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface ContactLeader {
  name: string;
  title: string;
  email: string;
}

export interface QuickLink {
  label: string;
  href: string;
}

export interface FooterSettingsData {
  social_links: SocialLink[];
  contact_leadership: ContactLeader[];
  quick_links: QuickLink[];
}

// ── Helpers ────────────────────────────────────────────────────
const SOCIAL_ICONS = [
  { value: 'instagram', label: 'Instagram', Icon: Instagram },
  { value: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin  },
  { value: 'twitter',   label: 'Twitter / X', Icon: Twitter },
  { value: 'youtube',   label: 'YouTube',   Icon: Youtube   },
  { value: 'facebook',  label: 'Facebook',  Icon: Facebook  },
  { value: 'globe',     label: 'Website',   Icon: Globe     },
];

const IconComponent = ({ name, className }: { name: string; className?: string }) => {
  const found = SOCIAL_ICONS.find((s) => s.value === name);
  const Comp = found?.Icon || Globe;
  return <Comp className={className} />;
};

const EMPTY_FOOTER: FooterSettingsData = {
  social_links: [],
  contact_leadership: [],
  quick_links: [],
};

// ──────────────────────────────────────────────────────────────
//  Main Component
// ──────────────────────────────────────────────────────────────
export default function FooterSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<FooterSettingsData>(EMPTY_FOOTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Dialog state ──
  const [socialDialog, setSocialDialog] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [socialForm, setSocialForm] = useState<SocialLink>({ platform: '', url: '', icon: 'instagram' });

  const [contactDialog, setContactDialog] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [contactForm, setContactForm] = useState<ContactLeader>({ name: '', title: '', email: '' });

  const [linkDialog, setLinkDialog] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [linkForm, setLinkForm] = useState<QuickLink>({ label: '', href: '' });

  // ── Fetch ──
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data: row, error } = await supabase
      .from('footer_settings')
      .select('social_links, contact_leadership, quick_links')
      .single();

    if (error || !row) {
      console.error('[FooterSettings] fetch error:', error);
    } else {
      setData({
        social_links: (row.social_links as SocialLink[]) || [],
        contact_leadership: (row.contact_leadership as ContactLeader[]) || [],
        quick_links: (row.quick_links as QuickLink[]) || [],
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Save all ──
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('footer_settings')
      .upsert({
        id: 1,
        social_links: data.social_links,
        contact_leadership: data.contact_leadership,
        quick_links: data.quick_links,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      });

    if (error) {
      toast({ title: 'Error saving footer settings', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Footer settings saved!', description: 'Changes will appear on the public website immediately.' });
    }
    setSaving(false);
  };

  // ──────────────────────────────────────────────────────────
  //  Social Links helpers
  // ──────────────────────────────────────────────────────────
  const openAddSocial = () => {
    setSocialForm({ platform: '', url: '', icon: 'instagram' });
    setSocialDialog({ open: true, index: null });
  };
  const openEditSocial = (i: number) => {
    setSocialForm({ ...data.social_links[i] });
    setSocialDialog({ open: true, index: i });
  };
  const saveSocial = () => {
    if (!socialForm.platform.trim() || !socialForm.url.trim()) return;
    const updated = [...data.social_links];
    if (socialDialog.index === null) updated.push(socialForm);
    else updated[socialDialog.index] = socialForm;
    setData((d) => ({ ...d, social_links: updated }));
    setSocialDialog({ open: false, index: null });
  };
  const deleteSocial = (i: number) => {
    setData((d) => ({ ...d, social_links: d.social_links.filter((_, idx) => idx !== i) }));
  };

  // ──────────────────────────────────────────────────────────
  //  Contact Leadership helpers
  // ──────────────────────────────────────────────────────────
  const openAddContact = () => {
    setContactForm({ name: '', title: '', email: '' });
    setContactDialog({ open: true, index: null });
  };
  const openEditContact = (i: number) => {
    setContactForm({ ...data.contact_leadership[i] });
    setContactDialog({ open: true, index: i });
  };
  const saveContact = () => {
    if (!contactForm.name.trim() || !contactForm.email.trim()) return;
    const updated = [...data.contact_leadership];
    if (contactDialog.index === null) updated.push(contactForm);
    else updated[contactDialog.index] = contactForm;
    setData((d) => ({ ...d, contact_leadership: updated }));
    setContactDialog({ open: false, index: null });
  };
  const deleteContact = (i: number) => {
    setData((d) => ({ ...d, contact_leadership: d.contact_leadership.filter((_, idx) => idx !== i) }));
  };

  // ──────────────────────────────────────────────────────────
  //  Quick Links helpers
  // ──────────────────────────────────────────────────────────
  const openAddLink = () => {
    setLinkForm({ label: '', href: '' });
    setLinkDialog({ open: true, index: null });
  };
  const openEditLink = (i: number) => {
    setLinkForm({ ...data.quick_links[i] });
    setLinkDialog({ open: true, index: i });
  };
  const saveLink = () => {
    if (!linkForm.label.trim() || !linkForm.href.trim()) return;
    const updated = [...data.quick_links];
    if (linkDialog.index === null) updated.push(linkForm);
    else updated[linkDialog.index] = linkForm;
    setData((d) => ({ ...d, quick_links: updated }));
    setLinkDialog({ open: false, index: null });
  };
  const deleteLink = (i: number) => {
    setData((d) => ({ ...d, quick_links: d.quick_links.filter((_, idx) => idx !== i) }));
  };

  // ──────────────────────────────────────────────────────────
  //  Render
  // ──────────────────────────────────────────────────────────
  return (
    <>
      <SEO title="Footer Settings — Admin" />

      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <LayoutTemplate className="h-6 w-6 text-primary" />
              Footer Settings
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage social links, contact leadership, and quick links displayed in the public footer.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-5 bg-muted rounded w-1/4" /></CardHeader>
                <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6">
            {/* ── Social Links ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="h-4 w-4 text-primary" />
                      Social Media Links
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Platform icons shown in the footer brand section.
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={openAddSocial}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.social_links.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No social links yet. Click "Add" to create one.</p>
                ) : (
                  <div className="divide-y divide-border rounded-md border overflow-hidden">
                    {data.social_links.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/40 transition-colors">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <IconComponent name={s.icon} className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{s.platform}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.url}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditSocial(i)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteSocial(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Contact Leadership ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4 text-primary" />
                      Contact Leadership
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Leaders and their contact details shown in the footer.
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={openAddContact}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.contact_leadership.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No leadership contacts yet.</p>
                ) : (
                  <div className="divide-y divide-border rounded-md border overflow-hidden">
                    {data.contact_leadership.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/40 transition-colors">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{c.name}</p>
                            <Badge variant="secondary" className="text-[10px] leading-tight">{c.title}</Badge>
                          </div>
                          <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline">{c.email}</a>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditContact(i)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteContact(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Quick Links ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Link2 className="h-4 w-4 text-primary" />
                      Quick Links
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Navigation links shown in the footer.
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={openAddLink}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.quick_links.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No quick links yet.</p>
                ) : (
                  <div className="divide-y divide-border rounded-md border overflow-hidden">
                    {data.quick_links.map((l, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/40 transition-colors">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{l.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{l.href}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditLink(i)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteLink(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Info note ── */}
            <p className="text-xs text-muted-foreground text-center">
              Click <strong>Save Changes</strong> above to push all edits to the public website. Changes take effect immediately.
            </p>
          </div>
        )}
      </div>

      {/* ── Social Link Dialog ── */}
      <Dialog open={socialDialog.open} onOpenChange={(v) => setSocialDialog((s) => ({ ...s, open: v }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{socialDialog.index === null ? 'Add Social Link' : 'Edit Social Link'}</DialogTitle>
            <DialogDescription>Provide the platform name, URL, and icon style.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Platform Name</Label>
              <Input
                placeholder="e.g. Instagram"
                value={socialForm.platform}
                onChange={(e) => setSocialForm((f) => ({ ...f, platform: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>URL</Label>
              <Input
                placeholder="https://instagram.com/aawaaj_movement"
                value={socialForm.url}
                onChange={(e) => setSocialForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Icon</Label>
              <Select value={socialForm.icon} onValueChange={(v) => setSocialForm((f) => ({ ...f, icon: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick icon" />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_ICONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        <s.Icon className="h-4 w-4" />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSocialDialog({ open: false, index: null })}>Cancel</Button>
            <Button onClick={saveSocial} disabled={!socialForm.platform.trim() || !socialForm.url.trim()}>
              {socialDialog.index === null ? 'Add' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Contact Leadership Dialog ── */}
      <Dialog open={contactDialog.open} onOpenChange={(v) => setContactDialog((s) => ({ ...s, open: v }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{contactDialog.index === null ? 'Add Contact' : 'Edit Contact'}</DialogTitle>
            <DialogDescription>Enter the leader's name, title, and email address.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. Hardik Gajraj"
                value={contactForm.name}
                onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Title / Role</Label>
              <Input
                placeholder="e.g. Founder & National Head"
                value={contactForm.title}
                onChange={(e) => setContactForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="e.g. hardik@aawaaj.org"
                value={contactForm.email}
                onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialog({ open: false, index: null })}>Cancel</Button>
            <Button onClick={saveContact} disabled={!contactForm.name.trim() || !contactForm.email.trim()}>
              {contactDialog.index === null ? 'Add' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick Link Dialog ── */}
      <Dialog open={linkDialog.open} onOpenChange={(v) => setLinkDialog((s) => ({ ...s, open: v }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{linkDialog.index === null ? 'Add Quick Link' : 'Edit Quick Link'}</DialogTitle>
            <DialogDescription>Provide the label and destination URL or anchor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                placeholder="e.g. About the Movement"
                value={linkForm.label}
                onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>URL / Anchor</Label>
              <Input
                placeholder="e.g. #about or https://…"
                value={linkForm.href}
                onChange={(e) => setLinkForm((f) => ({ ...f, href: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog({ open: false, index: null })}>Cancel</Button>
            <Button onClick={saveLink} disabled={!linkForm.label.trim() || !linkForm.href.trim()}>
              {linkDialog.index === null ? 'Add' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
