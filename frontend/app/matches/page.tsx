import Link from "next/link";

import Navbar from "@/components/layout/Navbar";
import MatchCard from "@/components/MatchCard";
import LiveMatches from "@/components/LiveMatches";

import { api } from "@/lib/api";

export default async function MatchesPage() {
  const [liveMatches, upcomingMatches, completedMatches] =
    await Promise.all([
      api.matches.getLive(),
      api.matches.getUpcoming(),
      api.matches.getCompleted(),
    ]);

  // Sort upcoming matches from earliest to latest
  const sortedUpcoming = [...upcomingMatches].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() -
      new Date(b.scheduledAt).getTime()
  );

  // Sort completed matches from most recent to oldest
  const sortedCompleted = [...completedMatches].sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() -
      new Date(a.scheduledAt).getTime()
  );

  // Group matches by sport.
  // The API may return the sport either as an object or as sportName,
  // so both are handled here.
  const groupBySport = (matches: typeof upcomingMatches) => {
    return matches.reduce(
      (groups, match) => {
        const sportName =
          match.sport?.name ||
          match.sportName ||
          "Other";

        if (!groups[sportName]) {
          groups[sportName] = [];
        }

        groups[sportName].push(match);

        return groups;
      },
      {} as Record<string, typeof upcomingMatches>
    );
  };

  const upcomingBySport = groupBySport(sortedUpcoming);
  const completedBySport = groupBySport(sortedCompleted);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#063b32] pt-20 text-[#f4f0e5]">
      <Navbar />

      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1600px] px-5 pb-12 pt-12 sm:px-8 sm:pb-14 sm:pt-16 lg:px-10 lg:pb-16 lg:pt-20">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="mono-font mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[#ff625b] sm:text-base">
                IIITG FRESHERS&apos; CUP
              </p>

              <h1 className="display-font text-6xl leading-[0.88] tracking-tight sm:text-7xl md:text-8xl">
                MATCH DAY
              </h1>

              <p className="mono-font mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
                Live scores, upcoming fixtures, and results from
                across the cup.
              </p>
            </div>

            <Link
              href="/"
              className="mono-font w-fit text-base font-bold uppercase tracking-wide text-white/65 transition-colors hover:text-[#ff625b]"
            >
              ← Back Home
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          LIVE MATCHES
      ========================================================= */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mono-font mb-2 text-sm font-bold uppercase tracking-[0.16em] text-[#ff625b] sm:text-base">
                RIGHT NOW
              </p>

              <h2 className="display-font text-5xl leading-none sm:text-6xl md:text-7xl">
                Live
              </h2>
            </div>

            <span className="mono-font text-sm font-bold uppercase tracking-[0.12em] text-[#ff625b] sm:text-base">
              ● {liveMatches.length} LIVE
            </span>
          </div>

          <LiveMatches initialMatches={liveMatches} />
        </div>
      </section>

      {/* =========================================================
          UPCOMING MATCHES
      ========================================================= */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="mono-font mb-2 text-sm font-bold uppercase tracking-[0.16em] text-[#ff625b] sm:text-base">
                COMING UP
              </p>

              <h2 className="display-font text-5xl leading-none sm:text-6xl md:text-7xl">
                Upcoming
              </h2>
            </div>

            <span className="mono-font text-sm uppercase tracking-[0.12em] text-white/40 sm:text-base">
              {sortedUpcoming.length}{" "}
              {sortedUpcoming.length === 1 ? "MATCH" : "MATCHES"}
            </span>
          </div>

          {sortedUpcoming.length > 0 ? (
            <div className="space-y-14">
              {Object.entries(upcomingBySport).map(
                ([sportName, matches]) => (
                  <div key={sportName}>
                    {/* Sport heading */}
                    <div className="mb-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-white/10" />

                      <h3 className="mono-font text-base font-bold uppercase tracking-[0.18em] text-[#ff625b] sm:text-lg">
                        {sportName}
                      </h3>

                      <span className="mono-font text-sm font-bold text-white/35 sm:text-base">
                        {matches.length}
                      </span>

                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {/* Matches */}
                    <div className="grid gap-5 lg:grid-cols-2">
                      {matches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="border border-white/15 bg-[#0a443a] px-6 py-16 text-center">
              <p className="mono-font text-base font-bold uppercase tracking-[0.12em] text-white/40">
                No upcoming matches.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          COMPLETED MATCHES / RESULTS
      ========================================================= */}
      <section>
        <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="mono-font mb-2 text-sm font-bold uppercase tracking-[0.16em] text-[#ff625b] sm:text-base">
                THE RECORD
              </p>

              <h2 className="display-font text-5xl leading-none sm:text-6xl md:text-7xl">
                Results
              </h2>
            </div>

            <span className="mono-font text-sm uppercase tracking-[0.12em] text-white/40 sm:text-base">
              {sortedCompleted.length}{" "}
              {sortedCompleted.length === 1 ? "MATCH" : "MATCHES"}
            </span>
          </div>

          {sortedCompleted.length > 0 ? (
            <div className="space-y-14">
              {Object.entries(completedBySport).map(
                ([sportName, matches]) => (
                  <div key={sportName}>
                    {/* Sport heading */}
                    <div className="mb-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-white/10" />

                      <h3 className="mono-font text-base font-bold uppercase tracking-[0.18em] text-[#ff625b] sm:text-lg">
                        {sportName}
                      </h3>

                      <span className="mono-font text-sm font-bold text-white/35 sm:text-base">
                        {matches.length}
                      </span>

                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {/* Completed matches */}
                    <div className="grid gap-5 lg:grid-cols-2">
                      {matches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="border border-white/15 bg-[#0a443a] px-6 py-16 text-center">
              <p className="mono-font text-base font-bold uppercase tracking-[0.12em] text-white/40">
                No results yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}