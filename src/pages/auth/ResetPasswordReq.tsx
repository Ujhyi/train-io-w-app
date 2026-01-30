import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const AUTH_API = import.meta.env.VITE_USER_API;

async function forgotPassword(email: string): Promise<void> {
    const res = await fetch(`${AUTH_API}/auth/forgot-password`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
            `Request failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`
        );
    }
}

const ResetPasswordReq: React.FC = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await forgotPassword(email.trim());
            navigate("/reset-password", { replace: true });

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
                <h2 className="text-2xl font-bold mb-6 text-center">
                    Forgot Password
                </h2>

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

                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full bg-blue-600 disabled:opacity-60 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        {loading ? "Sending..." : "Send reset code"}
                    </button>
                </form>

                <p className="mt-4 text-center">
                    Back to{" "}
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

export default ResetPasswordReq;
