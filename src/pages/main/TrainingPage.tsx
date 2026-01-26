import React, { useEffect, useMemo, useRef, useState } from "react";

type TeamMemberItem = {
    teamId: string;
    name: string;
    shortcut?: string;
    clientId?: string;
    pairing?: unknown;
};

type TrainingApiItem = {
    trainingId: string;
    teamId: string;
    teamName: string;
    trainingName: string;
    place: string;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
};

type TrainingItem = TrainingApiItem & {
    startDateTime: Date;
    endDateTime: Date;
};

type CreateTrainingBody = {
    place: string;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    trainingName: string;
};

type Vote = "GOING" | "DECLINED" | "TBD" | null;

type AttendanceStatus = "YES" | "NO" | "TBD";
type AttendanceApiItem = {
    itemId: string;
    clientId: string;
    playerName: string;
    status: AttendanceStatus;
    updatedAt: string;
};

const CORE_API = import.meta.env.VITE_CORE_API;
const INTEGRATION_API = import.meta.env.VITE_INTEGRATION_API;

/* ================= ICONS ================= */

const ThumbUpIcon: React.FC<{ className?: string; title?: string }> = ({ className = "h-5 w-5", title }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={title ? undefined : true}
    >
        {title ? <title>{title}</title> : null}
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
);

const ThumbDownIcon: React.FC<{ className?: string; title?: string }> = ({ className = "h-5 w-5", title }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={title ? undefined : true}
    >
        {title ? <title>{title}</title> : null}
        <path d="M17 14V2" />
        <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
);

/* ================= HELPERS ================= */

function authHeaders() {
    const token = localStorage.getItem("accessToken");
    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function toDate(date: string, time: string) {
    return new Date(`${date}T${time}`);
}

function formatDate(d: Date) {
    return d.toLocaleDateString("sk-SK", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function formatTime(d: Date) {
    return d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
}

function isoWeekKey(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`);
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const year = date.getUTCFullYear();
    return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

function isoWeekLabel(weekKey: string) {
    const [y, w] = weekKey.split("-W");
    return `Week ${w} / ${y}`;
}

function attendanceStatusOfVote(v: Exclude<Vote, null>): AttendanceStatus {
    switch (v) {
        case "GOING":
            return "YES";
        case "DECLINED":
            return "NO";
        case "TBD":
            return "TBD";
    }
}

function voteFromAttendanceStatus(s: "YES" | "NO" | "TBD"): Exclude<Vote, null> {
    switch (s) {
        case "YES":
            return "GOING";
        case "NO":
            return "DECLINED";
        case "TBD":
            return "TBD";
    }
}

function addMinutes(d: Date, mins: number) {
    return new Date(d.getTime() + mins * 60_000);
}

function isHistoryTraining(t: TrainingItem, now: Date) {
    return now.getTime() >= addMinutes(t.startDateTime, 10).getTime();
}

/* ================= COMPONENT ================= */
const Trainings: React.FC = () => {
    const [teams, setTeams] = useState<TeamMemberItem[]>([]);
    const [trainings, setTrainings] = useState<TrainingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showCreate, setShowCreate] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string>("ALL");
    const [showHistory, setShowHistory] = useState(false);

    // hlasovanie (lokálne, nastaví sa až keď klikneš)
    const [voteMap, setVoteMap] = useState<Record<string, Vote>>({});


    // attendance panel
    const [panelOpen, setPanelOpen] = useState(false);
    const [panelTrainingName, setPanelTrainingName] = useState<string | null>(null);
    const [panelTeamId, setPanelTeamId] = useState<string | null>(null);
    const [panelTrainingId, setPanelTrainingId] = useState<string | null>(null);

    const skipNextTeamEffectRef = useRef(false);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState<string | null>(null);
    const [attendanceItems, setAttendanceItems] = useState<AttendanceApiItem[]>([]);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [trainingToDelete, setTrainingToDelete] = useState<TrainingItem | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);


    // attendance cache: trainingId -> list
    const attendanceCacheRef = useRef<Record<string, AttendanceApiItem[]>>({});

    const [nowTick, setNowTick] = useState(() => new Date());

    const [createBody, setCreateBody] = useState<CreateTrainingBody>({
        trainingName: "",
        place: "",
        date: "",
        startTime: "18:00:00",
        endTime: "19:30:00",
        type: "HALA",
    });

    const EMPTY_FORM: CreateTrainingBody = {
        trainingName: "",
        place: "",
        date: "",
        startTime: "18:00:00",
        endTime: "19:30:00",
        type: "HALA",
    };


    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    // StrictMode guard (dev): aby init prebehol len raz
    const didInitRef = useRef(false);

    useEffect(() => {
        const id = setInterval(() => setNowTick(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);


    function getErrorMessage(err: unknown) {
        if (err instanceof Error) return err.message;
        if (typeof err === "string") return err;
        return "Unknown error";
    }

    // ---------- FETCH: teams (iba raz) ----------
    const loadTeamsOnce = async (): Promise<TeamMemberItem[]> => {
        const res = await fetch(`${CORE_API}/teams/member`, { headers: authHeaders() });
        if (res.status === 401) throw new Error("401 Unauthorized – accessToken (Bearer).");
        if (!res.ok) throw new Error(`Teams API error: ${res.status} ${res.statusText}`);

        const json = await res.json();
        const teamsJson: TeamMemberItem[] = Array.isArray(json) ? json : [];
        setTeams(teamsJson);
        return teamsJson;
    };

    // ---------- FETCH: trainings (iba pre 1 teamId) ----------
    const loadTrainingsOnly = async (teamId: string) => {
        setLoading(true);
        setError(null);

        try {
            if (!teamId || teamId === "ALL") {
                setTrainings([]);
                return;
            }

            const res = await fetch(`${INTEGRATION_API}/teams/${teamId}/trainings/get`, {
                headers: authHeaders(),
            });

            if (res.status === 401) throw new Error("401 Unauthorized – trainings get (token).");
            if (!res.ok) throw new Error(`Trainings get failed: ${res.status} ${res.statusText}`);

            const list = (await res.json()) as TrainingApiItem[];

            const merged: TrainingItem[] = list
                .map((t) => ({
                    ...t,
                    startDateTime: toDate(t.date, t.startTime),
                    endDateTime: toDate(t.date, t.endTime),
                }))
                .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

            setTrainings(merged);
        } catch (e: unknown) {
            setTrainings([]);
            setError(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };



    // ---------- INIT: 1x member + 1x trainings ----------
    useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;

        let cancelled = false;

        (async () => {
            try {
                const teamsJson = await loadTeamsOnce();
                if (cancelled) return;

                const first = teamsJson[0]?.teamId ?? "ALL";
                skipNextTeamEffectRef.current = true;
                setSelectedTeamId(first);

                // presne 1x trainings/get (len pre prvy team)
                if (first !== "ALL") {
                    await loadTrainingsOnly(first);
                    await fetchMyAttendanceAndApply(first);
                } else {
                    setTrainings([]);
                    setLoading(false);
                }
            } catch (e: unknown) {
                if (cancelled) return;
                setError(getErrorMessage(e));
                setTeams([]);
                setTrainings([]);
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- CHANGE TEAM: iba trainings/get (nie member) ----------
    useEffect(() => {
        if (!didInitRef.current) return;

        if (skipNextTeamEffectRef.current) {
            skipNextTeamEffectRef.current = false;
            return; // ✅ nedaj druhý fetch
        }

        if (!selectedTeamId || selectedTeamId === "ALL") {
            setTrainings([]);
            setError(null);
            setLoading(false);
            return;
        }

        (async () => {
            await loadTrainingsOnly(selectedTeamId);
            await fetchMyAttendanceAndApply(selectedTeamId);
        })();

    }, [selectedTeamId]);

    // ---------- ATTENDANCE: iba po kliknutí ----------
    const fetchAttendance = async (teamId: string, trainingId: string, force?: boolean) => {
        setAttendanceLoading(true);
        setAttendanceError(null);

        try {
            if (!force) {
                const cached = attendanceCacheRef.current[trainingId];
                if (cached) {
                    setAttendanceItems(cached);
                    return cached;
                }
            }

            const res = await fetch(`${INTEGRATION_API}/teams/${teamId}/trainings/${trainingId}/attendance/get`, {
                headers: authHeaders(),
            });

            if (res.status === 401) throw new Error("401 Unauthorized – attendance get (token).");
            if (!res.ok) throw new Error(`Attendance get failed: ${res.status} ${res.statusText}`);

            const json = (await res.json()) as AttendanceApiItem[];
            attendanceCacheRef.current[trainingId] = json;
            setAttendanceItems(json);
            return json;
        } catch (e: unknown) {
            setAttendanceError(getErrorMessage(e));
            setAttendanceItems([]);
            return null;
        } finally {
            setAttendanceLoading(false);
        }
    };

    const confirmDeleteTraining = async () => {
        if (!trainingToDelete) return;

        setDeleteLoading(true);
        setDeleteError(null);

        try {
            const teamId = trainingToDelete.teamId;
            const trainingId = trainingToDelete.trainingId;

            const res = await fetch(
                `${INTEGRATION_API}/teams/${teamId}/trainings/${trainingId}/delete`,
                {
                    method: "DELETE",
                    headers: authHeaders(),
                }
            );

            if (res.status === 401) throw new Error("401 Unauthorized – delete training (token).");

            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(`Delete failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`);
            }

            setTrainings((prev) => prev.filter((x) => x.trainingId !== trainingId));

            setVoteMap((m) => {
                const copy = { ...m };
                delete copy[trainingId];
                return copy;
            });
            delete attendanceCacheRef.current[trainingId];

            if (panelOpen && panelTrainingId === trainingId) {
                closeAttendancePanel();
            }

            setDeleteOpen(false);
            setTrainingToDelete(null);
        } catch (e: unknown) {
            setDeleteError(getErrorMessage(e));
        } finally {
            setDeleteLoading(false);
        }
    };


    const fetchMyAttendanceAndApply = async (teamId: string) => {
        if (!teamId || teamId === "ALL") {
            setVoteMap({});
            return;
        }

        try {
            const res = await fetch(`${INTEGRATION_API}/teams/${teamId}/trainings/attendance/me`, {
                headers: authHeaders(),
            });

            if (res.status === 401) throw new Error("401 Unauthorized – attendance/me (token).");
            if (!res.ok) throw new Error(`attendance/me failed: ${res.status} ${res.statusText}`);

            const list = (await res.json()) as AttendanceApiItem[];

            const nextMap: Record<string, Vote> = {};
            for (const row of list) {
                nextMap[row.itemId] = voteFromAttendanceStatus(row.status);
            }

            setVoteMap(nextMap);
        } catch (e) {
            console.error(e);
        }
    };

    const updateAttendance = async (teamId: string, trainingId: string, v: Exclude<Vote, null>) => {
        const status = attendanceStatusOfVote(v);

        const res = await fetch(`${INTEGRATION_API}/teams/${teamId}/trainings/${trainingId}/attendance/update`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ status }),
        });

        if (res.status === 401) throw new Error("401 Unauthorized – attendance update (token).");
        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`Attendance update failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`);
        }

        // invalidate cache
        delete attendanceCacheRef.current[trainingId];
    };

    const vote = async (teamId: string, trainingId: string, v: Exclude<Vote, null>) => {
        try {
            setVoteMap((m) => ({ ...m, [trainingId]: v }));

            await updateAttendance(teamId, trainingId, v);

            await fetchMyAttendanceAndApply(teamId);

            if (panelOpen && panelTeamId === teamId && panelTrainingId === trainingId) {
                await fetchAttendance(teamId, trainingId, true);
            }
        } catch (e: unknown) {
            console.error(e);
            alert(getErrorMessage(e));
        }
    };

    const openAttendancePanel = async (teamId: string, trainingId: string, trainingName: string) => {
        setPanelTeamId(teamId);
        setPanelTrainingId(trainingId);
        setPanelTrainingName(trainingName);
        setPanelOpen(true);
        await fetchAttendance(teamId, trainingId);
    };

    const closeAttendancePanel = () => {
        setPanelOpen(false);
        setPanelTrainingName(null);
        setPanelTeamId(null);
        setPanelTrainingId(null);
        setAttendanceItems([]);
        setAttendanceError(null);
        setAttendanceLoading(false);
    };

    const filteredTrainings = useMemo(() => {
        if (selectedTeamId === "ALL") return trainings;
        return trainings.filter((t) => t.teamId === selectedTeamId);
    }, [trainings, selectedTeamId]);

    const { upcomingTrainings, historyTrainings } = useMemo(() => {
        const now = nowTick;
        const upcoming: TrainingItem[] = [];
        const history: TrainingItem[] = [];
        for (const t of filteredTrainings) {
            if (isHistoryTraining(t, now)) history.push(t);
            else upcoming.push(t);
        }
        return { upcomingTrainings: upcoming, historyTrainings: history };
    }, [filteredTrainings, nowTick]);

    const groupedUpcomingByWeek = useMemo(() => {
        const map = new Map<string, TrainingItem[]>();
        for (const t of upcomingTrainings) {
            const key = isoWeekKey(t.date);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
        }
        for (const [, list] of map) list.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
        return Array.from(map.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1));
    }, [upcomingTrainings]);

    const groupedHistoryByWeek = useMemo(() => {
        const map = new Map<string, TrainingItem[]>();
        for (const t of historyTrainings) {
            const key = isoWeekKey(t.date);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
        }
        for (const [, list] of map) list.sort((a, b) => b.startDateTime.getTime() - a.startDateTime.getTime());
        return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [historyTrainings]);

    const canCreate = useMemo(() => {
        if (!selectedTeamId || selectedTeamId === "ALL") return false;
        return (
            createBody.trainingName.trim().length > 0 &&
            createBody.place.trim().length > 0 &&
            createBody.date.trim().length > 0 &&
            createBody.startTime.trim().length > 0 &&
            createBody.endTime.trim().length > 0 &&
            createBody.type.trim().length > 0
        );
    }, [selectedTeamId, createBody]);

    const onCreateTraining = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess(null);

        if (!canCreate) {
            setCreateError("Vyber tím a vyplň všetky polia.");
            return;
        }

        setCreating(true);
        try {
            const res = await fetch(`${INTEGRATION_API}/teams/${selectedTeamId}/trainings/create`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify(createBody),
            });

            if (res.status === 401) throw new Error("401 Unauthorized – create trainings.");
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`Create failed: ${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
            }

            setCreateSuccess("Training has been created.");
            setCreateBody((prev) => ({ ...prev, trainingName: "", place: "", date: "" }));
            setShowCreate(false);
            setCreateBody(EMPTY_FORM);
            loadTrainingsOnly(selectedTeamId);

            setTimeout(() => {
                setCreateSuccess(null);
            }, 2000);

            // refresh trainings len pre current team (1x trainings/get)
            attendanceCacheRef.current = {};
            setVoteMap({});
            await loadTrainingsOnly(selectedTeamId);
            await fetchMyAttendanceAndApply(selectedTeamId);
        } catch (e: unknown) {
            setCreateError(getErrorMessage(e));
        } finally {
            setCreating(false);
        }
    };

    /* ================= UI (tvoje pôvodné UI nechávam) ================= */

    return (
        <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-blue-50 to-white">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6 md:mb-8">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800">Trainings</h1>

                    <button
                        onClick={() => selectedTeamId !== "ALL" && loadTrainingsOnly(selectedTeamId)}
                        className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm shadow-sm"
                        title="Refresh trainings"
                        type="button"
                    >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="hidden xs:inline">Refresh</span>
                    </button>
                </div>

                {/* Create Training (hideable) */}
                <section className="bg-white shadow-xl rounded-2xl p-4 md:p-10 mb-8 md:mb-12 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-700">Create Training</h2>

                        <button
                            type="button"
                            aria-expanded={showCreate}
                            onClick={() => setShowCreate((v) => !v)}
                            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 text-sm shadow-sm"
                            title={showCreate ? "Hide" : "Show"}
                        >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${showCreate ? "bg-indigo-500" : "bg-gray-400"}`} />
                            {showCreate ? "Hide" : "Show"}
                        </button>
                    </div>

                    {!showCreate ? (
                        <p className="text-gray-500 text-sm">Show to display form.</p>
                    ) : (
                        <>
                            {createError && <p className="text-red-500 mb-3">{createError}</p>}
                            {createSuccess && <p className="text-green-600 mb-3">{createSuccess}</p>}

                            <form onSubmit={onCreateTraining} className="grid gap-3 md:gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-600 mb-1">Team</label>
                                    <select
                                        value={selectedTeamId === "ALL" ? "" : selectedTeamId}
                                        onChange={(e) => setSelectedTeamId(e.target.value || "ALL")}
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        required
                                    >
                                        <option value="">-- select team --</option>
                                        {teams.map((t) => (
                                            <option key={t.teamId} value={t.teamId}>
                                                {t.name} {t.shortcut ? `(${t.shortcut})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={createBody.trainingName}
                                        onChange={(e) => setCreateBody((p) => ({ ...p, trainingName: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={createBody.place}
                                        onChange={(e) => setCreateBody((p) => ({ ...p, place: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={createBody.date}
                                        onChange={(e) => setCreateBody((p) => ({ ...p, date: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Type</label>
                                    <select
                                        value={createBody.type}
                                        onChange={(e) => setCreateBody((p) => ({ ...p, type: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        required
                                    >
                                        <option value="HALA">HALA</option>
                                        <option value="GYM">GYM</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        step={1}
                                        value={createBody.startTime}
                                        onChange={(e) =>
                                            setCreateBody((p) => ({
                                                ...p,
                                                startTime: e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value,
                                            }))
                                        }
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        step={1}
                                        value={createBody.endTime}
                                        onChange={(e) =>
                                            setCreateBody((p) => ({
                                                ...p,
                                                endTime: e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value,
                                            }))
                                        }
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={creating || !canCreate}
                                    className="md:col-span-2 mt-1 h-9 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:opacity-60 disabled:cursor-not-allowed w-full"
                                >
                                    {creating ? "Creating..." : "Create Training"}
                                </button>
                            </form>
                        </>
                    )}
                </section>

                {/* ---------------- UPCOMING ---------------- */}
                <section className="bg-white shadow-xl rounded-2xl p-4 md:p-10 mb-8 border border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 md:mb-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Active Trainings</h2>
                            {!loading && !error && <span className="text-sm text-gray-500">({upcomingTrainings.length}) </span>}
                        </div>

                        <select
                            value={selectedTeamId === "ALL" ? "" : selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value || "ALL")}
                            className="h-8 px-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                        >
                            <option value="">Choose Team</option>
                            {teams.map((t) => (
                                <option key={t.teamId} value={t.teamId}>
                                    {t.name} {t.shortcut ? `(${t.shortcut})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : error ? (
                        <p className="text-red-500">{error}</p>
                    ) : groupedUpcomingByWeek.length === 0 ? (
                        <p className="text-gray-500 text-sm">No upcoming trainings.</p>
                    ) : (
                        <div className="space-y-8">
                            {groupedUpcomingByWeek.map(([weekKey, items]) => (
                                <div key={weekKey}>
                                    <div className="flex items-center gap-3 mb-3 md:mb-4">
                                        <h3 className="text-lg md:text-xl font-bold text-gray-800">{isoWeekLabel(weekKey)}</h3>
                                        <span className="text-sm text-gray-500">({items.length})</span>
                                        <span className="ml-auto text-xs text-gray-400 hidden md:inline">Scroll →</span>
                                    </div>

                                    <div className="flex gap-4 md:gap-6 overflow-x-auto pb-2">
                                        {items.map((t) => {
                                            const myVote = voteMap[t.trainingId] ?? null;
                                            const goingActive = myVote === "GOING";
                                            const declinedActive = myVote === "DECLINED";
                                            const tbdActive = myVote === "TBD";

                                            return (
                                                <div
                                                    key={`${t.teamId}-${t.trainingId}`}
                                                    className="relative flex-shrink-0 w-[320px] sm:w-[360px] bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg p-4 md:p-6 transition border border-gray-200 hover:shadow-2xl hover:-translate-y-1"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-lg md:text-xl font-bold text-blue-700">{t.trainingName}</h4>
                                                        <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {t.type}
                            </span>
                                                    </div>

                                                    <p className="text-gray-500 text-xs md:text-sm mb-1">• {t.teamName}</p>
                                                    <p className="text-gray-500 text-xs md:text-sm mb-1">• {formatDate(toDate(t.date, "00:00:00"))}</p>
                                                    <p className="text-gray-500 text-xs md:text-sm mb-1">
                                                        • {formatTime(t.startDateTime)} — {formatTime(t.endDateTime)}
                                                    </p>
                                                    <p className="text-gray-500 text-xs md:text-sm mb-1">• {t.place}</p>

                                                    <div className="mt-3 sm:mt-4">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => vote(t.teamId, t.trainingId, "GOING")}
                                                                aria-pressed={goingActive}
                                                                className={[
                                                                    "group inline-flex items-center gap-2 rounded-full px-3 py-2 transition shadow-sm border",
                                                                    goingActive
                                                                        ? "bg-green-600 text-white border-green-600"
                                                                        : "border-green-200 bg-white text-green-700 hover:bg-green-50 hover:border-green-300",
                                                                ].join(" ")}
                                                                title="I'm going"
                                                            >
                                <span
                                    className={[
                                        "inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full",
                                        goingActive ? "bg-white/20" : "bg-green-600/10 group-hover:bg-green-600/20",
                                    ].join(" ")}
                                >
                                  <ThumbUpIcon className={goingActive ? "h-5 w-5 text-white" : "h-5 w-5 text-green-600"} />
                                </span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => vote(t.teamId, t.trainingId, "DECLINED")}
                                                                aria-pressed={declinedActive}
                                                                className={[
                                                                    "group inline-flex items-center gap-2 rounded-full px-3 py-2 transition shadow-sm border",
                                                                    declinedActive
                                                                        ? "bg-red-600 text-white border-red-600"
                                                                        : "border-red-200 bg-white text-red-700 hover:bg-red-50 hover:border-red-300",
                                                                ].join(" ")}
                                                                title="Decline"
                                                            >
                                <span
                                    className={[
                                        "inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full",
                                        declinedActive ? "bg-white/20" : "bg-red-600/10 group-hover:bg-red-600/20",
                                    ].join(" ")}
                                >
                                  <ThumbDownIcon className={declinedActive ? "h-5 w-5 text-white" : "h-5 w-5 text-red-600"} />
                                </span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => vote(t.teamId, t.trainingId, "TBD")}
                                                                aria-pressed={tbdActive}
                                                                className={[
                                                                    "group inline-flex items-center gap-2 rounded-full px-3 py-2 transition shadow-sm border",
                                                                    tbdActive
                                                                        ? "bg-yellow-400 text-yellow-950 border-yellow-500"
                                                                        : "border-yellow-200 bg-white text-yellow-800 hover:bg-yellow-50 hover:border-yellow-300",
                                                                ].join(" ")}
                                                                title="TBD"
                                                            >
                                <span
                                    className={[
                                        "inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full font-bold text-[10px]",
                                        tbdActive ? "bg-black/10" : "bg-yellow-400/20 group-hover:bg-yellow-400/30",
                                    ].join(" ")}
                                >
                                  TBD
                                </span>
                                                            </button>
                                                        </div>

                                                        <div className="mt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openAttendancePanel(t.teamId, t.trainingId, t.trainingName)}
                                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50 transition shadow-sm"
                                                                title="Show attendance"
                                                            >
                                                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                                                <span className="text-sm font-medium hidden sm:inline">Attendance</span>
                                                                <span className="text-sm font-medium sm:hidden">Attnd.</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 md:mt-4 pt-3 border-t border-gray-200/70">
                                                        <p className="text-gray-400 text-[11px]">Training ID: {t.trainingId}</p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="absolute bottom-5 right-5 text-red-600 hover:text-red-700 transition"
                                                        onClick={() => {
                                                            setDeleteError(null);
                                                            setTrainingToDelete(t);
                                                            setDeleteOpen(true);
                                                        }}
                                                        title="Delete Training"
                                                        aria-label={`Delete training ${t.trainingId}`}

                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-5 w-5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4"
                                                            />
                                                        </svg>
                                                    </button>

                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ---------------- HISTORY ---------------- */}
                <section className="bg-white shadow-xl rounded-2xl p-4 md:p-10 mb-10 md:mb-12 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">History Trainings</h2>
                        {!loading && !error && <span className="text-sm text-gray-500">({historyTrainings.length})</span>}

                        <button
                            type="button"
                            aria-expanded={showHistory}
                            onClick={() => setShowHistory((v) => !v)}
                            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 text-sm shadow-sm"
                            title={showHistory ? "Hide history" : "Show history"}
                        >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${showHistory ? "bg-indigo-500" : "bg-gray-400"}`} />
                            {showHistory ? "Hide" : "Show"}
                        </button>
                    </div>

                    {!showHistory ? (
                        <p className="text-gray-500 text-sm">No trainings history.</p>
                    ) : loading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : error ? (
                        <p className="text-red-500">{error}</p>
                    ) : groupedHistoryByWeek.length === 0 ? (
                        <p className="text-gray-600">No history trainings.</p>
                    ) : (
                        <div className="space-y-8">
                            {groupedHistoryByWeek.map(([weekKey, items]) => (
                                <div key={weekKey}>
                                    <div className="flex items-center gap-3 mb-3 md:mb-4">
                                        <h3 className="text-lg md:text-xl font-bold text-gray-800">{isoWeekLabel(weekKey)}</h3>
                                        <span className="text-sm text-gray-500">({items.length})</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                        {items.map((t) => (
                                            <div
                                                key={`${t.teamId}-${t.trainingId}`}
                                                className="relative rounded-2xl border border-neutral-300 bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 p-4 md:p-6 shadow-lg"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-lg md:text-xl font-bold text-gray-700">{t.trainingName}</h4>
                                                    <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                            Ended
                          </span>
                                                </div>

                                                <p className="text-gray-500 text-xs md:text-sm mb-1">• {t.teamName}</p>
                                                <p className="text-gray-500 text-xs md:text-sm mb-1">• {formatDate(toDate(t.date, "00:00:00"))}</p>
                                                <p className="text-gray-500 text-xs md:text-sm mb-1">
                                                    • {formatTime(t.startDateTime)} — {formatTime(t.endDateTime)}
                                                </p>
                                                <p className="text-gray-500 text-xs md:text-sm mb-1">• {t.place}</p>

                                                <div className="mt-3 sm:mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => openAttendancePanel(t.teamId, t.trainingId, t.trainingName)}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50 transition shadow-sm"
                                                        title="Show attendance"
                                                    >
                                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                                        <span className="text-sm font-medium hidden sm:inline">Attendance</span>
                                                        <span className="text-sm font-medium sm:hidden">Attnd.</span>
                                                    </button>
                                                </div>

                                                <div className="mt-3 pt-3 border-t border-gray-400/40">
                                                    <p className="text-gray-500 text-[11px]">Training ID: {t.trainingId}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* -------------------- RIGHT SLIDE-OVER PANEL -------------------- */}
            {panelOpen && (
                <>
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] opacity-100 transition-opacity" onClick={closeAttendancePanel} />

                    <aside
                        role="dialog"
                        aria-modal="true"
                        className="fixed inset-y-0 right-0 w-full max-w-full sm:max-w-md bg-white shadow-2xl border-l border-gray-200 translate-x-0 transition-transform"
                    >
                        <div className="h-full flex flex-col">
                            <div className="flex items-center gap-3 px-4 md:px-5 py-3 md:py-4 border-b">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 inline-block" />
                                </div>

                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 truncate">Attendance</h3>
                                    {panelTrainingName && <p className="text-xs text-gray-500 truncate">{panelTrainingName}</p>}
                                </div>

                                <div className="ml-auto flex items-center gap-2">
                                    <button
                                        onClick={() => panelTeamId && panelTrainingId && fetchAttendance(panelTeamId, panelTrainingId, true)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition shadow-sm"
                                        title="Refresh"
                                        type="button"
                                    >
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                                        <span className="hidden sm:inline">Refresh</span>
                                    </button>

                                    <button
                                        onClick={closeAttendancePanel}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition shadow-sm"
                                        title="Close"
                                        type="button"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 md:p-5 overflow-y-auto">
                                {attendanceLoading ? (
                                    <p className="text-gray-500">Loading attendance...</p>
                                ) : attendanceError ? (
                                    <p className="text-red-500">{attendanceError}</p>
                                ) : (
                                    <div className="grid gap-4">
                                        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="h-2 w-2 rounded-full bg-green-600" />
                                                <h4 className="font-bold text-green-800">YES</h4>
                                                <span className="text-xs text-green-700">({attendanceItems.filter((x) => x.status === "YES").length})</span>
                                            </div>
                                            <ul className="space-y-1">
                                                {attendanceItems
                                                    .filter((x) => x.status === "YES")
                                                    .map((p) => (
                                                        <li key={p.itemId} className="text-sm text-green-900">
                                                            {p.playerName}
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>

                                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="h-2 w-2 rounded-full bg-red-600" />
                                                <h4 className="font-bold text-red-800">NO</h4>
                                                <span className="text-xs text-red-700">({attendanceItems.filter((x) => x.status === "NO").length})</span>
                                            </div>
                                            <ul className="space-y-1">
                                                {attendanceItems
                                                    .filter((x) => x.status === "NO")
                                                    .map((p) => (
                                                        <li key={p.itemId} className="text-sm text-red-900">
                                                            {p.playerName}
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>

                                        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                                                <h4 className="font-bold text-yellow-800">TBD</h4>
                                                <span className="text-xs text-yellow-700">({attendanceItems.filter((x) => x.status === "TBD").length})</span>
                                            </div>
                                            <ul className="space-y-1">
                                                {attendanceItems
                                                    .filter((x) => x.status === "TBD")
                                                    .map((p) => (
                                                        <li key={p.itemId} className="text-sm text-yellow-900">
                                                            {p.playerName}
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </>
            )}
            {deleteOpen && trainingToDelete && (
                <>
                    {/* overlay */}
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
                        onClick={() => {
                            if (deleteLoading) return;
                            setDeleteOpen(false);
                            setTrainingToDelete(null);
                            setDeleteError(null);
                        }}
                    />

                    {/* modal */}
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
                            <div className="p-5 border-b border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800">Delete training?</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Are you sure you want to delete{" "}
                                    <span className="font-semibold">{trainingToDelete.trainingName}</span>?
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    ID: {trainingToDelete.trainingId}
                                </p>
                            </div>

                            <div className="p-5">
                                {deleteError && (
                                    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {deleteError}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        disabled={deleteLoading}
                                        onClick={() => {
                                            setDeleteOpen(false);
                                            setTrainingToDelete(null);
                                            setDeleteError(null);
                                        }}
                                        className="rounded-xl border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                    >
                                        No
                                    </button>

                                    <button
                                        type="button"
                                        disabled={deleteLoading}
                                        onClick={confirmDeleteTraining}
                                        className="rounded-xl bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                                    >
                                        {deleteLoading ? "Deleting..." : "Yes, delete"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

        </div>
    );
};

export default Trainings;