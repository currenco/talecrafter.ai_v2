"use client";

import { getAccessToken } from "@/lib/neon-auth/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/api-client";

type StoryItemType = {
  id: string;
  storyId: string;
  title: string;
  storyType: string | null;
  ageGroup: string | null;
  storySubject: string | null;
  imageStyle: string | null;
  userEmail: string | null;
  userName: string | null;
};

type UserType = {
  id: string;
  userName: string | null;
  userEmail: string;
  userImage?: string | null;
  credit: number;
};

type Pagination = {
  limit: number;
  offset: number;
  totalCount: number;
  hasMore: boolean;
};

type AdminStoryPage = {
  items: StoryItemType[];
  pagination: Pagination;
  summary: { storyTypes: string[] };
};

type AdminUserPage = {
  items: UserType[];
  pagination: Pagination;
  summary: { totalCredits: number };
};

const PAGE_SIZE = 12;

const AdminDashboard = () => {
  const storyTriggerRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLDivElement>(null);
  const loadingStoriesRef = useRef(false);
  const loadingUsersRef = useRef(false);
  const [activeTab, setActiveTab] = useState<"stories" | "users">("stories");
  const [stories, setStories] = useState<StoryItemType[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [storyTotal, setStoryTotal] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [storyHasMore, setStoryHasMore] = useState(false);
  const [userHasMore, setUserHasMore] = useState(false);
  const [storyTypes, setStoryTypes] = useState<string[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [storySearch, setStorySearch] = useState("");
  const [storyTypeFilter, setStoryTypeFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [editedCredits, setEditedCredits] = useState<Record<string, number>>(
    {},
  );

  const getAuthToken = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("Admin session is not available");
    return token;
  }, []);

  const fetchStories = useCallback(
    async (offset = 0) => {
      if (loadingStoriesRef.current) return;

      loadingStoriesRef.current = true;
      setLoadingStories(true);
      try {
        const token = await getAuthToken();
        const result = await apiFetch<AdminStoryPage>(
          `/admin/stories?limit=${PAGE_SIZE}&offset=${offset}`,
          { token },
        );
        setStories((previous) => {
          const merged =
            offset === 0 ? result.items : [...previous, ...result.items];
          return Array.from(
            new Map(merged.map((story) => [story.storyId, story])).values(),
          );
        });
        setStoryTotal(result.pagination.totalCount);
        setStoryHasMore(result.pagination.hasMore);
        setStoryTypes(result.summary.storyTypes);
      } catch {
        setStoryHasMore(false);
        toast.error("Failed to load stories");
      } finally {
        loadingStoriesRef.current = false;
        setLoadingStories(false);
      }
    },
    [getAuthToken],
  );

  const fetchUsers = useCallback(
    async (offset = 0) => {
      if (loadingUsersRef.current) return;

      loadingUsersRef.current = true;
      setLoadingUsers(true);
      try {
        const token = await getAuthToken();
        const result = await apiFetch<AdminUserPage>(
          `/admin/users?limit=${PAGE_SIZE}&offset=${offset}`,
          { token },
        );
        setUsers((previous) => {
          const merged =
            offset === 0 ? result.items : [...previous, ...result.items];
          return Array.from(
            new Map(merged.map((user) => [user.id, user])).values(),
          );
        });
        setUserTotal(result.pagination.totalCount);
        setUserHasMore(result.pagination.hasMore);
        setTotalCredits(result.summary.totalCredits);
      } catch {
        setUserHasMore(false);
        toast.error("Failed to load users");
      } finally {
        loadingUsersRef.current = false;
        setLoadingUsers(false);
      }
    },
    [getAuthToken],
  );

  useEffect(() => {
    void fetchStories();
    void fetchUsers();
  }, [fetchStories, fetchUsers]);

  useEffect(() => {
    if (activeTab !== "stories" || !storyHasMore || loadingStories) return;
    const trigger = storyTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchStories(stories.length);
        }
      },
      { root: null, rootMargin: "220px 0px", threshold: 0.01 },
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [activeTab, fetchStories, loadingStories, stories.length, storyHasMore]);

  useEffect(() => {
    if (activeTab !== "users" || !userHasMore || loadingUsers) return;
    const trigger = userTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchUsers(users.length);
        }
      },
      { root: null, rootMargin: "220px 0px", threshold: 0.01 },
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [activeTab, fetchUsers, loadingUsers, userHasMore, users.length]);

  const handleDeleteStory = async (storyId: string) => {
    try {
      const token = await getAuthToken();
      await apiFetch(`/admin/stories/${encodeURIComponent(storyId)}`, {
        method: "DELETE",
        token,
      });
      setStories((prev) => prev.filter((s) => s.storyId !== storyId));
      setStoryTotal((previous) => Math.max(0, previous - 1));
      toast.success("Story deleted successfully");
    } catch {
      toast.error("Failed to delete story");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const deletedUser = users.find((user) => user.id === userId);

    try {
      const token = await getAuthToken();
      await apiFetch(`/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        token,
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setUserTotal((previous) => Math.max(0, previous - 1));
      setTotalCredits((previous) =>
        Math.max(0, previous - Number(deletedUser?.credit ?? 0)),
      );
      toast.success("User deleted successfully");
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleUpdateUserCredit = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const newCredit = editedCredits[userId] ?? user.credit;
    if (!Number.isInteger(newCredit) || newCredit < 0) {
      toast.error("Invalid credit value");
      return;
    }

    try {
      const token = await getAuthToken();
      const updatedUser = await apiFetch<UserType>(
        `/admin/users/${encodeURIComponent(userId)}/credit`,
        {
          method: "PATCH",
          token,
          body: JSON.stringify({ credit: newCredit }),
        },
      );
      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      setTotalCredits(
        (previous) => previous + updatedUser.credit - user.credit,
      );
      toast.success("User credit updated");
    } catch {
      toast.error("Failed to update credit");
    }
  };

  const storyTypeOptions = useMemo(() => ["all", ...storyTypes], [storyTypes]);

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const search = storySearch.toLowerCase();
      const matchesSearch =
        story.title.toLowerCase().includes(search) ||
        (story.userName ?? "").toLowerCase().includes(search) ||
        (story.userEmail ?? "").toLowerCase().includes(search) ||
        (story.storySubject ?? "").toLowerCase().includes(search);
      const matchesType =
        storyTypeFilter === "all" ||
        (story.storyType ?? "") === storyTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [stories, storySearch, storyTypeFilter]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.userName ?? "").toLowerCase().includes(search) ||
        (u.userEmail ?? "").toLowerCase().includes(search),
    );
  }, [users, userSearch]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1522] px-5 py-8 md:px-16 lg:px-28 xl:px-40">
      <div className="tc-hero-grid absolute inset-0 opacity-35" />
      <div className="tc-hero-orb tc-hero-orb-one" />
      <div className="tc-hero-orb tc-hero-orb-two" />

      <div className="relative">
        <div className="tc-glass-panel p-6">
          <h1 className="font-serif text-4xl font-medium tracking-tight text-[#f1eadb] md:text-6xl">
            Admin Panel
          </h1>
          <p className="mt-2 text-[#c3cbd4]/75">
            Centralized story moderation and user management.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-[#d8c69e]/[0.08] p-3 text-center">
              <p className="text-2xl font-bold text-[#f1eadb]">{storyTotal}</p>
              <p className="text-xs uppercase text-[#c3cbd4]/70">
                Total Stories
              </p>
            </div>
            <div className="rounded-xl bg-[#d8c69e]/[0.08] p-3 text-center">
              <p className="text-2xl font-bold text-[#f1eadb]">{userTotal}</p>
              <p className="text-xs uppercase text-[#c3cbd4]/70">Total Users</p>
            </div>
            <div className="rounded-xl bg-[#d8c69e]/[0.08] p-3 text-center">
              <p className="text-2xl font-bold text-[#f1eadb]">
                {storyTypes.length}
              </p>
              <p className="text-xs uppercase text-[#c3cbd4]/70">Story Types</p>
            </div>
            <div className="rounded-xl bg-[#d8c69e]/[0.08] p-3 text-center">
              <p className="text-2xl font-bold text-[#f1eadb]">
                {totalCredits}
              </p>
              <p className="text-xs uppercase text-[#c3cbd4]/70">
                Total Credits
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setActiveTab("stories")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              activeTab === "stories"
                ? "border-[#d8c69e]/40 bg-[#d8c69e]/15 text-[#f1eadb]"
                : "border-[#d8c69e]/20 bg-white/5 text-[#c3cbd4]/80 hover:bg-white/10"
            }`}
          >
            Stories
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              activeTab === "users"
                ? "border-[#d8c69e]/40 bg-[#d8c69e]/15 text-[#f1eadb]"
                : "border-[#d8c69e]/20 bg-white/5 text-[#c3cbd4]/80 hover:bg-white/10"
            }`}
          >
            Users
          </button>
        </div>

        {activeTab === "stories" && (
          <div className="tc-glass-panel-soft mt-4 p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                placeholder="Search loaded stories, title, user, email..."
                className="w-full rounded-lg border border-[#d8c69e]/20 bg-[#111d2b] px-3 py-2 text-[#c3cbd4] outline-none"
                value={storySearch}
                onChange={(e) => setStorySearch(e.target.value)}
              />
              <select
                className="rounded-lg border border-[#d8c69e]/20 bg-[#111d2b] px-3 py-2 text-[#c3cbd4] outline-none"
                value={storyTypeFilter}
                onChange={(e) => setStoryTypeFilter(e.target.value)}
              >
                {storyTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type === "all" ? "All Types" : type}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-[#c3cbd4]">
                <thead className="bg-[#d8c69e]/[0.08] text-left">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Prompt</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStories.map((story) => (
                    <tr
                      key={story.storyId}
                      className="border-t border-[#d8c69e]/10"
                    >
                      <td className="px-3 py-2">{story.title || "-"}</td>
                      <td className="px-3 py-2">{story.storyType ?? "-"}</td>
                      <td className="px-3 py-2">{story.userName ?? "-"}</td>
                      <td className="px-3 py-2">{story.userEmail ?? "-"}</td>
                      <td className="max-w-[280px] truncate px-3 py-2">
                        {story.storySubject ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleDeleteStory(story.storyId)}
                          className="rounded-lg bg-red-500 px-3 py-1 font-semibold text-white hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loadingStories && filteredStories.length === 0 && (
                <p className="mt-4 text-center text-[#c3cbd4]/70">
                  No stories found.
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-col items-center gap-3">
              <p className="text-sm text-[#c3cbd4]/60">
                Showing {stories.length} of {storyTotal} stories
              </p>
              <div ref={storyTriggerRef} className="h-6" aria-hidden="true" />
              {loadingStories && stories.length > 0 ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#d8c69e] border-t-transparent" />
              ) : null}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="tc-glass-panel-soft mt-4 p-5">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search loaded users by name or email..."
                className="w-full rounded-lg border border-[#d8c69e]/20 bg-[#111d2b] px-3 py-2 text-[#c3cbd4] outline-none"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-[#c3cbd4]">
                <thead className="bg-[#d8c69e]/[0.08] text-left">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Credit</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-t border-[#d8c69e]/10">
                      <td className="px-3 py-2">{u.userName ?? "-"}</td>
                      <td className="px-3 py-2">{u.userEmail ?? "-"}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          defaultValue={u.credit}
                          className="w-24 rounded-md border border-[#d8c69e]/20 bg-[#111d2b] px-2 py-1 text-[#c3cbd4] outline-none"
                          onChange={(e) => {
                            setEditedCredits((prev) => ({
                              ...prev,
                              [u.id]: Number(e.target.value),
                            }));
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleUpdateUserCredit(u.id)}
                            className="rounded-full bg-[#d8c69e] px-3 py-1 font-semibold text-[#101a28] hover:bg-[#eee0c0]"
                          >
                            Save Credit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="rounded-lg bg-red-500 px-3 py-1 font-semibold text-white hover:bg-red-600"
                          >
                            Delete User
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loadingUsers && filteredUsers.length === 0 && (
                <p className="mt-4 text-center text-[#c3cbd4]/70">
                  No users found.
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-col items-center gap-3">
              <p className="text-sm text-[#c3cbd4]/60">
                Showing {users.length} of {userTotal} users
              </p>
              <div ref={userTriggerRef} className="h-6" aria-hidden="true" />
              {loadingUsers && users.length > 0 ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#d8c69e] border-t-transparent" />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
