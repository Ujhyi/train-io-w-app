import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const AUTH_API = import.meta.env.VITE_USER_API;

async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const res = await fetch(`${AUTH_API}/auth/reset-password`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code, newPassword }),
    });

    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
            `Reset failed: ${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`
        );
    }
}

const ResetPassword: React.FC = () => {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    const [password1, setPassword1] = useState("");
    const [password2, setPassword2] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // bonus: countdown na redirect
    const [seconds, setSeconds] = useState(3);

    const navigate = useNavigate();

    const passwordsMatch = useMemo(() => password1 === password2, [password1, password2]);
    const codeOk = useMemo(() => code.trim().length === 6, [code]);

    const canSubmit = useMemo(() => {
        return (
            email.trim().length > 0 &&
            codeOk &&
            password1.trim().length >= 8 && // backend: min 8
            password2.trim().length >= 8 &&
            passwordsMatch &&
            !loading
        );
    }, [email, codeOk, password1, password2, passwordsMatch, loading]);

    useEffect(() => {
        if (!success) return;

        setSeconds(3);

        const interval = setInterval(() => {
            setSeconds((s) => (s > 0 ? s - 1 : 0));
        }, 1000);

        const timer = setTimeout(() => {
            navigate("/login", { replace: true });
        }, 3000);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [success, navigate]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await resetPassword(email.trim(), code.trim(), password1);
            setSuccess(true);
            setEmail("");
            setCode("");
            setPassword1("");
            setPassword2("");
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
                <h2 className="text-2xl font-bold mb-6 text-center">Reset Password</h2>

                {error && <p className="text-red-500 mb-4">{error}</p>}

                {success && (
                    <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
                        Password reset successful. Redirect to login in {seconds} ...
                    </div>
                )}

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
                            disabled={loading || success}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Verification code</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            disabled={loading || success}
                            placeholder="6-digit code"
                        />
                        {!codeOk && code.length > 0 && (
                            <p className="text-sm text-red-500 mt-1">Code must be 6 digits.</p>
                        )}
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">New password</label>
                        <input
                            type="password"
                            value={password1}
                            onChange={(e) => setPassword1(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            autoComplete="new-password"
                            disabled={loading || success}
                            placeholder="min. 8 characters"
                        />
                    </div>

                    <div>
                        <label className="block mb-1 font-medium">Repeat new password</label>
                        <input
                            type="password"
                            value={password2}
                            onChange={(e) => setPassword2(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            autoComplete="new-password"
                            disabled={loading || success}
                        />
                        {!passwordsMatch && password2.length > 0 && (
                            <p className="text-sm text-red-500 mt-1">Passwords do not match.</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmit || success}
                        className="w-full bg-blue-600 disabled:opacity-60 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        {loading ? "Resetting..." : "Reset password"}
                    </button>
                </form>

                <p className="mt-4 text-center">
                    Back to{" "}
                    <Link to="/login" className="text-blue-600 hover:underline">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;
