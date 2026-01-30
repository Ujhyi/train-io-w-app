import React, { useEffect, useMemo, useState } from "react";

type OwnedTeamItem = {
    teamId: string;
    name: string;
    shortcut?: string;
    category?: string;
    clientId?: string;
    pairing?: string | null;
};

type PlayerItem = {
    clientId: string;
    fullName: string;
    position: string;
    number: number;
    stick: string;
};

type CreateTeamBody = {
    name: string;
    shortcut: string;
    category: string;
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

const EMPTY_CREATE: CreateTeamBody = {
    name: "",
    shortcut: "",
    category: "MEX",
};

const OwnedTeamsPage: React.FC = () => {
    // create
    const [showCreate, setShowCreate] = useState(false);
    const [createBody, setCreateBody] = useState<CreateTeamBody>({ ...EMPTY_CREATE });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    // owned teams
    const [ownedTeams, setOwnedTeams] = useState<OwnedTeamItem[]>([]);
    const [ownedLoading, setOwnedLoading] = useState(true);
    const [ownedError, setOwnedError] = useState<string | null>(null);

    // players
    const [playersOpenForTeamId, setPlayersOpenForTeamId] = useState<string | null>(null);
    const [playersLoading, setPlayersLoading] = useState(false);
    const [playersError, setPlayersError] = useState<string | null>(null);
    const [players, setPlayers] = useState<PlayerItem[]>([]);

    // delete modal
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTeam, setDeleteTeam] = useState<OwnedTeamItem | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const canCreate = useMemo(() => {
        return (
            createBody.name.trim().length > 0 &&
            createBody.shortcut.trim().length > 0 &&
            createBody.category.trim().length > 0
        );
    }, [createBody]);

    const loadOwnedTeams = async () => {
        setOwnedLoading(true);
        setOwnedError(null);

        try {
            const res = await fetch(`${CORE_API}/teams/owned`, { headers: authHeaders() });
            if (res.status === 401) throw new Error("401 Unauthorized – accessToken (Bearer).");
            if (!res.ok) throw new Error(`Owned teams failed: ${res.status} ${res.statusText}`);

            const json = await res.json();
            setOwnedTeams(Array.isArray(json) ? (json as OwnedTeamItem[]) : []);
        } catch (e: unknown) {
            setOwnedTeams([]);
            setOwnedError(getErrorMessage(e));
        } finally {
            setOwnedLoading(false);
        }
    };

    useEffect(() => {
        loadOwnedTeams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadPlayers = async (teamId: string) => {
        setPlayersLoading(true);
        setPlayersError(null);

        try {
            const res = await fetch(`${CORE_API}/teams/${teamId}/players`, { headers: authHeaders() });
            if (res.status === 401) throw new Error("401 Unauthorized – accessToken (Bearer).");
            if (!res.ok) throw new Error(`Players failed: ${res.status} ${res.statusText}`);

            const json = await res.json();
            setPlayers(Array.isArray(json) ? (json as PlayerItem[]) : []);
            setPlayersOpenForTeamId(teamId);
        } catch (e: unknown) {
            setPlayers([]);
            setPlayersOpenForTeamId(teamId);
            setPlayersError(getErrorMessage(e));
        } finally {
            setPlayersLoading(false);
        }
    };

    const closePlayers = () => {
        setPlayersOpenForTeamId(null);
        setPlayers([]);
        setPlayersError(null);
        setPlayersLoading(false);
    };

    const onCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess(null);

        if (!canCreate) {
            setCreateError("Fill name, shortcut and category.");
            return;
        }

        setCreating(true);
        try {
            const res = await fetch(`${CORE_API}/teams/create`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify(createBody),
            });

            if (res.status === 401) throw new Error("401 Unauthorized – create team (token).");
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(`Create failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`);
            }

            setCreateSuccess("Team has been created.");
            setCreateBody({ ...EMPTY_CREATE });
            setShowCreate(false);

            await loadOwnedTeams();

            window.setTimeout(() => setCreateSuccess(null), 2000);
        } catch (e: unknown) {
            setCreateError(getErrorMessage(e));
        } finally {
            setCreating(false);
        }
    };

    // delete helpers
    const openDeleteDialog = (team: OwnedTeamItem) => {
        setDeleteError(null);
        setDeleteTeam(team);
        setDeleteDialogOpen(true);
    };

    const closeDeleteDialog = () => {
        if (deleteLoading) return;
        setDeleteDialogOpen(false);
        setDeleteTeam(null);
        setDeleteError(null);
    };

    const confirmDeleteTeam = async () => {
        if (!deleteTeam) return;

        setDeleteLoading(true);
        setDeleteError(null);

        try {
            const res = await fetch(`${CORE_API}/teams/delete/${deleteTeam.teamId}`, {
                method: "DELETE",
                headers: authHeaders(),
            });

            if (res.status === 401) throw new Error("401 Unauthorized – accessToken (Bearer).");
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(`Delete failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`);
            }

            setOwnedTeams((prev) => prev.filter((t) => t.teamId !== deleteTeam.teamId));
            closeDeleteDialog();
        } catch (e: unknown) {
            setDeleteError(getErrorMessage(e));
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 p-6 w-full">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6 md:mb-8">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800">
                        Owned Teams
                    </h1>

                    <button
                        onClick={loadOwnedTeams}
                        className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm shadow-sm"
                        title="Refresh"
                        type="button"
                    >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="hidden xs:inline">Refresh</span>
                    </button>
                </div>

                {/* Create Team */}
                <section className="bg-white shadow-xl rounded-2xl p-4 md:p-10 mb-8 md:mb-12 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-700">Create Team</h2>

                        <button
                            type="button"
                            aria-expanded={showCreate}
                            onClick={() => setShowCreate((v) => !v)}
                            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 text-sm shadow-sm"
                            title={showCreate ? "Hide" : "Show"}
                        >
              <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                      showCreate ? "bg-indigo-500" : "bg-gray-400"
                  }`}
              />
                            {showCreate ? "Hide" : "Show"}
                        </button>
                    </div>

                    {!showCreate ? (
                        <p className="text-gray-500 text-sm">Show to display create team form.</p>
                    ) : (
                        <>
                            {createError && <p className="text-red-500 mb-3">{createError}</p>}
                            {createSuccess && <p className="text-green-600 mb-3">{createSuccess}</p>}

                            <form onSubmit={onCreateTeam} className="grid gap-3 md:gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={createBody.name}
                                        onChange={(e) => setCreateBody((p) => ({ ...p, name: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Shortcut</label>
                                    <input
                                        type="text"
                                        value={createBody.shortcut}
                                        onChange={(e) => setCreateBody((p) => ({ ...p, shortcut: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm text-gray-600 mb-1">Category</label>
                                    <select
                                        value={createBody.category}
                                        onChange={(e) => setCreateBody((p) => ({ ...p, category: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        required
                                    >
                                        <option value="MEX">MEX</option>
                                        <option value="JEX">JEX</option>
                                        <option value="Dor">Dor</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={creating || !canCreate}
                                    className="md:col-span-2 mt-1 h-9 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:opacity-60 disabled:cursor-not-allowed w-full"
                                >
                                    {creating ? "Creating..." : "Create Team"}
                                </button>
                            </form>
                        </>
                    )}
                </section>

                {/* Owned Teams list */}
                <section className="bg-white shadow-xl rounded-2xl p-4 md:p-10 mb-10 md:mb-12 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">My Teams</h2>
                        {!ownedLoading && !ownedError && (
                            <span className="text-sm text-gray-500">({ownedTeams.length})</span>
                        )}
                    </div>

                    {ownedLoading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : ownedError ? (
                        <p className="text-red-500">{ownedError}</p>
                    ) : ownedTeams.length === 0 ? (
                        <p className="text-gray-500 text-sm">You don't own any team yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:gap-6">
                            {ownedTeams.map((t) => {
                                const playersOpen = playersOpenForTeamId === t.teamId;

                                return (
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

                                        {t.category ? (
                                            <p className="text-gray-500 text-xs md:text-sm mb-1">• Category: {t.category}</p>
                                        ) : null}

                                        {t.pairing ? (
                                            <p className="text-gray-500 text-xs md:text-sm mb-1">• Join token: {t.pairing}</p>
                                        ) : null}

                                        <div className="mt-3 pt-3 border-t border-gray-200/70 flex items-center justify-between gap-3">
                                            <p className="text-gray-400 text-[11px]">Team ID: {t.teamId}</p>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteDialog(t)}
                                                    className="rounded-xl border border-red-200 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 transition shadow-sm"
                                                >
                                                    Delete
                                                </button>

                                                {!playersOpen ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => loadPlayers(t.teamId)}
                                                        className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 transition shadow-sm"
                                                    >
                                                        Players
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={closePlayers}
                                                        className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 transition shadow-sm"
                                                    >
                                                        Hide
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Players block */}
                                        {playersOpen ? (
                                            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                                    <h4 className="font-bold text-gray-800">Players</h4>
                                                    <span className="ml-auto text-xs text-gray-500">
                            {playersLoading ? "Loading..." : `(${players.length})`}
                          </span>
                                                </div>

                                                {playersLoading ? (
                                                    <p className="text-gray-500 text-sm">Loading players...</p>
                                                ) : playersError ? (
                                                    <p className="text-red-500 text-sm">{playersError}</p>
                                                ) : players.length === 0 ? (
                                                    <p className="text-gray-500 text-sm">No players.</p>
                                                ) : (
                                                    <div className="grid gap-2">
                                                        {players.map((p) => (
                                                            <div
                                                                key={p.clientId}
                                                                className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                                                            >
                                                                <div className="text-sm text-gray-800 font-medium">{p.fullName}</div>
                                                                <div className="text-xs text-gray-600 flex gap-3">
                                                                    <span>#{p.number}</span>
                                                                    <span>{p.position}</span>
                                                                    <span>{p.stick}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* Delete modal */}
            {deleteDialogOpen && deleteTeam && (
                <>
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px]" onClick={closeDeleteDialog} />

                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
                            <div className="p-5 border-b border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800">Delete team?</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Are you sure you want to delete <span className="font-semibold">{deleteTeam.name}</span>?
                                </p>
                                <p className="text-xs text-gray-400 mt-1">ID: {deleteTeam.teamId}</p>
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
                                        onClick={closeDeleteDialog}
                                        className="rounded-xl border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                    >
                                        No
                                    </button>

                                    <button
                                        type="button"
                                        disabled={deleteLoading}
                                        onClick={confirmDeleteTeam}
                                        className="rounded-xl bg-red-600 hover:bg-red-700 px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
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

export default OwnedTeamsPage;
