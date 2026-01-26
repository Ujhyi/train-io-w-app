import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";


import Navbar from "./components/Navbar.tsx";
import HomePage from "./pages/main/HomePage.tsx";
import TeamPage from "./pages/main/TeamPage.tsx";
import JoinPage from "./pages/main/JoinPage.tsx";
import MatchPage from "./pages/main/MatchPage.tsx";
import TrainingPage from "./pages/main/TrainingPage.tsx";
import Login from "./pages/auth/Login.tsx";
import Footer from "./components/Footer.tsx";


const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(
        !!localStorage.getItem("accessToken")
    );

    return (
        <Router>
            {isAuthenticated && <Navbar />}
            <Routes>
                <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />}/>
                <Route path="*" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={isAuthenticated ? (<Navigate to="/" />) : (<Login onLogin={() => setIsAuthenticated(true)} />)}/>b

                <Route path="/home" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />}/>
                <Route path="/team" element={isAuthenticated ? <TeamPage /> : <Navigate to="/login" />}/>
                <Route path="/join" element={isAuthenticated ? <JoinPage /> : <Navigate to="/login" />}/>
                <Route path="/training" element={isAuthenticated ? <TrainingPage /> : <Navigate to="/login" />}/>
                <Route path="/match" element={isAuthenticated ? <MatchPage /> : <Navigate to="/login" />}/>

            </Routes>
            {isAuthenticated && <Footer />}
        </Router>
    );
};
export default App;