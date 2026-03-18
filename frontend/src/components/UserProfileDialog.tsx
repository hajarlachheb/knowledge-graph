"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getUserProfile,
  getUserRexSheets,
  followUser,
  unfollowUser,
  UserProfile,
  RexOut,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import RexCard from "@/components/LearningCard";

interface Props {
  userId: number;
  onClose: () => void;
}

export default function UserProfileDialog({ userId, onClose }: Props) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sheets, setSheets] = useState<RexOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, l] = await Promise.all([
        getUserProfile(userId),
        getUserRexSheets(userId),
      ]);
      setProfile(p);
      setSheets(l.items);
      setIsFollowed(p.is_followed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      if (isFollowed) {
        await unfollowUser(userId);
        setIsFollowed(false);
        if (profile)
          setProfile({
            ...profile,
            follower_count: profile.follower_count - 1,
            is_followed: false,
          });
      } else {
        await followUser(userId);
        setIsFollowed(true);
        if (profile)
          setProfile({
            ...profile,
            follower_count: profile.follower_count + 1,
            is_followed: true,
          });
      }
    } catch {
      /* silent */
    }
    setFollowLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-dialog-title"
    >
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-2xl my-8 mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : error ? (
            <p className="text-center py-20 text-gray-500 dark:text-gray-400">{error}</p>
          ) : !profile ? (
            <p className="text-center py-20 text-gray-500 dark:text-gray-400">User not found</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start gap-4 pr-8">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40 text-2xl font-bold text-brand-700 dark:text-brand-300">
                  {(profile.full_name || profile.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <h1 id="profile-dialog-title" className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                        {profile.full_name || profile.username}
                        {profile.is_trusted && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            Trusted
                          </span>
                        )}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{profile.position}</p>
                      {profile.department && (
                        <span className="inline-block mt-1 rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                          {profile.department.name}
                        </span>
                      )}
                    </div>
                    {!isOwnProfile && (
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                          isFollowed
                            ? "border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            : "bg-brand-600 text-white hover:bg-brand-700"
                        }`}
                      >
                        {followLoading ? "..." : isFollowed ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span>{profile.rex_count} REX</span>
                    <span>{profile.follower_count} followers</span>
                    <span>{profile.following_count} following</span>
                    <span className="text-brand-600 dark:text-brand-400 font-medium">
                      Score: {profile.contributor_score}
                    </span>
                  </div>
                </div>
              </div>

              {profile.skills.length > 0 && (
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full bg-green-50 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.bio && (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
                  {profile.bio}
                </p>
              )}

              <h2 className="mt-6 text-base font-semibold text-gray-900 dark:text-white mb-3">
                REX Sheets
              </h2>
              {sheets.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-sm">No REX sheets published yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {sheets.map((r) => (
                    <RexCard key={r.id} rex={r} onBookmarkChange={fetchData} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
