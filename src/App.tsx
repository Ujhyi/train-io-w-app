import React, { useState } from "react";
import {
    HashRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import HomePage from "./pages/main/HomePage";
import TeamPage from "./pages/main/TeamPage";
import JoinPage from "./pages/main/JoinPage";
import MatchPage from "./pages/main/MatchPage";
import TrainingPage from "./pages/main/TrainingPage";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPasswordReq from "./pages/auth/ResetPasswordReq";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyPage from "./pages/auth/VerifyPage";
import CompleteProfile from "./pages/auth/CompleteProfile";

type AppRoutesProps = {
    isAuthenticated: boolean;
    setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
};

const AppRoutes: React.FC<AppRoutesProps> = ({ isAuthenticated, setIsAuthenticated }) => {
    const location = useLocation();

    // stránky kde nechceš navbar/footer (onboarding/auth flow)
    const hideNavbarOn = [
        "/login",
        "/register",
        "/verify",
        "/forgot-password",
        "/reset-password",
        "/complete-profile",
    ];

    const shouldHideNavbar = hideNavbarOn.includes(location.pathname);

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            {isAuthenticated && !shouldHideNavbar && <Navbar />}
            <main className="flex-1">
                <Routes>
                    {/* Root */}
                    <Route
                        path="/"
                        element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />}
                    />

                    {/* Protected pages */}
                    <Route path="/home" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />} />
                    <Route path="/team" element={isAuthenticated ? <TeamPage /> : <Navigate to="/login" replace />} />
                    <Route path="/join" element={isAuthenticated ? <JoinPage /> : <Navigate to="/login" replace />} />
                    <Route path="/training" element={isAuthenticated ? <TrainingPage /> : <Navigate to="/login" replace />} />
                    <Route path="/match" element={isAuthenticated ? <MatchPage /> : <Navigate to="/login" replace />} />

                    {/* Public auth pages */}
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ResetPasswordReq />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify" element={<VerifyPage />} />

                    {/* Must be logged in */}
                    <Route
                        path="/complete-profile"
                        element={isAuthenticated ? <CompleteProfile /> : <Navigate to="/login" replace />}
                    />

                    {/* Login (bez auto redirectu z App.tsx) */}
                    <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </main>
            {isAuthenticated && !shouldHideNavbar && <Footer />}
        </div>
    );
};

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(
        !!localStorage.getItem("accessToken")
    );

    return (
        <Router>
            <AppRoutes isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        </Router>
    );
};

export default App;
