import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type RegisterResponse = {
    clientId: string;
    accessToken: string;
    refreshToken?: string;
};

const AUTH_API = import.meta.env.VITE_USER_API;

async function register(email: string, password: string): Promise<RegisterResponse> {
    const res = await fetch(`${AUTH_API}/auth/register`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
            `Register failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`
        );
    }

    const json = (await res.json()) as RegisterResponse;

    if (!json?.accessToken) {
        throw new Error("Register failed: missing accessToken in response.");
    }

    return json;
}

const Register: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password1, setPassword1] = useState("");
    const [password2, setPassword2] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const passwordsMatch = useMemo(() => password1 === password2, [password1, password2]);

    const canSubmit = useMemo(() => {
        return (
            email.trim().length > 0 &&
            password1.trim().length > 0 &&
            password2.trim().length > 0 &&
            passwordsMatch &&
            !loading
        );
    }, [email, password1, password2, passwordsMatch, loading]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const data = await register(email, password1);

            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("clientId", data.clientId);

            if (data.refreshToken) {
                localStorage.setItem("refreshToken", data.refreshToken);
            } else {
                localStorage.removeItem("refreshToken");
            }

            console.log("Register successful:", data);

            // Po registrácii ide user zadať verifikačný kód
            navigate("/verify", { replace: true });
            // ak chceš namiesto toho login:
            // navigate("/login", { replace: true });

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
                <h2 className="text-2xl font-bold mb-6 text-center">Registration</h2>

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
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Password</label>
                        <input
                            type="password"
                            value={password1}
                            onChange={(e) => setPassword1(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Password again</label>
                        <input
                            type="password"
                            value={password2}
                            onChange={(e) => setPassword2(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    {!passwordsMatch && password2.length > 0 && (
                        <p className="text-sm text-red-500">Passwords do not match.</p>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full bg-blue-600 disabled:opacity-60 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        {loading ? "Registering..." : "Register"}
                    </button>
                </form>

                <p className="mt-4 text-center">
                    Already have an account?{" "}
                    <span
                        onClick={() => navigate("/login")}
                        className="text-blue-600 hover:underline cursor-pointer"
                    >
            Login
          </span>
                </p>
            </div>
        </div>
    );
};

export default Register;
