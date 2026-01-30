import React from "react";
import { Link, useNavigate } from "react-router-dom";

// Props are optional; you can pass a callback when the user logs out
export type NavbarProps = {
    onLoggedOut?: () => void;
};

const Navbar: React.FC<NavbarProps> = ({ onLoggedOut }) => {

    const [isOpen, setIsOpen] = React.useState(false); // mobile menu
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false); // desktop dropdown
    const [isSettingsOpenMobile, setIsSettingsOpenMobile] = React.useState(false);
    const [isAccountOpenMobile, setisAccountOpenMobile] = React.useState(false);
    const [isAccountOpen, setIsAccountOpen] = React.useState(false); // desktop account dropdown

    const dropdownRef = React.useRef<HTMLLIElement | null>(null);
    const accountRef = React.useRef<HTMLLIElement | null>(null);
    const navigate = useNavigate();

    const handleLinkClick = () => {
        setIsOpen(false);
        setIsSettingsOpen(false);
        setIsSettingsOpenMobile(false);
        setIsAccountOpen(false);
        setisAccountOpenMobile(false);
    };

    React.useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsSettingsOpen(false);
            }
            if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
                setIsAccountOpen(false);
            }
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsSettingsOpen(false);
                setIsAccountOpen(false);
                setIsSettingsOpenMobile(false);
                setisAccountOpenMobile(false);
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", onClickOutside);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClickOutside);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    const logout = async () => {
        const refreshToken = localStorage.getItem("refreshToken");

        try {
            await fetch("http://35.202.206.58:8080/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            console.warn("Logout request failed, proceeding anyway.");
        } finally {
            // Always clear tokens
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            onLoggedOut?.();
            navigate("/login", { replace: true });
            setTimeout(() => {
                window.location.assign("/login");
            }, 0);
        }
    };

    return (
        <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <div className="text-2xl font-bold text-blue-600">train-io</div>

                {/* Desktop Menu */}
                <ul className="hidden md:flex space-x-8 text-gray-700 font-medium items-center">
                    <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
                    <li><Link to="/match" className="hover:text-blue-600">Matches</Link></li>
                    <li><Link to="/training" className="hover:text-blue-600">Trainings</Link></li>


                    {/* Settings (desktop dropdown) */}
                    <li ref={dropdownRef} className="relative">
                        <button
                            onClick={() => setIsSettingsOpen((p) => !p)}
                            className="inline-flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                            aria-haspopup="menu"
                            aria-expanded={isSettingsOpen}
                        >
                            Teams
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${isSettingsOpen ? "rotate-180" : "rotate-0"}`}>
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {isSettingsOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
                            >
                                <Link to="/team" onClick={handleLinkClick} className="block px-3 py-2 hover:bg-gray-50">Teams</Link>
                                <Link to="/join" onClick={handleLinkClick} className="block px-3 py-2 hover:bg-gray-50">Join Team</Link>
                            </div>
                        )}
                    </li>

                    {/* Account (desktop dropdown) */}
                    <li ref={accountRef} className="relative">
                        <button
                            onClick={() => setIsAccountOpen((p) => !p)}
                            className="inline-flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                            aria-haspopup="menu"
                            aria-expanded={isAccountOpen}
                        >
                            Account
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${isAccountOpen ? "rotate-180" : "rotate-0"}`}>
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </button>
                        {isAccountOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                                {/* <Link to="/TEST" onClick={handleLinkClick} className="block px-3 py-2 hover:bg-gray-50">TEST</Link>
                                <Link to="/TEST1" onClick={handleLinkClick} className="block px-3 py-2 hover:bg-gray-50">TEST1</Link>
                                <Link to="/TEST2" onClick={handleLinkClick} className="block px-3 py-2 hover:bg-gray-50">TEST2</Link> */}
                                <Link to="/login" onClick={logout} className="block px-3 py-2 hover:bg-gray-50">Logout</Link>
                            </div>
                        )}
                    </li>
                </ul>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                    <button
                        className="text-gray-700 focus:outline-none"
                        onClick={() => setIsOpen((o) => !o)}
                        aria-label="Toggle menu"
                        aria-expanded={isOpen}
                        aria-controls="mobile-menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div
                id="mobile-menu"
                className={`md:hidden overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
                }`}
            >
                <ul className="px-6 pb-4 space-y-2 text-gray-700 font-medium">
                    <li>
                        <Link to="/" onClick={handleLinkClick} className="block px-2 py-1 hover:text-blue-600">
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link to="/match" onClick={handleLinkClick} className="block px-2 py-1 hover:text-blue-600">
                            Matches
                        </Link>
                    </li>
                    <li>
                        <Link to="/training" onClick={handleLinkClick} className="block px-2 py-1 hover:text-blue-600">
                            Trainings
                        </Link>
                    </li>


                    {/* Settings (mobile collapsible) */}
                    <li>
                        <button
                            onClick={() => setIsSettingsOpenMobile((p) => !p)}
                            className="w-full flex items-center justify-between px-2 py-1 hover:text-blue-600"
                            aria-expanded={isSettingsOpenMobile}
                            aria-controls="mobile-settings"
                        >
                            <span>Team</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${isSettingsOpenMobile ? "rotate-180" : "rotate-0"}`}>
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <div
                            id="mobile-settings"
                            className={`overflow-hidden transition-all ${isSettingsOpenMobile ? "max-h-40" : "max-h-0"}`}
                        >
                            <ul className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3">
                                <Link to="/team" onClick={handleLinkClick} className="block px-3 py-2 hover:bg-gray-50">Teams</Link>
                                <Link to="/player" onClick={handleLinkClick} className="block px-3 py-2 hover:bg-gray-50">Join Team</Link>
                            </ul>
                        </div>
                    </li>

                    <li>
                        <button
                            onClick={() => setisAccountOpenMobile((p) => !p)}
                            className="w-full flex items-center justify-between px-2 py-1 hover:text-blue-600"
                            aria-expanded={isAccountOpenMobile}
                            aria-controls="mobile-settings"
                        >
                            <span>Account</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${isAccountOpenMobile ? "rotate-180" : "rotate-0"}`}>
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <div
                            id="mobile-settings"
                            className={`overflow-hidden transition-all ${isAccountOpenMobile ? "max-h-40" : "max-h-0"}`}
                        >
                            <ul className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3">
                                <Link to="/" onClick={handleLinkClick} className="block px-3 py-2 hover:bg-gray-50">TEST</Link>
                                <Link to="/login" onClick={logout} className="block px-3 py-2 hover:bg-gray-50 text-red-600">Logout</Link>
                            </ul>
                        </div>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;