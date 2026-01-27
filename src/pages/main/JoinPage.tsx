import React, { useEffect, useMemo, useState } from "react";

type TeamMemberItem = {
    teamId: string;
    name: string;
    shortcut?: string;
    category?: string;
    clientId?: string;
    pairing?: unknown;
    owner?: string;
};

type TeamAction = "LEAVE" | "DELETE";

type JoinBody = {
    position: string;
    number: number;
    stick: "LEFT" | "RIGHT";
};

const CORE_API = import.meta.env.VITE_CORE_API;


function authHeaders() {
    const token = localStorage.getItem("accessToken");
    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function getErrorMessage(err: unknown) {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "Unknown error";
}

const EMPTY_JOIN_FORM: JoinBody = {
    position: "C",
    number: 19,
    stick: "LEFT",
};

const JoinPage: React.FC = () => {
    // token iba z formularu
    const [joinToken, setJoinToken] = useState("");

    const [form, setForm] = useState<JoinBody>(EMPTY_JOIN_FORM);

    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

    const [teams, setTeams] = useState<TeamMemberItem[]>([]);
    const [teamsLoading, setTeamsLoading] = useState(false);
    const [teamsError, setTeamsError] = useState<string | null>(null);

    const [teamDialogOpen, setTeamDialogOpen] = useState(false);
    const [teamDialogAction, setTeamDialogAction] = useState<TeamAction>("LEAVE");
    const [teamDialogTeam, setTeamDialogTeam] = useState<TeamMemberItem | null>(null);

    const [teamActionLoading, setTeamActionLoading] = useState(false);
    const [teamActionError, setTeamActionError] = useState<string | null>(null);

    const canSubmit = useMemo(() => {
        return (
            joinToken.trim().length > 0 &&
            form.position.trim().length > 0 &&
            Number.isFinite(form.number) &&
            form.number > 0 &&
            !!form.stick
        );
    }, [joinToken, form]);

    const loadMemberTeams = async () => {
        setTeamsLoading(true);
        setTeamsError(null);
        try {
            const res = await fetch(`${CORE_API}/teams/member`, { headers: authHeaders() });
            if (res.status === 401) throw new Error("401 Unauthorized – missing/invalid accessToken.");
            if (!res.ok) throw new Error(`Teams/member failed: ${res.status} ${res.statusText}`);

            const json = await res.json();
            setTeams(Array.isArray(json) ? (json as TeamMemberItem[]) : []);
        } catch (e) {
            setTeams([]);
            setTeamsError(getErrorMessage(e));
        } finally {
            setTeamsLoading(false);
        }
    };

    useEffect(() => {
        loadMemberTeams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setJoinError(null);
        setJoinSuccess(null);

        if (!canSubmit) {
            setJoinError("Fill token and all fields.");
            return;
        }

        setJoining(true);
        try {
            const res = await fetch(`${CORE_API}/teams/join/${encodeURIComponent(joinToken.trim())}`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify(form),
            });

            if (res.status === 401) throw new Error("401 Unauthorized – missing/invalid accessToken.");
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(`Join failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`);
            }

            setJoinSuccess("Joined successfully.");
            setTimeout(() => setJoinSuccess(null), 3000);

            // vycisti formular
            setJoinToken("");
            setForm(EMPTY_JOIN_FORM);

            // refresh team list
            await loadMemberTeams();
        } catch (e) {
            setJoinError(getErrorMessage(e));
        } finally {
            setJoining(false);
        }
    };

    const openTeamDialog = (team: TeamMemberItem, action: TeamAction) => {
        setTeamActionError(null);
        setTeamDialogTeam(team);
        setTeamDialogAction(action);
        setTeamDialogOpen(true);
    };

    const closeTeamDialog = () => {
        if (teamActionLoading) return;
        setTeamDialogOpen(false);
        setTeamDialogTeam(null);
        setTeamActionError(null);
    };

    const confirmTeamAction = async () => {
        if (!teamDialogTeam) return;

        setTeamActionLoading(true);
        setTeamActionError(null);

        try {
            const teamId = teamDialogTeam.teamId;

            const endpoint =
                teamDialogAction === "LEAVE"
                    ? `${CORE_API}/teams/leave/${teamId}`
                    : `${CORE_API}/teams/delete/${teamId}`;

            const res = await fetch(endpoint, {
                method: "DELETE",
                headers: authHeaders(),
            });

            if (res.status === 401) throw new Error("401 Unauthorized (token).");

            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(
                    `${teamDialogAction} failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`
                );
            }

            // odstráň tím z UI
            setTeams((prev) => prev.filter((t) => t.teamId !== teamId));

            closeTeamDialog();
        } catch (e: unknown) {
            setTeamActionError(getErrorMessage(e));
        } finally {
            setTeamActionLoading(false);
        }
    };


    return (
        <div className="bg-gray-100 p-6 w-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6 md:mb-8">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800">Join Team</h1>

                    <button
                        onClick={loadMemberTeams}
                        className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm shadow-sm"
                        title="Refresh teams"
                        type="button"
                    >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="hidden xs:inline">Refresh</span>
                    </button>
                </div>

                {/* Join Form */}
                <section className="bg-white shadow-xl rounded-2xl p-4 md:p-10 mb-8 md:mb-12 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-700">Join via Token</h2>
                    </div>

                    {joinError && <p className="text-red-500 mb-3">{joinError}</p>}
                    {joinSuccess && <p className="text-green-600 mb-3">{joinSuccess}</p>}

                    <form onSubmit={onJoin} className="grid gap-3 md:gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="block text-sm text-gray-600 mb-1">Invite Token</label>
                            <input
                                type="text"
                                value={joinToken}
                                onChange={(e) => setJoinToken(e.target.value)}
                                placeholder="Paste invite token here"
                                className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Position</label>
                            <select
                                value={form.position}
                                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                                className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                required
                            >
                                <option value="C">C</option>
                                <option value="LW">LW</option>
                                <option value="RW">RW</option>
                                <option value="D">D</option>
                                <option value="G">G</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Number</label>
                            <input
                                type="number"
                                min={1}
                                value={form.number}
                                onChange={(e) => setForm((p) => ({ ...p, number: Number(e.target.value) }))}
                                className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm text-gray-600 mb-1">Stick</label>
                            <select
                                value={form.stick}
                                onChange={(e) => setForm((p) => ({ ...p, stick: e.target.value as JoinBody["stick"] }))}
                                className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                required
                            >
                                <option value="LEFT">LEFT</option>
                                <option value="RIGHT">RIGHT</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={joining || !canSubmit}
                            className="md:col-span-2 mt-1 h-9 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:opacity-60 disabled:cursor-not-allowed w-full"
                        >
                            {joining ? "Joining..." : "Join Team"}
                        </button>
                    </form>
                </section>

                {/* Member Teams */}
                <section className="bg-white shadow-xl rounded-2xl p-4 md:p-10 mb-10 md:mb-12 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">My Teams</h2>
                        {!teamsLoading && !teamsError && <span className="text-sm text-gray-500">({teams.length})</span>}
                    </div>

                    {teamsLoading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : teamsError ? (
                        <p className="text-red-500">{teamsError}</p>
                    ) : teams.length === 0 ? (
                        <p className="text-gray-500 text-sm">No teams yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:gap-6">                            {teams.map((t) => (
                                <div
                                    key={t.teamId}
                                    className="relative bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg p-4 md:p-6 transition border border-gray-200"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg md:text-xl font-bold text-blue-700">{t.name}</h3>
                                        {t.shortcut ? (
                                            <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {t.shortcut}
                      </span>
                                        ) : null}
                                    </div>

                                    {t.owner ? <p className="text-gray-500 text-xs md:text-sm mb-1">• Owner: {t.owner}</p> : null}
                                    {t.category ? <p className="text-gray-500 text-xs md:text-sm mb-1">• Category: {t.category}</p> : null}
                                    {t.clientId ? <p className="text-gray-500 text-xs md:text-sm mb-1">• Client: {t.clientId}</p> : null}

                                    <div className="mt-3 pt-3 border-t border-gray-200/70 flex items-center justify-between gap-3">
                                        <p className="text-gray-400 text-[11px]">Team ID: {t.teamId}</p>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openTeamDialog(t, "LEAVE")}
                                                className="rounded-xl border border-yellow-200 px-3 py-1 text-xs text-yellow-800 hover:bg-yellow-50 transition disabled:opacity-60"
                                            >
                                                Leave
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => openTeamDialog(t, "DELETE")}
                                                className="rounded-xl border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 transition disabled:opacity-60"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
            {teamDialogOpen && teamDialogTeam && (
                <>
                    {/* overlay */}
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
                        onClick={closeTeamDialog}
                    />

                    {/* modal */}
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
                            <div className="p-5 border-b border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {teamDialogAction === "DELETE" ? "Delete team?" : "Leave team?"}
                                </h3>

                                <p className="text-sm text-gray-600 mt-1">
                                    Are you sure you want to{" "}
                                    <span className="font-semibold">
              {teamDialogAction === "DELETE" ? "delete" : "leave"}
            </span>{" "}
                                    <span className="font-semibold">{teamDialogTeam.name}</span>?
                                </p>

                                <p className="text-xs text-gray-400 mt-1">ID: {teamDialogTeam.teamId}</p>
                            </div>

                            <div className="p-5">
                                {teamActionError && (
                                    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {teamActionError}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        disabled={teamActionLoading}
                                        onClick={closeTeamDialog}
                                        className="rounded-xl border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                    >
                                        No
                                    </button>

                                    <button
                                        type="button"
                                        disabled={teamActionLoading}
                                        onClick={confirmTeamAction}
                                        className={[
                                            "rounded-xl px-3 py-1 text-sm font-medium text-white disabled:opacity-60",
                                            teamDialogAction === "DELETE" ? "bg-red-600 hover:bg-red-700" : "bg-yellow-500 hover:bg-yellow-600",
                                        ].join(" ")}
                                    >
                                        {teamActionLoading
                                            ? "Working..."
                                            : teamDialogAction === "DELETE"
                                                ? "Yes, delete"
                                                : "Yes, leave"}
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

export default JoinPage;
