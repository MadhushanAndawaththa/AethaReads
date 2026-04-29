'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';
import type { Review } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ReportButton } from '@/components/ReportButton';

interface ReviewSectionProps {
  slug: string;
}

const RATING_LABELS = ['Story', 'Style', 'Grammar', 'Character'] as const;
type RatingKey = 'rating_story' | 'rating_style' | 'rating_grammar' | 'rating_character';
const RATING_KEYS: RatingKey[] = ['rating_story', 'rating_style', 'rating_grammar', 'rating_character'];

function StarRating({ value, onChange, label }: { value: number; onChange?: (v: number) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-[var(--text-muted)] w-16 shrink-0">{label}</span>}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className={`text-lg leading-none transition-colors ${
              onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            } ${star <= value ? 'text-yellow-400' : 'text-[var(--border-color)]'}`}
            disabled={!onChange}
          >
            ★
          </button>
        ))}
      </div>
      {label && <span className="text-xs text-[var(--text-muted)] w-4">{value}/5</span>}
    </div>
  );
}

function ReviewCard({ review, onVote }: { review: Review; onVote: (id: string, helpful: boolean) => void }) {
  const { user } = useAuth();
  const avg = ((review.rating_story + review.rating_style + review.rating_grammar + review.rating_character) / 4);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {review.avatar_url ? (
            <img src={review.avatar_url} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {review.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <p className="font-medium text-sm">{review.display_name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{formatDate(review.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm shrink-0">
          ★ {avg.toFixed(1)}
        </div>
      </div>

      {/* Sub-ratings */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {RATING_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--text-muted)] w-14">{label}</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <span key={s} className={`text-[10px] ${s <= [review.rating_story, review.rating_style, review.rating_grammar, review.rating_character][i] ? 'text-yellow-400' : 'text-[var(--border-color)]'}`}>★</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {review.title && <h4 className="font-semibold text-sm">{review.title}</h4>}
      {review.body && <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{review.body}</p>}

      {user && (
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-color)]">
          <span className="text-[10px] text-[var(--text-muted)]">Helpful?</span>
          <button
            onClick={() => onVote(review.id, true)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md hover:bg-green-500/10 hover:text-green-400 transition-colors"
          >
            👍 {review.helpful_count > 0 ? review.helpful_count : ''}
          </button>
          <button
            onClick={() => onVote(review.id, false)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            👎
          </button>
          {user.id !== review.user_id && <ReportButton targetType="review" targetId={review.id} compact />}
        </div>
      )}
    </div>
  );
}

export function ReviewSection({ slug }: ReviewSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    rating_story: 3, rating_style: 3, rating_grammar: 3, rating_character: 3,
  });
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      const res = await api.getReviews(slug);
      setReviews(res.data || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/auth/login'); return; }
    setSubmitting(true);
    setError('');
    try {
      const review = await api.createReview(slug, {
        ...ratings,
        title: reviewTitle,
        body: reviewBody,
      });
      setReviews((prev) => [review, ...prev]);
      setShowForm(false);
      setReviewTitle('');
      setReviewBody('');
      setRatings({ rating_story: 3, rating_style: 3, rating_grammar: 3, rating_character: 3 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: string, helpful: boolean) => {
    try { await api.voteReview(id, helpful); } catch { /* ignore */ }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Reviews ({reviews.length})
        </h2>
        {user && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-brand-500 hover:text-brand-400 font-medium"
          >
            + Write a Review
          </button>
        )}
        {!user && (
          <button
            onClick={() => router.push('/auth/login')}
            className="text-xs text-[var(--text-muted)] hover:text-brand-500"
          >
            Sign in to review
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-4 space-y-4">
          <p className="font-semibold text-sm">Your Review</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RATING_LABELS.map((label, i) => (
              <StarRating
                key={label}
                label={label}
                value={ratings[RATING_KEYS[i]]}
                onChange={(v) => setRatings((prev) => ({ ...prev, [RATING_KEYS[i]]: v }))}
              />
            ))}
          </div>

          <input
            type="text"
            placeholder="Review title (optional)"
            value={reviewTitle}
            onChange={(e) => setReviewTitle(e.target.value)}
            maxLength={120}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-brand-500 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />

          <textarea
            placeholder="Share your thoughts about this novel…"
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-brand-500 outline-none resize-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />

          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(''); }}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)]" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-[var(--bg-secondary)] rounded w-24" />
                  <div className="h-2 bg-[var(--bg-secondary)] rounded w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[var(--bg-secondary)] rounded" />
                <div className="h-3 bg-[var(--bg-secondary)] rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card p-8 text-center text-[var(--text-muted)]">
          <p className="text-sm">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} onVote={handleVote} />
          ))}
        </div>
      )}
    </section>
  );
}
