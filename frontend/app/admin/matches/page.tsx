"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Edit3,
  MapPin,
  Plus,
  Search,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";

import { api } from "@/lib/api";
import type {
  Match,
  MatchCreateRequest,
  MatchScoreRequest,
  MatchStatus,
  MatchStatusRequest,
  Sport,
  Team,
} from "@/types";

type MatchForm = {
  sportId: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  venue: string;
  roundName: string;
  scheduledAt: string;
  status: MatchStatus;
};

const emptyForm: MatchForm = {
  sportId: "",
  teamAId: "",
  teamBId: "",
  scoreA: 0,
  scoreB: 0,
  venue: "",
  roundName: "",
  scheduledAt: "",
  status: "UPCOMING",
};

const statusOptions: MatchStatus[] = [
  "UPCOMING",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
];

export default function AdminMatchesPage() {
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | MatchStatus
  >("ALL");
  const [sportFilter, setSportFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingMatch, setEditingMatch] =
    useState<Match | null>(null);
  const [form, setForm] = useState<MatchForm>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [scoreValues, setScoreValues] = useState<
    Record<number, { scoreA: number; scoreB: number }>
  >({});

  const filteredTeamsForForm = useMemo(() => {
    if (!form.sportId) {
      return teams;
    }

    return teams.filter(
      (team) => String(team.sportId) === form.sportId
    );
  }, [teams, form.sportId]);

  const filteredMatches = useMemo(() => {
    const value = search.toLowerCase().trim();

    return matches.filter((match) => {
      const matchesSearch =
        !value ||
        match.teamAName.toLowerCase().includes(value) ||
        match.teamBName.toLowerCase().includes(value) ||
        match.sportName.toLowerCase().includes(value) ||
        match.venue?.toLowerCase().includes(value) ||
        match.roundName?.toLowerCase().includes(value) ||
        String(match.id).includes(value);

      const matchesStatus =
        statusFilter === "ALL" ||
        match.status === statusFilter;

      const matchesSport =
        sportFilter === "ALL" ||
        String(match.sportId) === sportFilter;

      return matchesSearch && matchesStatus && matchesSport;
    });
  }, [matches, search, statusFilter, sportFilter]);

  const liveCount = matches.filter(
    (match) => match.status === "LIVE"
  ).length;

  const upcomingCount = matches.filter(
    (match) => match.status === "UPCOMING"
  ).length;

  const completedCount = matches.filter(
    (match) => match.status === "COMPLETED"
  ).length;

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      router.push("/admin");
      return;
    }

    loadData();
  }, [router]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [matchesData, sportsData, teamsData] =
        await Promise.all([
          api.matches.getAll(),
          api.sports.getAll(),
          api.teams.getAll(),
        ]);

      const sortedMatches = [...matchesData].sort(
  (a, b) =>
    a.scheduledAt.localeCompare(b.scheduledAt)
);

      setMatches(sortedMatches);

      setSports(
        [...sportsData].sort(
          (a, b) => a.displayOrder - b.displayOrder
        )
      );

      setTeams(teamsData);

      const initialScores: Record<
        number,
        { scoreA: number; scoreB: number }
      > = {};

      matchesData.forEach((match) => {
        initialScores[match.id] = {
          scoreA: match.scoreA ?? 0,
          scoreB: match.scoreB ?? 0,
        };
      });

      setScoreValues(initialScores);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load matches"
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingMatch(null);

    setForm({
      ...emptyForm,
      sportId: sports[0]?.id
        ? String(sports[0].id)
        : "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(match: Match) {
  setEditingMatch(match);

  setForm({
    sportId: String(match.sportId),
    teamAId: String(match.teamAId),
    teamBId: String(match.teamBId),
    scoreA: match.scoreA ?? 0,
    scoreB: match.scoreB ?? 0,
    venue: match.venue ?? "",
    roundName: match.roundName ?? "",
    scheduledAt: match.scheduledAt.slice(0, 16),
    status: match.status,
  });

  setError("");
  setSuccess("");
  setShowModal(true);
}

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingMatch(null);
    setForm(emptyForm);
    setError("");
  }

  async function saveMatch() {
    if (!form.sportId) {
      setError("Please select a sport.");
      return;
    }

    if (!form.teamAId || !form.teamBId) {
      setError("Please select both teams.");
      return;
    }

    if (form.teamAId === form.teamBId) {
      setError("A team cannot play against itself.");
      return;
    }

    if (!form.scheduledAt) {
      setError("Please select a date and time.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload: MatchCreateRequest = {
  sportId: Number(form.sportId),
  teamAId: Number(form.teamAId),
  teamBId: Number(form.teamBId),
  scoreA: Number(form.scoreA),
  scoreB: Number(form.scoreB),
  venue: form.venue.trim() || null,
  roundName: form.roundName.trim() || null,
  scheduledAt: form.scheduledAt,
  status: form.status,
};

      const savedMatch = editingMatch
        ? await api.matches.update(
            editingMatch.id,
            payload
          )
        : await api.matches.create(payload);

      if (editingMatch) {
        setMatches((current) =>
          current
            .map((match) =>
              match.id === editingMatch.id
                ? savedMatch
                : match
            )
            .sort(
              (a, b) =>
                new Date(a.scheduledAt).getTime() -
                new Date(b.scheduledAt).getTime()
            )
        );

        setSuccess("Match updated successfully.");
      } else {
        setMatches((current) =>
          [...current, savedMatch].sort(
            (a, b) =>
              new Date(a.scheduledAt).getTime() -
              new Date(b.scheduledAt).getTime()
          )
        );

        setSuccess("Match created successfully.");
      }

      setShowModal(false);
      setEditingMatch(null);
      setForm(emptyForm);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save match"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteMatch(match: Match) {
    const confirmed = window.confirm(
      `Delete Match #${match.id}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.matches.delete(match.id);

      setMatches((current) =>
        current.filter((item) => item.id !== match.id)
      );

      setSuccess(
        `Match #${match.id} deleted successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete match"
      );
    }
  }

  async function updateScore(match: Match) {
    try {
      setError("");
      setSuccess("");

      const values = scoreValues[match.id] ?? {
        scoreA: match.scoreA ?? 0,
        scoreB: match.scoreB ?? 0,
      };

      const payload: MatchScoreRequest = {
        scoreA: Number(values.scoreA),
        scoreB: Number(values.scoreB),
      };

      const updatedMatch =
        await api.matches.updateScore(
          match.id,
          payload
        );

      setMatches((current) =>
        current.map((item) =>
          item.id === match.id
            ? updatedMatch
            : item
        )
      );

      setSuccess(`Match #${match.id} score updated.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update score"
      );
    }
  }

  async function updateStatus(
    match: Match,
    status: MatchStatus,
    winnerTeamId: number | null = null
  ) {
    try {
      setError("");
      setSuccess("");

      const payload: MatchStatusRequest = {
        status,
        winnerTeamId:
          status === "COMPLETED"
            ? winnerTeamId
            : null,
      };

      const updatedMatch =
        await api.matches.updateStatus(
          match.id,
          payload
        );

      setMatches((current) =>
        current.map((item) =>
          item.id === match.id
            ? updatedMatch
            : item
        )
      );

      if (status === "COMPLETED") {
        setSuccess(
          updatedMatch.winnerName
            ? `Match #${match.id} completed — ${updatedMatch.winnerName} wins.`
            : `Match #${match.id} completed — DRAW.`
        );
      } else {
        setSuccess(
          `Match #${match.id} is now ${status}.`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update match status"
      );
    }
  }

  function formatDate(value: string) {
  const [datePart, timePart] = value.split("T");

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const date = new Date(year, month - 1, day);

  return `${String(day).padStart(2, "0")} ${date.toLocaleString(
    "en-IN",
    {
      month: "short",
    }
  )} ${year}, ${String(hour % 12 || 12).padStart(
    2,
    "0"
  )}:${String(minute).padStart(2, "0")} ${
    hour >= 12 ? "pm" : "am"
  }`;
}
  function statusClasses(status: MatchStatus) {
    switch (status) {
      case "LIVE":
        return "bg-[#e85a4f] text-[#fff7e8]";
      case "COMPLETED":
        return "bg-[#d7c85f]";
      case "CANCELLED":
        return "bg-[#d9cebb]";
      default:
        return "bg-[#fbf5e8]";
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3ead8] text-[#063b32]">
      <header className="sticky top-0 z-40 border-b-2 border-[#063b32] bg-[#f3ead8]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 lg:px-10">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              onClick={() =>
                router.push("/admin/dashboard")
              }
              className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[#063b32] bg-[#fbf5e8] shadow-[4px_4px_0_#063b32] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#063b32] sm:h-14 sm:w-14 sm:shadow-[5px_5px_0_#063b32]"
            >
              <ArrowLeft size={23} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] opacity-60 sm:text-sm sm:tracking-[0.2em]">
                <Trophy size={16} />
                Freshers&apos; Cup
              </div>

              <h1 className="mt-1 truncate text-3xl font-black uppercase tracking-tight sm:text-4xl lg:text-5xl">
                Matches
              </h1>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex w-full items-center justify-center gap-2 border-2 border-[#063b32] bg-[#e85a4f] px-6 py-4 text-base font-black uppercase tracking-wide text-[#fff7e8] shadow-[5px_5px_0_#063b32] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#063b32] sm:w-auto"
          >
            <Plus size={21} />
            Add Match
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-4">
          <div className="border-2 border-[#063b32] bg-[#104c41] p-5 text-[#fff7e8] shadow-[6px_6px_0_#063b32] sm:p-7 sm:shadow-[7px_7px_0_#063b32]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70 sm:text-sm sm:tracking-[0.18em]">
              Total Matches
            </p>

            <p className="mt-3 text-5xl font-black sm:text-6xl">
              {matches.length}
            </p>
          </div>

          <div className="border-2 border-[#063b32] bg-[#e85a4f] p-5 text-[#fff7e8] shadow-[6px_6px_0_#063b32] sm:p-7 sm:shadow-[7px_7px_0_#063b32]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80 sm:text-sm sm:tracking-[0.18em]">
              Live
            </p>

            <p className="mt-3 text-5xl font-black sm:text-6xl">
              {liveCount}
            </p>
          </div>

          <div className="border-2 border-[#063b32] bg-[#fbf5e8] p-5 shadow-[6px_6px_0_#063b32] sm:p-7 sm:shadow-[7px_7px_0_#063b32]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-60 sm:text-sm sm:tracking-[0.18em]">
              Upcoming
            </p>

            <p className="mt-3 text-5xl font-black sm:text-6xl">
              {upcomingCount}
            </p>
          </div>

          <div className="border-2 border-[#063b32] bg-[#fbf5e8] p-5 shadow-[6px_6px_0_#063b32] sm:p-7 sm:shadow-[7px_7px_0_#063b32]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-60 sm:text-sm sm:tracking-[0.18em]">
              Completed
            </p>

            <p className="mt-3 text-5xl font-black sm:text-6xl">
              {completedCount}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-55 sm:text-sm sm:tracking-[0.2em]">
              Competition Control
            </p>

            <h2 className="mt-1 text-2xl font-black uppercase sm:text-3xl">
              Manage Matches
            </h2>
          </div>

          <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
            <div className="relative w-full md:w-[360px]">
              <Search
                size={22}
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="SEARCH MATCHES..."
                className="w-full border-2 border-[#063b32] bg-[#fbf5e8] py-4 pl-12 pr-4 text-base font-bold uppercase tracking-wide outline-none shadow-[5px_5px_0_#063b32]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | "ALL"
                    | MatchStatus
                )
              }
              className="w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-base font-black uppercase outline-none shadow-[5px_5px_0_#063b32] md:w-auto"
            >
              <option value="ALL">ALL STATUS</option>

              {statusOptions.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>

            <select
              value={sportFilter}
              onChange={(e) =>
                setSportFilter(e.target.value)
              }
              className="w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-base font-black uppercase outline-none shadow-[5px_5px_0_#063b32] md:w-auto"
            >
              <option value="ALL">ALL SPORTS</option>

              {sports.map((sport) => (
                <option
                  key={sport.id}
                  value={sport.id}
                >
                  {sport.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-start justify-between gap-4 border-2 border-[#063b32] bg-[#e85a4f] px-4 py-4 text-sm font-bold text-[#fff7e8] shadow-[5px_5px_0_#063b32] sm:px-6 sm:py-5 sm:text-base">
            <span className="break-words">
              {error}
            </span>

            <button
              onClick={() => setError("")}
              className="shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-start justify-between gap-4 border-2 border-[#063b32] bg-[#d7c85f] px-4 py-4 text-sm font-black shadow-[5px_5px_0_#063b32] sm:px-6 sm:py-5 sm:text-base">
            <span className="break-words">
              {success}
            </span>

            <button
              onClick={() => setSuccess("")}
              className="shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <section className="mt-7">
          {loading ? (
            <div className="border-2 border-[#063b32] bg-[#fbf5e8] px-6 py-16 text-center shadow-[7px_7px_0_#063b32] sm:py-20">
              <p className="text-sm font-bold uppercase tracking-[0.15em] opacity-50 sm:text-base">
                Loading matches...
              </p>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="border-2 border-[#063b32] bg-[#fbf5e8] px-5 py-16 text-center shadow-[7px_7px_0_#063b32] sm:px-6 sm:py-20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-[#063b32] bg-[#104c41] text-[#fff7e8] sm:h-20 sm:w-20">
                <CalendarDays size={30} />
              </div>

              <h3 className="mt-5 text-xl font-black uppercase sm:text-2xl">
                No Matches Found
              </h3>

              <p className="mt-2 text-sm font-semibold opacity-60 sm:text-base">
                Create a match to get the competition moving.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredMatches.map((match) => (
                <article
                  key={match.id}
                  className="min-w-0 overflow-hidden border-2 border-[#063b32] bg-[#fbf5e8] shadow-[7px_7px_0_#063b32]"
                >
                  <div className="flex flex-col gap-4 border-b-2 border-[#063b32] bg-[#104c41] px-4 py-4 text-[#fff7e8] sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                      <span className="border-2 border-[#fff7e8] px-3 py-2 text-[11px] font-black uppercase sm:text-xs">
                        Match #{match.id}
                      </span>

                      <span className="text-sm font-black uppercase tracking-wide">
                        {match.sportName}
                      </span>

                      {match.roundName && (
                        <span className="break-words text-sm font-semibold opacity-70">
                          {match.roundName}
                        </span>
                      )}
                    </div>

                    <span
                      className={`w-fit border-2 border-[#fff7e8] px-3 py-2 text-xs font-black uppercase sm:px-4 sm:text-sm ${statusClasses(
                        match.status
                      )}`}
                    >
                      {match.status === "LIVE" &&
                        "● "}
                      {match.status}
                    </span>
                  </div>

                  <div className="grid gap-7 p-5 sm:p-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:p-8">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-45 sm:text-xs">
                        Team A
                      </p>

                      <p className="mt-2 break-words text-2xl font-black uppercase sm:text-3xl lg:text-4xl">
                        {match.teamAName}
                      </p>

                      <div className="mt-4 flex items-start gap-2 text-sm font-semibold opacity-60">
                        <MapPin
                          size={16}
                          className="mt-0.5 shrink-0"
                        />

                        <span className="break-words">
                          {match.venue ||
                            "Venue not set"}
                        </span>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-45 sm:text-xs">
                        Score
                      </p>

                      <div className="mt-2 flex items-center justify-center gap-3 sm:gap-4">
                        <p className="text-4xl font-black sm:text-5xl">
                          {match.scoreA}
                        </p>

                        <span className="text-2xl font-black opacity-35 sm:text-3xl">
                          :
                        </span>

                        <p className="text-4xl font-black sm:text-5xl">
                          {match.scoreB}
                        </p>
                      </div>

                      <p className="mt-3 text-xs font-bold opacity-55 sm:text-sm">
                        {formatDate(
                          match.scheduledAt
                        )}
                      </p>
                    </div>

                    <div className="min-w-0 lg:text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-45 sm:text-xs">
                        Team B
                      </p>

                      <p className="mt-2 break-words text-2xl font-black uppercase sm:text-3xl lg:text-4xl">
                        {match.teamBName}
                      </p>

                      <div className="mt-4 flex items-start gap-2 text-sm font-semibold opacity-60 lg:justify-end">
                        <Trophy
                          size={16}
                          className="mt-0.5 shrink-0"
                        />

                        <span className="break-words">
                          {match.winnerName
                            ? `Winner: ${match.winnerName}`
                            : "Winner pending"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(match.status === "LIVE" ||
                    match.status === "COMPLETED") && (
                    <div className="border-t-2 border-[#063b32] bg-[#e9dfca] p-5 sm:p-6">
                      <div className="flex flex-col gap-5">
                        {match.status === "LIVE" && (
                          <div>
                            <div className="flex items-center gap-2">
                              <Zap size={20} />
                              <p className="text-lg font-black uppercase sm:text-xl">
                                Live Score Control
                              </p>
                            </div>
                            <p className="mt-1 text-sm font-semibold opacity-55">
                              Update the score while the match is in progress.
                            </p>
                          </div>
                        )}

                        {match.status === "COMPLETED" && (
                          <div>
                            <div className="flex items-center gap-2">
                              <Trophy size={20} />
                              <p className="text-lg font-black uppercase sm:text-xl">
                                Match Result
                              </p>
                            </div>
                            <p className="mt-1 text-sm font-semibold opacity-55">
                              Change the official result if it was entered incorrectly.
                            </p>
                          </div>
                        )}

                        {match.status === "LIVE" && (
                          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min={0}
                                value={
                                  scoreValues[match.id]?.scoreA ??
                                  match.scoreA
                                }
                                onChange={(e) =>
                                  setScoreValues((current) => ({
                                    ...current,
                                    [match.id]: {
                                      scoreA: Math.max(0, Number(e.target.value)),
                                      scoreB:
                                        current[match.id]?.scoreB ??
                                        match.scoreB,
                                    },
                                  }))
                                }
                                className="h-14 w-20 border-2 border-[#063b32] bg-[#fbf5e8] text-center text-2xl font-black outline-none"
                              />

                              <span className="text-2xl font-black">:</span>

                              <input
                                type="number"
                                min={0}
                                value={
                                  scoreValues[match.id]?.scoreB ??
                                  match.scoreB
                                }
                                onChange={(e) =>
                                  setScoreValues((current) => ({
                                    ...current,
                                    [match.id]: {
                                      scoreA:
                                        current[match.id]?.scoreA ??
                                        match.scoreA,
                                      scoreB: Math.max(0, Number(e.target.value)),
                                    },
                                  }))
                                }
                                className="h-14 w-20 border-2 border-[#063b32] bg-[#fbf5e8] text-center text-2xl font-black outline-none"
                              />
                            </div>

                            <button
                              onClick={() => updateScore(match)}
                              className="flex items-center justify-center gap-2 border-2 border-[#063b32] bg-[#104c41] px-5 py-4 text-sm font-black uppercase text-[#fff7e8] shadow-[4px_4px_0_#063b32]"
                            >
                              <Check size={18} />
                              Update Score
                            </button>
                          </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-3">
                          <button
                            onClick={() =>
                              updateStatus(match, "COMPLETED", match.teamAId)
                            }
                            className={`border-2 border-[#063b32] px-4 py-4 text-sm font-black uppercase shadow-[4px_4px_0_#063b32] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#063b32] ${
                              match.winnerId === match.teamAId
                                ? "bg-[#104c41] text-[#fff7e8]"
                                : "bg-[#d7c85f]"
                            }`}
                          >
                            <Trophy size={18} className="mx-auto mb-2" />
                            <span className="block break-words">
                              {match.teamAName}
                            </span>
                            <span className="mt-1 block text-xs opacity-60">
                              SET AS WINNER
                            </span>
                          </button>

                          <button
                            onClick={() =>
                              updateStatus(match, "COMPLETED", match.teamBId)
                            }
                            className={`border-2 border-[#063b32] px-4 py-4 text-sm font-black uppercase shadow-[4px_4px_0_#063b32] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#063b32] ${
                              match.winnerId === match.teamBId
                                ? "bg-[#104c41] text-[#fff7e8]"
                                : "bg-[#d7c85f]"
                            }`}
                          >
                            <Trophy size={18} className="mx-auto mb-2" />
                            <span className="block break-words">
                              {match.teamBName}
                            </span>
                            <span className="mt-1 block text-xs opacity-60">
                              SET AS WINNER
                            </span>
                          </button>

                          <button
                            onClick={() =>
                              updateStatus(match, "COMPLETED", null)
                            }
                            className={`border-2 border-[#063b32] px-4 py-4 text-sm font-black uppercase shadow-[4px_4px_0_#063b32] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#063b32] ${
                              !match.winnerId
                                ? "bg-[#104c41] text-[#fff7e8]"
                                : "bg-[#d9cebb]"
                            }`}
                          >
                            <span className="block text-2xl font-black">=</span>
                            <span className="mt-2 block">DRAW</span>
                            <span className="mt-1 block text-xs opacity-60">
                              NO WINNER
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4 border-t-2 border-[#063b32] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {match.status !== "LIVE" &&
                        match.status !== "COMPLETED" && (
                          <button
                            onClick={() =>
                              updateStatus(
                                match,
                                "LIVE"
                              )
                            }
                            className="flex items-center gap-2 border-2 border-[#063b32] bg-[#e85a4f] px-4 py-3 text-sm font-black uppercase text-[#fff7e8]"
                          >
                            <Zap size={17} />
                            Start Live
                          </button>
                        )}

                      {match.status === "UPCOMING" && (
                        <button
                          onClick={() =>
                            updateStatus(
                              match,
                              "CANCELLED"
                            )
                          }
                          className="border-2 border-[#063b32] bg-[#d9cebb] px-4 py-3 text-sm font-black uppercase"
                        >
                          Cancel
                        </button>
                      )}

                      {match.status === "COMPLETED" && (
                        <div className="flex items-center gap-2 border-2 border-[#063b32] bg-[#d7c85f] px-4 py-3 text-sm font-black uppercase">
                          <Trophy size={17} />
                          {match.winnerName
                            ? `Winner: ${match.winnerName}`
                            : "DRAW"}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          openEditModal(match)
                        }
                        className="flex h-11 w-11 items-center justify-center border-2 border-[#063b32] bg-[#fff7e8]"
                        title="Edit"
                      >
                        <Edit3 size={19} />
                      </button>

                      <button
                        onClick={() =>
                          deleteMatch(match)
                        }
                        className="flex h-11 w-11 items-center justify-center border-2 border-[#063b32] bg-[#e85a4f] text-[#fff7e8]"
                        title="Delete"
                      >
                        <Trash2 size={19} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#063b32]/75 p-3 sm:p-4">
          <div className="admin-modal-scroll max-h-[94vh] w-full max-w-3xl overflow-y-auto border-2 border-[#063b32] bg-[#f3ead8] shadow-[8px_8px_0_#063b32] sm:shadow-[10px_10px_0_#063b32]">
            <div className="sticky top-0 flex items-center justify-between gap-4 border-b-2 border-[#063b32] bg-[#104c41] px-4 py-5 text-[#fff7e8] sm:px-6 sm:py-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-70 sm:text-sm sm:tracking-[0.2em]">
                  Freshers&apos; Cup
                </p>

                <h2 className="mt-1 text-2xl font-black uppercase sm:text-3xl">
                  {editingMatch
                    ? "Edit Match"
                    : "Add Match"}
                </h2>
              </div>

              <button
                onClick={closeModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#fff7e8] sm:h-11 sm:w-11"
              >
                <X size={21} />
              </button>
            </div>

            <div className="grid gap-5 p-4 sm:gap-6 sm:p-6">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.14em] sm:text-sm">
                  Sport
                </label>

                <select
                  value={form.sportId}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      sportId: e.target.value,
                      teamAId: "",
                      teamBId: "",
                    }))
                  }
                  className="mt-2 w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-base font-black uppercase outline-none"
                >
                  <option value="">
                    SELECT SPORT
                  </option>

                  {sports.map((sport) => (
                    <option
                      key={sport.id}
                      value={sport.id}
                    >
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] sm:text-sm">
                    Team A
                  </label>

                  <select
                    value={form.teamAId}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        teamAId: e.target.value,
                      }))
                    }
                    className="mt-2 w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-base font-black uppercase outline-none"
                  >
                    <option value="">
                      SELECT TEAM A
                    </option>

                    {filteredTeamsForForm.map(
                      (team) => (
                        <option
                          key={team.id}
                          value={team.id}
                        >
                          {team.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] sm:text-sm">
                    Team B
                  </label>

                  <select
                    value={form.teamBId}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        teamBId: e.target.value,
                      }))
                    }
                    className="mt-2 w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-base font-black uppercase outline-none"
                  >
                    <option value="">
                      SELECT TEAM B
                    </option>

                    {filteredTeamsForForm.map(
                      (team) => (
                        <option
                          key={team.id}
                          value={team.id}
                        >
                          {team.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] sm:text-sm">
                    Venue
                  </label>

                  <input
                    value={form.venue}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        venue: e.target.value,
                      }))
                    }
                    placeholder="e.g. Main Ground"
                    className="mt-2 w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-base font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] sm:text-sm">
                    Round
                  </label>

                  <input
                    value={form.roundName}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        roundName: e.target.value,
                      }))
                    }
                    placeholder="e.g. Semi Final"
                    className="mt-2 w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-base font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] sm:text-sm">
                    Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        scheduledAt: e.target.value,
                      }))
                    }
                    className="mt-2 w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-base font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.14em] sm:text-sm">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        status:
                          e.target.value as MatchStatus,
                      }))
                    }
                    className="mt-2 w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-base font-black uppercase outline-none"
                  >
                    {statusOptions.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] sm:text-sm">
                  Score
                </p>

                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold uppercase opacity-55 sm:text-sm">
                      Team A Score
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={form.scoreA}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          scoreA: Math.max(
                            0,
                            Number(e.target.value)
                          ),
                        }))
                      }
                      className="mt-2 w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-2xl font-black outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase opacity-55 sm:text-sm">
                      Team B Score
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={form.scoreB}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          scoreB: Math.max(
                            0,
                            Number(e.target.value)
                          ),
                        }))
                      }
                      className="mt-2 w-full border-2 border-[#063b32] bg-[#fbf5e8] px-4 py-4 text-2xl font-black outline-none"
                    />
                  </div>
                </div>
              </div>

              {form.teamAId &&
                form.teamBId && (
                  <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div className="border-2 border-[#063b32] bg-[#104c41] p-5 text-center text-[#fff7e8]">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">
                        Team A
                      </p>

                      <p className="mt-2 break-words text-lg font-black uppercase sm:text-xl">
                        {
                          filteredTeamsForForm.find(
                            (team) =>
                              String(team.id) ===
                              form.teamAId
                          )?.name
                        }
                      </p>
                    </div>

                    <p className="text-center text-2xl font-black opacity-40 sm:text-3xl">
                      VS
                    </p>

                    <div className="border-2 border-[#063b32] bg-[#104c41] p-5 text-center text-[#fff7e8]">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">
                        Team B
                      </p>

                      <p className="mt-2 break-words text-lg font-black uppercase sm:text-xl">
                        {
                          filteredTeamsForForm.find(
                            (team) =>
                              String(team.id) ===
                              form.teamBId
                          )?.name
                        }
                      </p>
                    </div>
                  </div>
                )}

              {error && (
                <div className="break-words border-2 border-[#063b32] bg-[#e85a4f] px-5 py-4 text-sm font-bold text-[#fff7e8] sm:text-base">
                  {error}
                </div>
              )}

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="border-2 border-[#063b32] bg-[#d9cebb] px-5 py-4 text-base font-black uppercase shadow-[4px_4px_0_#063b32] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={saveMatch}
                  disabled={saving}
                  className="border-2 border-[#063b32] bg-[#104c41] px-5 py-4 text-base font-black uppercase text-[#fff7e8] shadow-[4px_4px_0_#063b32] disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingMatch
                      ? "Save Changes"
                      : "Create Match"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}