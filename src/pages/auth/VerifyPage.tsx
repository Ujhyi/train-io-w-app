import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const AUTH_API = import.meta.env.VITE_USER_API;

async function verifyAccount(code: string, token: string): Promise<void> {
    const res = await fetch(`${AUTH_API}/auth/verify`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
            `Verify failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`
        );
    }
}

const Verify: React.FC = () => {
    const [code, setCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const navigate = useNavigate();

    const token = localStorage.getItem("accessToken");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Missing token. Please register again.");
            return;
        }

        if (code.trim().length !== 6) {
            setError("Code must be 6 digits.");
            return;
        }

        setLoading(true);

        try {
            await verifyAccount(code.trim(), token);

            setSuccess(true);

            // po úspechu redirect na login po 2s
            setTimeout(() => {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("clientId");

                navigate("/login", { replace: true });
            }, 2000);

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
                    Verify Account
                </h2>

                {error && <p className="text-red-500 mb-4">{error}</p>}

                {success && (
                    <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
                        Account verified successfully. Redirecting to login...
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-medium">
                            Verification Code
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder="6-digit code"
                            required
                            disabled={loading || success}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || success || code.length !== 6}
                        className="w-full bg-blue-600 disabled:opacity-60 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        {loading ? "Verifying..." : "Verify"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Verify;
