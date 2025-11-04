import React, { useEffect, useState, useCallback } from "react";
import { FaTags, FaListAlt, FaClipboardCheck, FaBell, FaSignOutAlt } from "react-icons/fa";
import ActualizacionPrecios from "../pages/ActualizacionPrecios.jsx";
import ListarCambios from "../pages/ListarCambios.jsx";
import ListarAuditoria from "../pages/ListarAuditoria.jsx";

/* Menú base */
const menuItems = [
    { key: "actualizacion", label: "Actualización de Precios", icon: FaTags },
    { key: "listarCambios", label: "Listar Precios", icon: FaListAlt },
    { key: "auditoria", label: "Auditoría", icon: FaClipboardCheck },
];
const VALID_KEYS = menuItems.map((m) => m.key);

/* Permisos (solo Lista de Precios; sin Compras) */
const ACCESS = {
    actualizacion: ["Admin", "Usuario", "Validacion"],
    listarCambios: ["Admin", "Usuario", "Validacion", "Aprobador_Gerente"],
    auditoria: ["Admin"],
};

const normalizeRoles = (arr) =>
    Array.isArray(arr) ? arr.map((r) => String(r || "").trim().toUpperCase()) : [];

const canAccess = (pageKey, roles) => {
    const rolesNorm =
        roles && roles.length > 0
            ? normalizeRoles(roles)
            : normalizeRoles(JSON.parse(localStorage.getItem("userRoles") || "[]"));
    if (rolesNorm.includes("ADMIN")) return true;
    const allowed = normalizeRoles(ACCESS[pageKey] || []);
    return rolesNorm.some((r) => allowed.includes(r));
};

/* Item de menú con indicador activo visible */
const MenuItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        title={label}
        aria-current={active ? "page" : undefined}
        aria-selected={active}
        className={[
            "relative group w-full flex items-center gap-3 pl-5 pr-4 py-3 rounded-lg text-base font-medium",
            "transition-colors outline-none",
            "focus:ring-2 focus:ring-[#0D2A45] focus:ring-offset-2 focus:ring-offset-white/10",
            active
                ? "bg-white/20 text-white shadow-inner ring-1 ring-white/20"
                : "text-white/90 hover:bg-white/10",
        ].join(" ")}
    >
        {/* Franja vertical izquierda para el activo */}
        <span
            className={[
                "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1.5 rounded-r",
                "transition-all",
                active ? "bg-white opacity-100" : "bg-transparent opacity-0",
            ].join(" ")}
            aria-hidden="true"
        />
        <Icon
            className={[
                "w-5 h-5 shrink-0 transition-colors",
                active ? "text-white" : "text-white/90 group-hover:text-white",
            ].join(" ")}
        />
        <span className={active ? "truncate font-semibold" : "truncate"}>{label}</span>
    </button>
);

export default function AdminLayout({
                                        activeKey: activeKeyProp,
                                        setActiveKey: setActiveKeyProp,
                                        sidebarOpen: sidebarOpenProp,
                                        setSidebarOpen: setSidebarOpenProp,
                                        onLogout,
                                        roles = [],
                                    }) {
    /* Roles */
    const rolesNorm =
        roles && roles.length > 0
            ? normalizeRoles(roles)
            : normalizeRoles(JSON.parse(localStorage.getItem("userRoles") || "[]"));

    /* Menú visible */
    const visibleMenuItems = menuItems.filter((m) => canAccess(m.key, rolesNorm));
    const defaultKey = visibleMenuItems[0]?.key || "actualizacion";

    const [activeKey, setActiveKey] = useState(
        VALID_KEYS.includes(activeKeyProp) && canAccess(activeKeyProp, rolesNorm)
            ? activeKeyProp
            : defaultKey
    );
    const [sidebarOpen, setSidebarOpen] = useState(!!sidebarOpenProp);
    const [notifCount] = useState(0);

    /* Usuario para header */
    const nombre = (localStorage.getItem("nombre") || "").toUpperCase();
    const identificacion = (localStorage.getItem("identificacion") || "").toUpperCase();
    const headerDisplay = [nombre, identificacion].filter(Boolean).join(" • ");

    useEffect(() => {
        if (VALID_KEYS.includes(activeKeyProp) && canAccess(activeKeyProp, rolesNorm)) {
            setActiveKey(activeKeyProp);
        } else if (!canAccess(activeKey, rolesNorm)) {
            setActiveKey(defaultKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeKeyProp, rolesNorm.join("|")]);

    useEffect(() => {
        if (sidebarOpenProp !== undefined) setSidebarOpen(!!sidebarOpenProp);
    }, [sidebarOpenProp]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Escape") setSidebarOpen(false);
    }, []);
    useEffect(() => {
        if (!sidebarOpen) return;
        document.addEventListener("keydown", handleKeyDown);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = prev;
        };
    }, [sidebarOpen, handleKeyDown]);

    const safeKey =
        VALID_KEYS.includes(activeKey) && canAccess(activeKey, rolesNorm)
            ? activeKey
            : defaultKey;

    const renderPage = (key) => {
        if (!canAccess(key, rolesNorm)) {
            return (
                <div className="p-6 rounded-xl border bg-white text-sm text-rose-700">
                    No tienes permisos para acceder a esta sección.
                </div>
            );
        }
        return (
            {
                actualizacion: <ActualizacionPrecios />,
                listarCambios: <ListarCambios />,
                auditoria: <ListarAuditoria />,
            }[key] || <p>Página no encontrada</p>
        );
    };

    const handleSignOut = useCallback(() => {
        if (typeof onLogout === "function") onLogout();
        else {
            localStorage.clear();
            window.location.reload();
        }
    }, [onLogout]);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside
                className={[
                    "fixed inset-y-0 left-0 z-30 w-64 text-white flex flex-col",
                    "bg-gradient-to-b from-[#0D2A45] to-[#071A2A]",
                    "transform transition-transform duration-300",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                    "md:translate-x-0 md:static md:z-10",
                    "shadow-xl",
                ].join(" ")}
                aria-label="Menú principal"
            >
                <div className="flex items-center justify-center h-20 px-4 border-b border-white/10">
                    <img
                        src="/img/logo-recamier.png"
                        alt="Recamier"
                        className="h-14 w-auto object-contain drop-shadow"
                        loading="eager"
                    />
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
                    {visibleMenuItems.map(({ key, ...rest }) => (
                        <MenuItem
                            key={key}
                            {...rest}
                            active={safeKey === key}
                            onClick={() => {
                                if (!canAccess(key, rolesNorm)) return;
                                setActiveKey(key);
                                setSidebarOpen(false);
                                setActiveKeyProp?.(key);
                                setSidebarOpenProp?.(false);
                            }}
                        />
                    ))}
                    {visibleMenuItems.length === 0 && (
                        <div className="px-4 py-3 rounded-lg bg-white/10 text-white/90 text-sm">
                            No tienes secciones disponibles con tus permisos.
                        </div>
                    )}
                </nav>
            </aside>

            {/* Scrim móvil */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Contenido */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#0D2A45]/10">
                    <div className="h-14 md:h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="inline-flex items-center justify-center rounded-md p-2 text-[#0D2A45] hover:bg-[#0D2A45]/10 focus:outline-none focus:ring-2 focus:ring-[#0D2A45] md:hidden"
                            aria-label="Abrir menú"
                        >
                            <span className="text-2xl leading-none">☰</span>
                        </button>

                        {/* NOMBRE • IDENTIFICACION */}
                        <div className="flex-1 text-center md:text-left">
                            {headerDisplay && (
                                <div className="text-sm md:text-base font-semibold text-slate-800 tracking-wide uppercase truncate">
                                    {headerDisplay}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4">
                            <button
                                type="button"
                                className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D2A45]"
                                aria-label="Notificaciones"
                                title="Notificaciones"
                                onClick={() => console.log("Abrir notificaciones")}
                            >
                                <FaBell className="w-5 h-5 text-slate-700" />
                                {notifCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-[#0D2A45] text-white text-[10px] leading-4 text-center">
                    {notifCount}
                  </span>
                                )}
                            </button>

                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-medium"
                                title="Sign out"
                            >
                                <FaSignOutAlt className="w-4 h-4" />
                                <span>Sign out</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8">
                    <div className="max-w-[1600px] mx-auto">{renderPage(safeKey)}</div>
                </main>
            </div>
        </div>
    );
}
