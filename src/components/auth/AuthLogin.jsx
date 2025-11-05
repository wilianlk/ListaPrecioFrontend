// src/components/auth/AuthLogin.jsx
import React, { useEffect, useState } from "react";
import { getConfig } from "../../config/config";

const logoRecamier = "/img/logo-recamier.png";

export default function AuthLogin({ onLoginSuccess }) {
    const { apiBaseURL } = getConfig() || {};
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [msgType, setMsgType] = useState("error");
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const isRecamierEmail = (v) => /^[^\s@]+@recamier\.com$/i.test((v || "").trim());
    const disableBtn = loading || !email.trim() || !password.trim();

    useEffect(() => {
        const correo = localStorage.getItem("correo");
        const identificacion = localStorage.getItem("identificacion");
        if (correo && identificacion) onLoginSuccess?.();
    }, [onLoginSuccess]);

    const handleSubmit = async (e) => {
        e?.preventDefault();

        if (!apiBaseURL) {
            setMsgType("error");
            setMessage("No se encontró la URL del servidor.");
            return;
        }
        if (!isRecamierEmail(email)) {
            setMsgType("error");
            setMessage("Debes ingresar un correo válido de @recamier.com");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const res = await fetch(`${apiBaseURL}/api/Auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    correo: email.trim(),
                    identificacion: password.trim(),
                }),
            });

            const text = await res.text();
            let data = {};
            try {
                data = JSON.parse(text);
            } catch {}

            if (res.ok && data.success) {
                localStorage.setItem("correo", data.correo || email.trim());
                localStorage.setItem("identificacion", data.identificacion || password.trim());
                localStorage.setItem("nombre", data.nombre || "");
                if (Array.isArray(data.roles)) {
                    localStorage.setItem("userRoles", JSON.stringify(data.roles));
                }
                setMsgType("ok");
                setMessage("¡Bienvenido!");
                onLoginSuccess?.();
            } else {
                setMsgType("error");
                setMessage(data.message || "Credenciales incorrectas");
            }
        } catch {
            setMsgType("error");
            setMessage("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F1F6FA] to-white px-4 py-10">
            <div className="w-full max-w-md">
                <form
                    onSubmit={handleSubmit}
                    className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="h-2 w-full bg-gradient-to-r from-[#0D2A45] to-[#103654]" />
                    <div className="p-6 sm:p-8">
                        <div className="flex items-center justify-center mb-5">
                            <img
                                src={logoRecamier}
                                alt="Recamier Actualización de precios"
                                className="h-40 sm:h-44 w-auto object-contain mx-auto scale-135 drop-shadow-lg"
                                loading="eager"
                            />
                        </div>

                        <h1 className="text-2xl font-extrabold text-center text-gray-900 mb-6">
                            Inicia sesión
                        </h1>

                        <div className="mb-4">
                            <label className="font-medium text-sm text-gray-800">Correo electrónico</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tucorreo@recamier.com"
                                autoFocus
                                className="w-full mt-1 rounded-md border border-[#C8D5E4] bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0D2A45]/40"
                            />
                        </div>

                        <div className="mb-2">
                            <label className="font-medium text-sm text-gray-800">Contraseña</label>
                            <div className="relative mt-1">
                                <input
                                    type={showPwd ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Contraseña"
                                    autoComplete="current-password"
                                    className="w-full rounded-md border border-[#C8D5E4] bg-gray-50 px-3 py-2 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0D2A45]/40"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd((v) => !v)}
                                    className="absolute inset-y-0 right-2 flex items-center text-gray-700 hover:text-black text-lg"
                                    aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    tabIndex={-1}
                                >
                                    👁️
                                </button>
                            </div>
                        </div>

                        {message && (
                            <div
                                className={`mt-3 mb-2 rounded-xl px-3 py-2 text-sm text-center border ${
                                    msgType === "ok"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                            >
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            onClick={(e) => {
                                if (!disableBtn) handleSubmit(e);
                            }}
                            disabled={disableBtn}
                            className={`mt-4 w-full py-2.5 rounded-xl text-white font-semibold transition-colors ${
                                disableBtn
                                    ? "bg-[#0D2A45]/40 cursor-not-allowed"
                                    : "bg-[#0D2A45] hover:bg-[#103654]"
                            }`}
                        >
                            {loading ? "Ingresando…" : "Ingresar"}
                        </button>
                    </div>
                </form>

                <div className="mt-4 text-center text-xs text-gray-500">
                    © {new Date().getFullYear()} Recamier • Acceso interno
                </div>
            </div>
        </div>
    );
}
