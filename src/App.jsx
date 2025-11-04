// src/App.jsx
import React, { useState, useEffect } from "react";
import AdminLayout from "./components/layouts/AdminLayout.jsx";
import AuthLogin from "./components/auth/AuthLogin.jsx";

function tieneSesionActiva() {
    const correo = localStorage.getItem("correo");
    const identificacion = localStorage.getItem("identificacion");
    const roles = localStorage.getItem("userRoles");
    return !!(correo && identificacion && roles);
}

export default function App() {
    const [isAuth, setIsAuth] = useState(tieneSesionActiva());
    const [activeKey, setActiveKey] = useState("actualizacion");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [roles, setRoles] = useState([]);

    useEffect(() => {
        const storedRoles = JSON.parse(localStorage.getItem("userRoles") || "[]");
        setRoles(storedRoles);
    }, [isAuth]);

    useEffect(() => {
        const checkSession = () => setIsAuth(tieneSesionActiva());
        window.addEventListener("storage", checkSession);
        return () => window.removeEventListener("storage", checkSession);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setIsAuth(false);
        setRoles([]);
    };

    const handleLoginSuccess = () => {
        setIsAuth(true);
        setActiveKey("actualizacion");
        const storedRoles = JSON.parse(localStorage.getItem("userRoles") || "[]");
        setRoles(storedRoles);
    };

    if (!isAuth) {
        return <AuthLogin onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <AdminLayout
            activeKey={activeKey}
            setActiveKey={setActiveKey}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onLogout={handleLogout}
            roles={roles}
        />
    );
}
