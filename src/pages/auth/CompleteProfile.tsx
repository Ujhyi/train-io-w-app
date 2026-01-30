import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const AUTH_API = import.meta.env.VITE_USER_API;

const stickOptions = ["LEFT", "RIGHT", "GOALIE"] as const;

async function updateProfile(
    token: string,
    payload: { firstName: string; lastName: string; dateOfBirth: string; stick: string }
): Promise<void> {
    const res = await fetch(`${AUTH_API}/auth/profile`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
            `Profile update failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`
        );
    }
}

const CompleteProfile: React.FC = () => {
    const navigate = useNavigate();

    const [token, setToken] = useState<string | null>(null);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [stick, setStick] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const t = localStorage.getItem("accessToken");
        if (!t) {
            navigate("/login", { replace: true });
            return;
        }
        setToken(t);
    }, [navigate]);

    const canSubmit = useMemo(() => {
        return (
            !!token &&
            firstName.trim().length > 0 &&
            lastName.trim().length > 0 &&
            dateOfBirth.trim().length > 0 &&
            stick.trim().length > 0 &&
            !loading
        );
    }, [token, firstName, lastName, dateOfBirth, stick, loading]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!token) {
            navigate("/login", { replace: true });
            return;
        }

        setLoading(true);
        try {
            await updateProfile(token, {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                dateOfBirth: dateOfBirth.trim(),
                stick: stick.trim(),
            });

            navigate("/", { replace: true });
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Complete Profile</h2>

                {error && <p className="text-red-500 mb-4">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-medium">First name</label>
                        <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            disabled={loading}
                            autoComplete="given-name"
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Last name</label>
                        <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            disabled={loading}
                            autoComplete="family-name"
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Date of birth</label>
                        <input
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Stick</label>
                        <select
                            value={stick}
                            onChange={(e) => setStick(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            disabled={loading}
                        >
                            <option value="">Select...</option>
                            {stickOptions.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full bg-blue-600 disabled:opacity-60 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        {loading ? "Saving..." : "Save profile"}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-600">
                    You need to complete your profile before using the app.
                </p>
            </div>
        </div>
    );
};

export default CompleteProfile;
