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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, BookOpen, Eye, EyeOff } from 'lucide-react';

interface BlogRow extends Blog {
  author_name?: string;
}

export default function BlogsPage() {
  const { hasRole, profile: me, user } = useAuth();
  const { toast } = useToast();

  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create / Edit dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editBlog, setEditBlog] = useState<BlogRow | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', content: '', cover_image: '', published: false });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteBlog, setDeleteBlog] = useState<BlogRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }
    const blogList = (data || []) as Blog[];

    // Get author names
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
    ? blogs.filter((b) => b.title.toLowerCase().includes(search.toLowerCase()) || b.author_name?.toLowerCase().includes(search.toLowerCase()))
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

  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.content) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editBlog) {
        const { error } = await supabase.from('blogs').update({
          title: form.title,
          slug: form.slug,
          content: form.content,
          cover_image: form.cover_image || null,
          published: form.published,
        }).eq('id', editBlog.id);
        if (error) throw error;
        toast({ title: 'Blog updated' });
      } else {
        const { error } = await supabase.from('blogs').insert({
          author_id: user?.id,
          title: form.title,
          slug: form.slug,
          content: form.content,
          cover_image: form.cover_image || null,
          published: form.published,
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
        admin_id: me?.id,
        action: 'delete_blog',
        target_type: 'blog',
        target_id: deleteBlog.id,
        details: { title: deleteBlog.title },
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
    toast({ title: newVal ? 'Published' : 'Unpublished' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002D04] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-[#002D04]" />
          <div>
            <h2 className="text-2xl font-bold text-[#002D04]">Blogs</h2>
            <p className="text-sm text-gray-500">{blogs.length} posts</p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-[#F4C430] text-[#002D04] hover:bg-[#dab22a]">
          <Plus className="mr-2 h-4 w-4" /> New Post
        </Button>
      </div>

      <Input placeholder="Search blogs..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />

      {/* Bento Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBlogs.length === 0 ? (
          <p className="col-span-full py-12 text-center text-gray-400">No blogs yet</p>
        ) : (
          filteredBlogs.map((b) => (
            <Card key={b.id} className="flex flex-col">
              {b.cover_image && (
                <div className="h-40 overflow-hidden rounded-t-lg">
                  <img src={b.cover_image} alt={b.title} className="h-full w-full object-cover" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{b.title}</CardTitle>
                  <Badge variant="secondary" className={b.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                    {b.published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-2">
                <p className="line-clamp-3 text-sm text-gray-500">{b.content.substring(0, 200)}</p>
                <p className="mt-2 text-xs text-gray-400">by {b.author_name} · {formatDate(b.created_at)}</p>
              </CardContent>
              <CardFooter className="gap-2 border-t pt-3">
                <Button variant="ghost" size="sm" onClick={() => togglePublish(b)}>
                  {b.published ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                  {b.published ? 'Unpublish' : 'Publish'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Edit className="mr-1 h-3 w-3" />Edit</Button>
                {hasRole(['President', 'Technical Head', 'Content Head']) && (
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteBlog(b)}>
                    <Trash2 className="mr-1 h-3 w-3" />Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editBlog ? 'Edit Post' : 'New Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((prev) => ({ ...prev, title, slug: editBlog ? prev.slug : autoSlug(title) }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              <Label>Publish immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#002D04] hover:bg-[#004d0a]">
              {saving ? 'Saving...' : editBlog ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteBlog} onOpenChange={(o) => !o && setDeleteBlog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>Delete "<strong>{deleteBlog?.title}</strong>"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
