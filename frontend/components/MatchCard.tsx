import type { Match } from "@/types/matches";

type MatchCardProps = {
  match: Match;
  compact?: boolean;
};

function formatMatchDate(date: string) {
  const value = new Date(date);

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMatchTime(date: string) {
  const value = new Date(date);

  return value.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMatchResult(match: Match) {
  if (match.status !== "COMPLETED") {
    return null;
  }

  const scoreA = Number(match.scoreA);
  const scoreB = Number(match.scoreB);

  if (scoreA === scoreB) {
    return {
      type: "DRAW" as const,
      name: null,
    };
  }

  if (scoreA > scoreB) {
    return {
      type: "WINNER" as const,
      name: match.teamAName,
    };
  }

  return {
    type: "WINNER" as const,
    name: match.teamBName,
  };
}

export default function MatchCard({
  match,
  compact = false,
}: MatchCardProps) {

  const result = getMatchResult(match);

  return (
    <div
      className={`relative overflow-hidden border border-white/15 bg-[#0d4b40] ${
        compact ? "p-5" : "p-6 sm:p-7"
      }`}
    >
      {/* Decorative corners */}
      <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-[#ff625b]" />

      <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-[#f4b93f]" />

      <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#f4b93f]" />

      <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#ff625b]" />

      {/* Match information */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="mono-font truncate text-xs font-bold uppercase tracking-[0.15em] text-white/40">
            {match.roundName || "MATCH"}
          </p>

          <p className="mono-font mt-2 text-sm uppercase text-white/50">
            {formatMatchDate(match.scheduledAt)} ·{" "}
            {formatMatchTime(match.scheduledAt)}
          </p>
        </div>

        <span
          className={`mono-font shrink-0 text-xs font-bold uppercase tracking-[0.12em] ${
            match.status === "LIVE"
              ? "text-[#ff625b]"
              : match.status === "COMPLETED"
                ? "text-white/50"
                : "text-[#f4b93f]"
          }`}
        >
          {match.status}
        </span>
      </div>

      {/* Teams + score */}
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Team A */}
        <div className="min-w-0">
          <p className="break-words text-lg font-black uppercase leading-tight text-[#f4f0e5] sm:text-xl">
            {match.teamAName}
          </p>

          <p className="mono-font mt-2 text-xs uppercase text-white/35">
            TEAM A
          </p>
        </div>

        {/* Score */}
        <div className="text-center">
          <div className="mono-font text-sm font-bold text-white/35">
            VS
          </div>

          {match.status !== "UPCOMING" && (
            <div className="mono-font mt-2 text-2xl font-black text-[#f4f0e5] sm:text-3xl">
              {match.scoreA} - {match.scoreB}
            </div>
          )}
        </div>

        {/* Team B */}
        <div className="min-w-0 text-right">
          <p className="break-words text-lg font-black uppercase leading-tight text-[#f4f0e5] sm:text-xl">
            {match.teamBName}
          </p>

          <p className="mono-font mt-2 text-xs uppercase text-white/35">
            TEAM B
          </p>
        </div>
      </div>

      {/* Venue + result */}
      {(match.venue || result) && (
        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">

          {match.venue && (
            <p className="mono-font text-xs uppercase tracking-[0.1em] text-white/40">
              {match.venue}
            </p>
          )}

          {result && (
            <p
              className={`mono-font text-xs font-bold uppercase tracking-[0.1em] ${
                result.type === "DRAW"
                  ? "text-[#f4b93f]"
                  : "text-[#f4b93f]"
              }`}
            >
              {result.type === "DRAW"
                ? "DRAW"
                : `WINNER · ${result.name}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}