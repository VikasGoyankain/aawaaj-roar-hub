import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import type { Blog, Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, BookOpen, Eye, EyeOff, Search, FileText } from 'lucide-react';

interface BlogRow extends Blog {
  author_name?: string;
}

export default function BlogsPage() {
  const { hasRole, profile: me, user } = useAuth();
  const { toast } = useToast();

  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editBlog, setEditBlog] = useState<BlogRow | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', content: '', cover_image: '', published: false });
  const [saving, setSaving] = useState(false);

  const [deleteBlog, setDeleteBlog] = useState<BlogRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); setLoading(false); return; }
    const blogList = (data || []) as Blog[];

    const authorIds = [...new Set(blogList.map((b) => b.author_id))];
    const { data: profiles } = authorIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', authorIds)
      : { data: [] };
    const pMap = new Map((profiles || []).map((p: Pick<Profile, 'id' | 'full_name'>) => [p.id, p.full_name]));

    setBlogs(blogList.map((b) => ({ ...b, author_name: pMap.get(b.author_id) || 'Unknown' })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchBlogs(); }, [fetchBlogs]);

  const filteredBlogs = search
    ? blogs.filter((b) =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author_name?.toLowerCase().includes(search.toLowerCase())
      )
    : blogs;

  const openCreate = () => {
    setEditBlog(null);
    setForm({ title: '', slug: '', content: '', cover_image: '', published: false });
    setEditorOpen(true);
  };

  const openEdit = (b: BlogRow) => {
    setEditBlog(b);
    setForm({ title: b.title, slug: b.slug, content: b.content, cover_image: b.cover_image || '', published: b.published });
    setEditorOpen(true);
  };

  const autoSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.content) {
      toast({ title: 'Missing fields', description: 'Title, slug, and content are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editBlog) {
        const { error } = await supabase.from('blogs').update({
          title: form.title, slug: form.slug, content: form.content,
          cover_image: form.cover_image || null, published: form.published,
        }).eq('id', editBlog.id);
        if (error) throw error;
        toast({ title: 'Blog updated' });
      } else {
        const { error } = await supabase.from('blogs').insert({
          author_id: user?.id, title: form.title, slug: form.slug, content: form.content,
          cover_image: form.cover_image || null, published: form.published,
        });
        if (error) throw error;
        toast({ title: 'Blog created' });
      }
      setEditorOpen(false);
      fetchBlogs();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteBlog) return;
    setDeleting(true);
    try {
      await supabase.from('blogs').delete().eq('id', deleteBlog.id);
      await supabase.from('audit_logs').insert({
        admin_id: me?.id, action: 'delete_blog', target_type: 'blog',
        target_id: deleteBlog.id, details: { title: deleteBlog.title },
      });
      toast({ title: 'Blog deleted' });
      setDeleteBlog(null);
      fetchBlogs();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setDeleting(false); }
  };

  const togglePublish = async (b: BlogRow) => {
    const newVal = !b.published;
    await supabase.from('blogs').update({ published: newVal }).eq('id', b.id);
    setBlogs((prev) => prev.map((x) => (x.id === b.id ? { ...x, published: newVal } : x)));
    toast({ title: newVal ? '✅ Published' : '📝 Moved to Draft' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading blogs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">Blogs</h2>
            <p className="text-sm text-muted-foreground">{blogs.length} posts total</p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="rounded-xl bg-accent font-semibold text-primary hover:bg-accent/90 shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> New Post
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search blogs by title or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Bento Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBlogs.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">No blogs yet. Create your first post!</p>
          </div>
        ) : (
          filteredBlogs.map((b) => (
            <div
              key={b.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {b.cover_image ? (
                <div className="h-44 overflow-hidden">
                  <img
                    src={b.cover_image}
                    alt={b.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                  <BookOpen className="h-12 w-12 text-primary/20" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold leading-snug text-foreground line-clamp-2">{b.title}</h3>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs font-medium ${
                      b.published
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    {b.published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <p className="flex-1 text-xs text-muted-foreground line-clamp-3">{b.content.substring(0, 160)}…</p>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  by <span className="font-medium text-foreground">{b.author_name}</span> · {formatDate(b.created_at)}
                </p>
                <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 rounded-xl text-xs"
                    onClick={() => togglePublish(b)}
                  >
                    {b.published ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                    {b.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => openEdit(b)}>
                    <Edit className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  {hasRole(['President', 'Technical Head', 'Content Head']) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-xs text-destructive hover:text-destructive hover:bg-red-50"
                      onClick={() => setDeleteBlog(b)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary">{editBlog ? 'Edit Post' : 'New Blog Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((prev) => ({ ...prev, title, slug: editBlog ? prev.slug : autoSlug(title) }));
                  }}
                  className="rounded-xl"
                  placeholder="Enter blog title..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="rounded-xl font-mono text-sm"
                  placeholder="url-friendly-slug"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Cover Image URL</Label>
              <Input
                value={form.cover_image}
                onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                className="rounded-xl"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Content *</Label>
              <Textarea
                rows={12}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="rounded-xl resize-none font-mono text-sm"
                placeholder="Write your blog content here..."
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setForm({ ...form, published: v })}
              />
              <div>
                <Label className="text-sm font-semibold">Publish immediately</Label>
                <p className="text-xs text-muted-foreground">Make this post visible to the public</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? 'Saving...' : editBlog ? 'Update Post' : 'Create Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteBlog} onOpenChange={(o) => !o && setDeleteBlog(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "<strong>{deleteBlog?.title}</strong>"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Post'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
