"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getUserProfile, getUserRexSheets, followUser, unfollowUser, updateProfile, updateSkills, UserProfile, RexOut, getDepartments, DepartmentOut } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import RexCard from "@/components/LearningCard";

export default function ProfilePage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const userId = Number(params.id);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sheets, setSheets] = useState<RexOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", position: "", bio: "", department_id: 0 });
  const [editSkills, setEditSkills] = useState("");
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);

  const isOwnProfile = currentUser?.id === userId;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, l] = await Promise.all([getUserProfile(userId), getUserRexSheets(userId)]);
      setProfile(p);
      setSheets(l.items);
      setIsFollowed(p.is_followed);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      if (isFollowed) {
        await unfollowUser(userId);
        setIsFollowed(false);
        if (profile) setProfile({ ...profile, follower_count: profile.follower_count - 1, is_followed: false });
      } else {
        await followUser(userId);
        setIsFollowed(true);
        if (profile) setProfile({ ...profile, follower_count: profile.follower_count + 1, is_followed: true });
      }
    } catch { /* silent */ }
    setFollowLoading(false);
  };

  const startEditing = async () => {
    if (!profile) return;
    setEditForm({
      full_name: profile.full_name,
      position: profile.position,
      bio: profile.bio || "",
      department_id: profile.department?.id || 0,
    });
    setEditSkills(profile.skills.map((s) => s.name).join(", "));
    if (departments.length === 0) {
      try { const d = await getDepartments(); setDepartments(d); } catch { /* silent */ }
    }
    setEditing(true);
  };

  const saveProfile = async () => {
    try {
      await updateProfile({
        full_name: editForm.full_name,
        position: editForm.position,
        bio: editForm.bio,
        department_id: editForm.department_id || undefined,
      });
      const skillList = editSkills.split(",").map((s) => s.trim()).filter(Boolean);
      if (skillList.length > 0) {
        await updateSkills(skillList);
      }
      setEditing(false);
      fetchData();
    } catch { /* silent */ }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>;
  if (!profile) return <p className="text-center py-20 text-gray-500">User not found</p>;

  return (
    <div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {(profile.full_name || profile.username).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.full_name || profile.username}
                  {profile.is_trusted && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Trusted</span>
                  )}
                </h1>
                <p className="text-sm text-gray-600">{profile.position}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {isOwnProfile ? (
                  <button onClick={startEditing}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors">
                    Edit Profile
                  </button>
                ) : (
                  <button onClick={handleFollow} disabled={followLoading}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      isFollowed
                        ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}>
                    {isFollowed ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              {profile.department && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{profile.department.name}</span>
              )}
              <span>{profile.rex_count} REX</span>
              <span>{profile.follower_count} followers</span>
              <span>{profile.following_count} following</span>
              <span>{profile.total_views} views</span>
              <span className="text-brand-600 font-medium">Score: {profile.contributor_score}</span>
            </div>
          </div>
        </div>

        {profile.skills.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span key={s.id} className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">{s.name}</span>
              ))}
            </div>
          </div>
        )}

        {profile.bio && <p className="mt-4 text-sm text-gray-500 border-t border-gray-100 pt-4">{profile.bio}</p>}
      </div>

      {/* Edit Profile Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setEditing(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Profile</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Full Name</label>
                <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Position</label>
                <input value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Bio</label>
                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Department</label>
                <select value={editForm.department_id} onChange={(e) => setEditForm({ ...editForm, department_id: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 outline-none">
                  <option value={0}>None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Skills (comma-separated)</label>
                <input value={editSkills} onChange={(e) => setEditSkills(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 outline-none"
                  placeholder="e.g. Corporate Tax, Python, IFRS" />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setEditing(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveProfile} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Save</button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-base font-semibold text-gray-900 mb-3">REX Sheets</h2>
      {sheets.length === 0 ? (
        <p className="text-gray-400 text-sm">No REX sheets published yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{sheets.map((r) => <RexCard key={r.id} rex={r} onBookmarkChange={fetchData} />)}</div>
      )}
    </div>
  );
}
