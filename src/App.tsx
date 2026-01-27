import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import HomePage from "./pages/main/HomePage";
import TeamPage from "./pages/main/TeamPage";
import JoinPage from "./pages/main/JoinPage";
import MatchPage from "./pages/main/MatchPage";
import TrainingPage from "./pages/main/TrainingPage";
import Login from "./pages/auth/Login";

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(
        !!localStorage.getItem("accessToken")
    );

    return (
        <Router>
            <div className="min-h-screen flex flex-col bg-gray-100">
                {isAuthenticated && <Navbar />}

                {/* toto spraví, že obsah zaberie voľné miesto a footer ide dole */}
                <main className="flex-1">
                    <Routes>
                        <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />} />
                        <Route path="/home" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />} />
                        <Route path="/team" element={isAuthenticated ? <TeamPage /> : <Navigate to="/login" />} />
                        <Route path="/join" element={isAuthenticated ? <JoinPage /> : <Navigate to="/login" />} />
                        <Route path="/training" element={isAuthenticated ? <TrainingPage /> : <Navigate to="/login" />} />
                        <Route path="/match" element={isAuthenticated ? <MatchPage /> : <Navigate to="/login" />} />

                        <Route
                            path="/login"
                            element={
                                isAuthenticated ? (
                                    <Navigate to="/" />
                                ) : (
                                    <Login onLogin={() => setIsAuthenticated(true)} />
                                )
                            }
                        />

                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </main>

                {isAuthenticated && <Footer />}
            </div>
        </Router>
    );
};

export default App;
