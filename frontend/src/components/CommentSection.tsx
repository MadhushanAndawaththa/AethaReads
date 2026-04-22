'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';
import type { Comment } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

interface CommentSectionProps {
  chapterId: string;
}

function CommentAvatar({ displayName, avatarUrl }: { displayName: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
      {displayName?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  currentUserId,
}: {
  comment: Comment;
  onReply: (id: string, username: string) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}) {
  const isAuthor = comment.user_role === 'author' || comment.user_role === 'admin';
  const canDelete = currentUserId === comment.user_id;

  return (
    <div className={`flex gap-3 ${comment.depth > 0 ? 'ml-8 md:ml-10 mt-3' : ''}`}>
      <CommentAvatar displayName={comment.display_name} avatarUrl={comment.avatar_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-sm">{comment.display_name}</span>
          {isAuthor && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-500/20 text-brand-400 rounded-full uppercase tracking-wide">
              Author
            </span>
          )}
          <span className="text-[10px] text-[var(--text-muted)]">{formatDate(comment.created_at)}</span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed break-words">{comment.body}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {comment.depth < 2 && (
            <button
              onClick={() => onReply(comment.id, comment.display_name)}
              className="text-[10px] text-[var(--text-muted)] hover:text-brand-500 transition-colors"
            >
              Reply
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[10px] text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentSection({ chapterId }: CommentSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const loadComments = useCallback(async () => {
    try {
      const res = await api.getComments(chapterId);
      setComments(res.data || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/auth/login'); return; }
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const comment = await api.createComment(chapterId, body.trim(), replyTo?.id);
      setComments((prev) => [...prev, comment]);
      setBody('');
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const ok = await confirm({ message: 'Delete this comment?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete comment', 'error');
    }
  };

  return (
    <div className="mt-12 border-t border-[var(--border-color)] pt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-6">
        Comments ({comments.length})
      </h3>

      {/* Comment form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-muted)]">
              <span>Replying to <strong>{replyTo.name}</strong></span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-red-400 hover:text-red-300 ml-1"
              >
                ✕
              </button>
            </div>
          )}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg mb-2">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <CommentAvatar displayName={user.display_name} avatarUrl={user.avatar_url} />
            <div className="flex-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share your thoughts…"
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-brand-500 outline-none resize-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-[var(--text-muted)]">{body.length}/2000</span>
                <button
                  type="submit"
                  disabled={submitting || !body.trim()}
                  className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                >
                  {submitting ? 'Posting…' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="card p-4 text-center mb-8">
          <p className="text-sm text-[var(--text-muted)] mb-3">Sign in to join the conversation</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="btn-primary text-sm"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[var(--bg-secondary)] rounded w-24" />
                <div className="h-3 bg-[var(--bg-secondary)] rounded" />
                <div className="h-3 bg-[var(--bg-secondary)] rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-6">
          No comments yet. Start the conversation!
        </p>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={(id, name) => { setReplyTo({ id, name }); document.querySelector('textarea')?.focus(); }}
              onDelete={handleDelete}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
