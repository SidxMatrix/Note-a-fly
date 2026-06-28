"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import FadeContent from "@/components/reactbits/FadeContent";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";

interface Session {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
  status: string;
}

const PAGE_SIZE = 12;

const hoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export default function AllSessionsPage() {
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(0);
  const [hasMore,     setHasMore]     = useState(true);
  const [totalCount,  setTotalCount]  = useState(0);

  const supabase = createClient();
  const router   = useRouter();

  useEffect(() => {
    loadPage(0, true);
  }, []);

  const loadPage = async (pageIndex: number, initial = false) => {
    if (initial) setLoading(true);
    else setLoadingMore(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const from = pageIndex * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data, count, error } = await supabase
      .from("sessions")
      .select("id, title, source_type, created_at, status", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      setSessions((prev) => pageIndex === 0 ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      if (count !== null) setTotalCount(count);
    }

    setPage(pageIndex);
    if (initial) setLoading(false);
    else setLoadingMore(false);
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] p-8">
        <div className="w-36 h-5 bg-[#eeeeee] rounded-full mb-8 animate-pulse" />
        <div className="w-52 h-10 bg-[#eeeeee] rounded-xl mb-3 animate-pulse" />
        <div className="w-48 h-4 bg-[#eeeeee] rounded-xl mb-10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-[#eeeeee] animate-pulse"
              style={{ height: "160px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8">

      {/* ── Back button ─────────────────────────────────────────────────────── */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2 mb-10 text-sm font-bold"
        style={{ fontFamily: "var(--font-label)", color: "#636262" }}
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to Dashboard
      </motion.button>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-12">
        <SplitText
          text="All Sessions"
          className="text-4xl font-[family-name:var(--font-headline)] italic text-[#1b1b1b] pr-2 mb-3"
          delay={35}
          duration={0.7}
          ease="power3.out"
          splitType="words"
          from={{ opacity: 0, y: 20 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          textAlign="left"
          tag="h1"
        />
        <BlurText
          text={`${totalCount} session${totalCount !== 1 ? "s" : ""} in your library`}
          delay={20}
          animateBy="words"
          direction="top"
          className="text-base text-[#5f5e5e] font-[family-name:var(--font-body)] mt-2"
        />
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {sessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl p-16 text-center border border-[#eeeeee] gel-shadow"
        >
          <span
            className="material-symbols-outlined text-[#cfc4c5] mb-4 block"
            style={{ fontSize: "64px" }}
          >
            description
          </span>
          <p
            className="text-[#636262] mb-6"
            style={{ fontFamily: "var(--font-body)" }}
          >
            No sessions yet. Go create your first one!
          </p>
          <button
            onClick={() => router.push("/dashboard/new/text")}
            className="px-6 py-3 rounded-full text-sm font-bold"
            style={{
              fontFamily: "var(--font-label)",
              backgroundColor: "#1b1b1b",
              color: "#ffffff",
            }}
          >
            Create Session
          </button>
        </motion.div>
      )}

      {/* ── Sessions grid ────────────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"
          >
            {sessions.map((session, idx) => {
              const statusStyle =
                session.status === "completed" || session.status === "complete"
                  ? { bg: "bg-green-100",  text: "text-green-700"  }
                  : session.status === "failed"
                  ? { bg: "bg-yellow-100", text: "text-yellow-700" }
                  : { bg: "bg-[#e2dfff]",  text: "text-[#0f0069]"  };

              const sourceIcon =
                session.source_type === "text"    ? "content_paste"  :
                session.source_type === "audio"   ? "mic"            :
                session.source_type === "youtube" ? "play_circle"    :
                session.source_type === "pdf"     ? "picture_as_pdf" :
                "upload_file";

              const date = new Date(session.created_at).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              );

              return (
                <FadeContent
                  key={session.id}
                  duration={400}
                  delay={Math.min(idx * 40, 300)}
                >
                  <motion.div whileHover="hover" initial="rest">
                    <Link href={`/dashboard/session/${session.id}`}>
                      {/* ↓ rounded-3xl + p-7 matches dashboard card sizing */}
                      <motion.div
                        variants={hoverVariants}
                        className="bg-white rounded-3xl p-7 gel-shadow border border-[#eeeeee] cursor-pointer h-full"
                      >
                        {/* Status + icon row */}
                        <div className="flex items-start justify-between mb-5">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-[family-name:var(--font-label)] ${statusStyle.bg} ${statusStyle.text}`}
                          >
                            {session.status}
                          </span>
                          <span className="material-symbols-outlined text-[#cfc4c5] text-xl">
                            {sourceIcon}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-[family-name:var(--font-headline)] italic text-xl text-[#1b1b1b] mb-3 line-clamp-2">
                          {session.title}
                        </h3>

                        {/* Date */}
                        <p className="text-xs text-[#636262] font-[family-name:var(--font-body)]">
                          {date}
                        </p>
                      </motion.div>
                    </Link>
                  </motion.div>
                </FadeContent>
              );
            })}
          </motion.div>

          {/* ── Load More / End ───────────────────────────────────────────────── */}
          {hasMore ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p
                className="text-xs text-[#bbb]"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Showing {sessions.length} of {totalCount} sessions
              </p>
              <button
                onClick={() => loadPage(page + 1)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold tracking-wider uppercase"
                style={{
                  fontFamily: "var(--font-label)",
                  backgroundColor: "#1b1b1b",
                  color: "#ffffff",
                  opacity: loadingMore ? 0.6 : 1,
                  cursor: loadingMore ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s",
                }}
              >
                {loadingMore ? (
                  <>
                    <span
                      className="material-symbols-outlined animate-spin"
                      style={{ fontSize: "18px" }}
                    >
                      refresh
                    </span>
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      expand_more
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p
              className="text-center py-8 text-xs text-[#bbb]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              All {totalCount} sessions loaded
            </p>
          )}
        </>
      )}
    </div>
  );
}