import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

interface LoginProps {
    onLogin: () => void;
}

type LoginResponse = {
    clientId: string;
    accessToken: string;
    refreshToken?: string;
};

type ProfileResponse = {
    clientId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    stick: string | null;
    profileCompleted: boolean;
};

const AUTH_API = import.meta.env.VITE_USER_API;

/* ---------------- API helpers ---------------- */

async function login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${AUTH_API}/auth/login`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Login failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`);
    }

    const json = (await res.json()) as LoginResponse;

    if (!json?.accessToken) {
        throw new Error("Login failed: missing accessToken in response.");
    }

    return json;
}

async function getMyProfile(token: string): Promise<ProfileResponse> {
    const res = await fetch(`${AUTH_API}/auth/profile/me`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
            `Profile fetch failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`
        );
    }

    return (await res.json()) as ProfileResponse;
}

/* ---------------- Component ---------------- */

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // 1️⃣ login
            const data = await login(email, password);

            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("clientId", data.clientId);

            if (data.refreshToken) {
                localStorage.setItem("refreshToken", data.refreshToken);
            } else {
                localStorage.removeItem("refreshToken");
            }

            const profile = await getMyProfile(data.accessToken);

            onLogin();

            if (!profile.profileCompleted) {
                navigate("/complete-profile", { replace: true });
            } else {
                navigate("/", { replace: true });
            }

            console.log("Login successful:", data, profile);

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
                <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

                {error && <p className="text-red-500 mb-4">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-medium">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 disabled:opacity-60 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="mt-4 text-center">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" className="text-blue-600 hover:underline">
                        Registration
                    </Link>
                </p>

                <p className="mt-2 text-center text-sm">
                    <Link to="/forgot-password" className="text-blue-600 hover:underline">
                        Forgot password?
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
