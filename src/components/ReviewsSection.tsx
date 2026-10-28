import React, { useState } from 'react';
import { Star, ExternalLink, ShieldCheck, Quote, MessageSquare, MapPin, X, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { Review } from '../types/index.ts';
import { api } from '../api.ts';

interface ReviewsSectionProps {
  reviews: Review[];
  customerUser?: { name?: string; email?: string } | null;
  onOpenWriteReview?: () => void;
  onReviewSubmitted?: (review: Review) => void;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  customerUser,
  onOpenWriteReview,
  onReviewSubmitted
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [authorName, setAuthorName] = useState<string>(customerUser?.name || '');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleOpenModal = () => {
    if (onOpenWriteReview) {
      // If parent supplied a custom opener, we can still show our direct modal or call parent
    }
    if (customerUser?.name && !authorName) {
      setAuthorName(customerUser.name);
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!reviewText.trim()) {
      setError('Please share your review or feedback.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.submitPublicReview({
        authorName: authorName.trim(),
        rating,
        reviewText: reviewText.trim(),
        email: customerUser?.email,
        source: 'Website Customer'
      });

      if (res.review) {
        onReviewSubmitted?.(res.review);
      }
      setSuccessMsg('Thank you! Your review has been submitted and is now published on our website.');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
        setReviewText('');
        if (!customerUser) setAuthorName('');
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="reviews" className="py-20 bg-[#FBFBFA] dark:bg-[#141312] border-t border-[#E6D4BA]/30 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Verified Rating Card */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-[#9C753D] dark:text-[#C29F67] font-bold">
              Verified Client Experiences
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1B1A] dark:text-white">
              Customer Feedback & Reviews
            </h2>
            <p className="text-sm font-medium text-[#79746D] dark:text-gray-300 max-w-xl">
              Authentic feedback from local residents, families, and valued clients at our Kolar Road salon.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Aggregate Rating Scoreboard */}
            <div className="bg-[#FAF7F2] dark:bg-[#1C1B1A] border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex items-center gap-5 shrink-0 shadow-xs">
              <div className="text-center pr-4 border-r border-[#E6D4BA]/60 dark:border-white/10">
                <span className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1B1A] dark:text-white">
                  4.9
                </span>
                <div className="flex items-center gap-0.5 text-[#C29F67] mt-1 justify-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#C29F67]" />
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1B1A] dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                  <span>Google & Verified Clients</span>
                </div>
                <p className="text-[11px] text-[#79746D] dark:text-gray-400 font-medium">
                  Authentic ratings in Bhopal
                </p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=B%26B+Family+Salon+Ultimate+Arcade+Kolar+Road+Bhopal"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9C753D] dark:text-[#C29F67] hover:underline pt-0.5"
                >
                  <span>View Google Listing</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Prominent "Give Your Review" Button in Customer View */}
            <button
              type="button"
              onClick={handleOpenModal}
              className="px-5 py-3.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
            >
              <Star className="w-4 h-4 fill-white" />
              <span>Give Your Review</span>
            </button>
          </div>
        </div>

        {/* Reviews Grid */}
        {reviews.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/40 dark:border-white/10 rounded-2xl max-w-md mx-auto space-y-3">
            <Star className="w-10 h-10 text-[#C29F67] mx-auto opacity-50" />
            <h3 className="font-serif font-bold text-lg text-[#1C1B1A] dark:text-white">
              Be the First to Leave a Review
            </h3>
            <p className="text-xs text-[#79746D] dark:text-gray-400">
              Share your salon experience with the Bhopal community!
            </p>
            <button
              type="button"
              onClick={handleOpenModal}
              className="px-5 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
            >
              Give Your Review
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reviews.map((rev) => {
              const isGoogle = rev.source?.toLowerCase().includes('google');

              return (
                <div
                  key={rev.id}
                  className="bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/50 dark:border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative"
                >
                  <Quote className="w-6 h-6 text-[#E6D4BA]/60 dark:text-white/10 absolute top-5 right-5" />

                  <div className="space-y-3">
                    <div className="flex items-center gap-1">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#C29F67] text-[#C29F67]" />
                      ))}
                    </div>

                    <p className="text-xs text-[#1C1B1A]/85 dark:text-gray-200 leading-relaxed italic font-medium">
                      "{rev.reviewText}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-white/10 mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-[#1C1B1A] dark:text-white">{rev.authorName}</h4>
                        <span className="text-[10px] text-[#79746D] dark:text-gray-400 font-medium">
                          {rev.reviewDate}
                        </span>
                      </div>
                      {rev.isVerified && (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>

                    {/* Source distinction */}
                    <div className="pt-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isGoogle
                          ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                          : rev.source?.toLowerCase().includes('insta')
                          ? 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800'
                          : 'text-[#9C753D] dark:text-[#C29F67] bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                      }`}>
                        {isGoogle ? <MapPin className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                        <span>{rev.source || 'Website Customer'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CUSTOMER "GIVE YOUR REVIEW" MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E6D4BA]/40 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#C29F67] fill-[#C29F67]" />
                <h3 className="font-serif font-bold text-lg text-[#1C1B1A] dark:text-white">
                  Give Your Review
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                  Thank You for Your Feedback!
                </h4>
                <p className="text-xs text-[#79746D] dark:text-gray-300">
                  {successMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Rating Picker */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1.5">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            (hoverRating || rating) >= star
                              ? 'fill-[#C29F67] text-[#C29F67]'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-[#9C753D] dark:text-[#C29F67] ml-2">
                      {rating} of 5 Stars
                    </span>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                  />
                </div>

                {/* Review Text */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Your Feedback / Experience *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your hair, skin, bridal or grooming experience with our stylists..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full p-3 bg-[#FAF7F2] dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-white/20 text-[#79746D] dark:text-gray-300 rounded-xl font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !authorName.trim() || !reviewText.trim()}
                    className="px-5 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Review</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
