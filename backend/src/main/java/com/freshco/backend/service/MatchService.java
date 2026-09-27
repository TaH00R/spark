package com.freshco.backend.service;

import com.freshco.backend.dto.MatchCreateRequest;
import com.freshco.backend.dto.MatchResponse;
import com.freshco.backend.dto.MatchScoreRequest;
import com.freshco.backend.dto.MatchStatusRequest;
import com.freshco.backend.entity.Match;
import com.freshco.backend.entity.MatchStatus;
import com.freshco.backend.entity.Sport;
import com.freshco.backend.entity.Team;
import com.freshco.backend.repository.MatchRepository;
import com.freshco.backend.repository.SportRepository;
import com.freshco.backend.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MatchService {

    private final MatchRepository matchRepository;
    private final SportRepository sportRepository;
    private final TeamRepository teamRepository;
    private final StandingService standingService;
    private final MatchWebSocketService matchWebSocketService;

    // =========================================================
    // GET ALL MATCHES
    // =========================================================

    @Transactional(readOnly = true)
    public List<MatchResponse> getAllMatches() {
        return matchRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // GET MATCH BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public MatchResponse getMatchById(Long id) {
        return toResponse(findMatch(id));
    }

    // =========================================================
    // GET LIVE MATCHES
    // =========================================================

    @Transactional(readOnly = true)
    public List<MatchResponse> getLiveMatches() {
        return matchRepository
                .findByStatusOrderByScheduledAtAsc(MatchStatus.LIVE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // GET UPCOMING MATCHES
    // =========================================================

    @Transactional(readOnly = true)
    public List<MatchResponse> getUpcomingMatches() {
        return matchRepository
                .findByStatusOrderByScheduledAtAsc(MatchStatus.UPCOMING)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // GET COMPLETED MATCHES
    // =========================================================

    @Transactional(readOnly = true)
    public List<MatchResponse> getCompletedMatches() {
        return matchRepository
                .findByStatusOrderByScheduledAtAsc(MatchStatus.COMPLETED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // GET MATCHES BY SPORT
    // =========================================================

    @Transactional(readOnly = true)
    public List<MatchResponse> getMatchesBySport(Long sportId) {

        if (!sportRepository.existsById(sportId)) {
            throw new RuntimeException(
                    "Sport not found with id: " + sportId
            );
        }

        return matchRepository
                .findBySportIdOrderByScheduledAtAsc(sportId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // GET LIVE MATCHES BY SPORT
    // =========================================================

    @Transactional(readOnly = true)
    public List<MatchResponse> getLiveMatchesBySport(Long sportId) {

        if (!sportRepository.existsById(sportId)) {
            throw new RuntimeException(
                    "Sport not found with id: " + sportId
            );
        }

        return matchRepository
                .findBySportIdAndStatusOrderByScheduledAtAsc(
                        sportId,
                        MatchStatus.LIVE
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // CREATE MATCH
    // =========================================================

    public MatchResponse createMatch(MatchCreateRequest request) {

        Sport sport = sportRepository
                .findById(request.sportId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Sport not found with id: "
                                        + request.sportId()
                        )
                );

        Team teamA = teamRepository
                .findById(request.teamAId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Team A not found with id: "
                                        + request.teamAId()
                        )
                );

        Team teamB = teamRepository
                .findById(request.teamBId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Team B not found with id: "
                                        + request.teamBId()
                        )
                );

        validateTeams(sport, teamA, teamB);

        Match match = Match.builder()
                .sport(sport)
                .teamA(teamA)
                .teamB(teamB)

                // Scores are stored as strings in your Match entity
                .scoreA("0")
                .scoreB("0")

                .venue(request.venue())
                .roundName(request.roundName())
                .scheduledAt(request.scheduledAt())

                // New matches always start as upcoming
                .status(MatchStatus.UPCOMING)

                .winner(null)
                .build();

        Match savedMatch = matchRepository.save(match);

        return toResponse(savedMatch);
    }

    // =========================================================
    // UPDATE MATCH DETAILS
    // =========================================================

    public MatchResponse updateMatch(
            Long id,
            MatchCreateRequest request
    ) {

        Match match = findMatch(id);

        Sport sport = sportRepository
                .findById(request.sportId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Sport not found with id: "
                                        + request.sportId()
                        )
                );

        Team teamA = teamRepository
                .findById(request.teamAId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Team A not found with id: "
                                        + request.teamAId()
                        )
                );

        Team teamB = teamRepository
                .findById(request.teamBId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Team B not found with id: "
                                        + request.teamBId()
                        )
                );

        validateTeams(sport, teamA, teamB);

        /*
         * Once a match is LIVE or COMPLETED,
         * don't allow changing the sport or teams.
         */
        if (match.getStatus() == MatchStatus.LIVE
                || match.getStatus() == MatchStatus.COMPLETED) {

            boolean sportChanged =
                    !match.getSport().getId().equals(sport.getId());

            boolean teamAChanged =
                    !match.getTeamA().getId().equals(teamA.getId());

            boolean teamBChanged =
                    !match.getTeamB().getId().equals(teamB.getId());

            if (sportChanged || teamAChanged || teamBChanged) {
                throw new IllegalStateException(
                        "Cannot change sport or teams of a live or completed match"
                );
            }
        }

        match.setSport(sport);
        match.setTeamA(teamA);
        match.setTeamB(teamB);
        match.setVenue(request.venue());
        match.setRoundName(request.roundName());
        match.setScheduledAt(request.scheduledAt());

        return toResponse(match);
    }

    // =========================================================
    // UPDATE SCORE
    // =========================================================

    public MatchResponse updateScore(
            Long id,
            MatchScoreRequest request
    ) {

        Match match = findMatch(id);

        /*
         * Scores can only be changed while the match
         * is currently LIVE.
         */
        if (match.getStatus() != MatchStatus.LIVE) {
            throw new IllegalStateException(
                    "Score can only be updated for a live match"
            );
        }

        match.setScoreA(request.scoreA());
        match.setScoreB(request.scoreB());

        /*
         * Broadcast the updated score to connected clients.
         */
        matchWebSocketService.broadcastMatchUpdate(match);

        return toResponse(match);
    }

    // =========================================================
    // UPDATE MATCH STATUS
    // =========================================================

    public MatchResponse updateStatus(
            Long id,
            MatchStatusRequest request
    ) {
        Match match = findMatch(id);

        MatchStatus oldStatus = match.getStatus();
        MatchStatus newStatus = request.status();

        validateStatusTransition(oldStatus, newStatus);

        if (newStatus == MatchStatus.COMPLETED) {

            int scoreA = parseScore(match.getScoreA());
            int scoreB = parseScore(match.getScoreB());

            if (scoreA > scoreB) {

                // Team A wins
                match.setWinner(match.getTeamA());

            } else if (scoreB > scoreA) {

                // Team B wins
                match.setWinner(match.getTeamB());

            } else {

                // Equal score = draw
                match.setWinner(null);
            }

        } else {

            // Only completed matches can have a winner
            match.setWinner(null);
        }

        match.setStatus(newStatus);

        if (oldStatus == MatchStatus.COMPLETED
                || newStatus == MatchStatus.COMPLETED) {

            standingService.recalculateStandings(
                    match.getSport().getId()
            );
        }

        matchWebSocketService.broadcastMatchUpdate(match);

        return toResponse(match);
    }

    // =========================================================
    // DELETE MATCH
    // =========================================================

    public void deleteMatch(Long id) {

        Match match = findMatch(id);

        Long sportId = match.getSport().getId();

        boolean wasCompleted =
                match.getStatus() == MatchStatus.COMPLETED;

        matchRepository.delete(match);

        /*
         * If a completed match is deleted,
         * standings must be recalculated because
         * that match should no longer count.
         */
        if (wasCompleted) {
            standingService.recalculateStandings(
                    sportId
            );
        }

        /*
         * Tell connected clients that the match changed.
         */
        matchWebSocketService.broadcastMatchUpdate(match);
    }

    // =========================================================
    // FIND MATCH
    // =========================================================

    private Match findMatch(Long id) {

        return matchRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Match not found with id: " + id
                        )
                );
    }

    // =========================================================
    // VALIDATE TEAMS
    // =========================================================

    private void validateTeams(
            Sport sport,
            Team teamA,
            Team teamB
    ) {

        /*
         * A team cannot play against itself.
         */
        if (teamA.getId().equals(teamB.getId())) {
            throw new IllegalArgumentException(
                    "A team cannot play against itself"
            );
        }

        /*
         * Team A must belong to the selected sport.
         */
        if (!teamA.getSport().getId().equals(sport.getId())) {
            throw new IllegalArgumentException(
                    "Team A does not belong to this sport"
            );
        }

        /*
         * Team B must belong to the selected sport.
         */
        if (!teamB.getSport().getId().equals(sport.getId())) {
            throw new IllegalArgumentException(
                    "Team B does not belong to this sport"
            );
        }
    }

    // =========================================================
    // VALIDATE STATUS TRANSITION
    // =========================================================

    private void validateStatusTransition(
            MatchStatus oldStatus,
            MatchStatus newStatus
    ) {

        /*
         * No transition needed if status is unchanged.
         */
        if (oldStatus == newStatus) {
            return;
        }

        /*
         * A cancelled match can only be reopened
         * as an upcoming match.
         */
        if (oldStatus == MatchStatus.CANCELLED
                && newStatus != MatchStatus.UPCOMING) {

            throw new IllegalStateException(
                    "A cancelled match can only be reopened as UPCOMING"
            );
        }
    }

    // =========================================================
    // PARSE SCORE
    // =========================================================

    private int parseScore(String score) {

        /*
         * Your Match entity stores scoreA and scoreB
         * as Strings.
         *
         * Convert them safely to integers before
         * comparing them.
         */
        if (score == null || score.isBlank()) {
            return 0;
        }

        try {
            return Integer.parseInt(
                    score.trim()
            );

        } catch (NumberFormatException e) {

            throw new IllegalStateException(
                    "Invalid match score: " + score
            );
        }
    }

    // =========================================================
    // CONVERT ENTITY -> RESPONSE DTO
    // =========================================================

    private MatchResponse toResponse(Match match) {

        Team winner = match.getWinner();

        return new MatchResponse(
                match.getId(),

                match.getSport().getId(),
                match.getSport().getName(),

                match.getTeamA().getId(),
                match.getTeamA().getName(),
                match.getScoreA(),

                match.getTeamB().getId(),
                match.getTeamB().getName(),
                match.getScoreB(),

                match.getVenue(),
                match.getRoundName(),
                match.getScheduledAt(),

                match.getStatus(),

                winner != null
                        ? winner.getId()
                        : null,

                winner != null
                        ? winner.getName()
                        : null
        );
    }
}