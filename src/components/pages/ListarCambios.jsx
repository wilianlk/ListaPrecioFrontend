// src/components/pages/ListarCambios.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getConfig } from "../../config/config";

/* ==== UI helpers ==== */
const Card = ({ className = "", children, ...rest }) => (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`} {...rest}>
        {children}
    </div>
);
const CardContent = ({ className = "", children }) => (
    <div className={`p-4 ${className}`}>{children}</div>
);
const UnderInput = ({ label, type = "text", value, onChange, placeholder, autoFocus }) => (
    <label className="flex flex-col">
        {label && <span className="text-sm font-medium text-gray-700 mb-1">{label}</span>}
        <input
            type={type}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? "Escribe aquí..."}
            autoFocus={autoFocus}
            className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-[#0D2A45]"
        />
    </label>
);
const SelectPlain = ({ label, value, onChange, children }) => (
    <label className="flex flex-col">
        {label && <span className="text-sm font-medium text-gray-700 mb-1">{label}</span>}
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-0 py-2 bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:ring-0 focus:border-[#0D2A45]">
            {children}
        </select>
    </label>
);
const ToastItem = ({ message, variant = "info", onClose }) => {
    const palette = {
        info: "bg-[#0D2A45] text-white border-[#0A1E31]",
        success: "bg-emerald-600 text-white border-emerald-700",
        error: "bg-rose-600 text-white border-rose-700",
        warning: "bg-amber-500 text-black border-amber-600",
    };
    return (
        <div className={`min-w-[220px] max-w-[360px] border rounded-lg shadow-lg px-4 py-3 ${palette[variant]}`}>
            <div className="flex items-start gap-3">
                <span className="text-sm leading-5">{message}</span>
                <button onClick={onClose} className="ml-auto text-xs opacity-80 hover:opacity-100" aria-label="Cerrar">
                    ✕
                </button>
            </div>
        </div>
    );
};

/* ==== util ==== */
const fmtCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 0];
const estadoBadgeClass = (estado) => {
    const st = String(estado || "").toUpperCase();
    if (st === "APROBADO") return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
    if (st === "PENDIENTE") return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
    if (st === "RECHAZADO") return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
    if (st === "VALIDADO") return "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200";
    if (st === "EN VALIDACCION") return "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200";
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
};

/* ==== estilos unificados para botones ==== */
const BTN =
    "inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-medium leading-none transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_TABLE =
    "inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-medium leading-none transition focus:outline-none focus:ring-1 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";

/* Variantes sobrias */
const BTN_ACCENT = `${BTN} bg-[#0D2A45] text-white hover:bg-[#0D2A45]/90 focus:ring-[#0D2A45]/40`;
const BTN_OUTLINE = `${BTN} border border-slate-300 text-slate-700 hover:bg-slate-100 focus:ring-slate-300`;
const BTN_TABLE_ACCENT = `${BTN_TABLE} bg-[#0D2A45] text-white hover:bg-[#0D2A45]/90 focus:ring-[#0D2A45]/30`;
const BTN_TABLE_OUTLINE = `${BTN_TABLE} border border-slate-300 text-slate-700 hover:bg-slate-100 focus:ring-slate-300`;

export default function ListarCambios() {
    const { apiBaseURL } = getConfig();
    const LIST_URL = `${apiBaseURL}/api/ListasPrecios/listar-cambios`;
    const OPERAR_URL = `${apiBaseURL}/api/ListasPrecios/operar`;
    const VALIDAR_URL = `${apiBaseURL}/api/ListasPrecios/validar`; // Validar dedicado
    const FINALIZAR_URL = `${apiBaseURL}/api/ListasPrecios/finalizar`; // <-- NUEVO endpoint dedicado

    /* Roles */
    const userRoles = JSON.parse(localStorage.getItem("userRoles") || "[]");
    const rolesNorm = Array.isArray(userRoles) ? userRoles.map((r) => String(r || "").trim().toUpperCase()) : [];
    const canPublicar = rolesNorm.includes("APROBADOR_GERENTE");
    const canValidar = rolesNorm.includes("VALIDACION");

    const [datos, setDatos] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [toasts, setToasts] = useState([]);
    const pushToast = (message, variant = "info", ttlMs = 3000) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, message, variant }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ttlMs);
    };

    // filtros
    const [estado, setEstado] = useState("TODOS");
    const [qGlobal, setQGlobal] = useState("");
    const [f, setF] = useState({ operacion: "", gerente: "" });

    // paginación
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const applyPageSize = (n) => {
        setPageSize(Number(n));
        setPage(1);
    };

    // padding seguro móvil
    const sectionRef = useRef(null);
    const [bottomPad, setBottomPad] = useState(96);
    useEffect(() => {
        const calcPad = () => {
            const isMobile = window.innerWidth < 768;
            setBottomPad(isMobile ? 96 : 16);
        };
        calcPad();
        window.addEventListener("resize", calcPad);
        return () => window.removeEventListener("resize", calcPad);
    }, []);

    // carga
    const cargar = async () => {
        setCargando(true);
        setError("");
        try {
            const identificacion = localStorage.getItem("identificacion");
            if (!identificacion) throw new Error("No se encontró la identificación del usuario.");

            const res = await fetch(LIST_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identificacion }),
            });

            if (!res.ok) throw new Error((await res.text()) || "HTTP error");
            const j = await res.json().catch(() => ({}));
            const arr = Array.isArray(j) ? j : j?.datos || j?.data || [];

            setDatos(arr);
            if (!Array.isArray(j) && j?.ok === false) pushToast("El servicio devolvió un error.", "warning");
        } catch (e) {
            setError(e?.message || "Error al consultar operaciones.");
            pushToast(`❌ ${e?.message || "Error al consultar operaciones."}`, "error");
            setDatos([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar(); // eslint-disable-line
    }, [LIST_URL]);

    /* === Resumen con todos los estados relevantes === */
    const resumen = useMemo(() => {
        const acc = { total: 0 };
        for (const r of datos) {
            const st = String(r.estado || "").toUpperCase();
            acc.total += 1;
            acc[st] = (acc[st] || 0) + 1;
        }
        return {
            total: acc.total,
            pend: acc["PENDIENTE"] || 0,
            enval: acc["EN VALIDACCION"] || 0,
            val: acc["VALIDADO"] || 0,
            aprob: acc["APROBADO"] || 0,
            rech: acc["RECHAZADO"] || 0,
        };
    }, [datos]);

    // filtro listado
    const filtrados = useMemo(() => {
        const norm = (v) => (v ?? "").toString().trim().toLowerCase();
        const q = norm(qGlobal);
        return (datos || []).filter((r) => {
            const opId = String(r.operacionId ?? r.operacion ?? "").toLowerCase();
            const ger = norm(r.gerente);
            const st = String(r.estado || "").toUpperCase();
            const okEstado = estado === "TODOS" || st === estado;
            const okGlobal = !q || opId.includes(q) || ger.includes(q);
            const okOp = !f.operacion || opId.includes(norm(f.operacion));
            const okGer = !f.gerente || ger.includes(norm(f.gerente));
            return okEstado && okGlobal && okOp && okGer;
        });
    }, [datos, estado, qGlobal, f]);

    const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filtrados.length / pageSize));
    const rows = useMemo(() => {
        if (pageSize === 0) return filtrados;
        const start = (page - 1) * pageSize;
        return filtrados.slice(start, start + pageSize);
    }, [filtrados, page, pageSize]);

    // modal
    const [showModal, setShowModal] = useState(false);
    const [sel, setSel] = useState(null);
    const openModal = (op) => {
        setSel(op);
        setShowModal(true);
    };
    const closeModal = () => {
        setShowModal(false);
        setSel(null);
    };

    // Navegar
    const goToActualizacion = () => {
        try {
            window.dispatchEvent(new CustomEvent("lp:goto", { detail: "actualizacion" }));
        } catch {}
        try {
            const candidates = Array.from(document.querySelectorAll("aside button, aside a, nav button, nav a"));
            const target = candidates.find((el) => {
                const txt = (el.textContent || el.title || "").toLowerCase();
                return txt.includes("actualización de precios") || txt.includes("actualizacion de precios");
            });
            if (target) {
                target.click();
                return;
            }
        } catch {}
        try {
            localStorage.setItem("LP_TARGET_TAB", "actualizacion");
        } catch {}
    };

    // publicar/aprobar
    const [aprobandoOpId, setAprobandoOpId] = useState(null);
    const aprobarOperacion = async (operacion) => {
        if (!operacion) return;
        const st = String(operacion.estado || "").toUpperCase();

        // FIX: coherente con el botón (solo visible en PENDIENTE)
        if (st !== "PENDIENTE") {
            pushToast("Solo se puede publicar una operación en estado PENDIENTE.", "warning");
            return;
        }
        if (!canPublicar) {
            pushToast("No tienes permisos para publicar esta operación.", "warning");
            return;
        }
        if (!window.confirm(`¿Publicar la operación #${operacion.operacionId}?`)) return;

        const detalles = Array.isArray(operacion.detalles) ? operacion.detalles : [];
        const toNum = (x) => Number(x ?? 0);
        const payload = {
            Accion: "APROBAR",
            Usuario: operacion.usuario ?? null,
            Gerente: operacion.gerente ?? null,
            Iva: toNum(operacion.iva),
            Observacion: operacion.observacion ?? null,
            OperacionId: operacion.operacionId,
            Cambios: detalles.map((d) => ({
                Codigo: d.prId || d.pr_id || d.codigo || d.Codigo,
                PrecioActual: toNum(d.precioActual ?? d.precio_actual),
                IncrementoPct: toNum(d.incrementoPct ?? d.incremento_pct),
                NuevoPrecioLista: toNum(d.nuevoPrecio ?? d.nuevo_precio ?? d.nuevo_precio_lista),
                Niveles: [
                    d.niveles?.n1 ?? d.n1,
                    d.niveles?.n2 ?? d.n2,
                    d.niveles?.n3 ?? d.n3,
                    d.niveles?.n4 ?? d.n4,
                    d.niveles?.n5 ?? d.n5,
                    d.niveles?.n6 ?? d.n6,
                    d.niveles?.n7 ?? d.n7,
                    d.niveles?.n8 ?? d.n8,
                    d.niveles?.n9 ?? d.n9,
                ].map(toNum),
            })),
        };

        try {
            setAprobandoOpId(operacion.operacionId);
            const res = await fetch(OPERAR_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const txt = await res.text();
            let j;
            try {
                j = JSON.parse(txt);
            } catch {
                j = { ok: res.ok, raw: txt };
            }
            if (!res.ok || j?.ok === false) throw new Error(j?.error || j?.mensaje || "No se pudo publicar la operación.");

            pushToast(`✅ Operación #${operacion.operacionId} publicada.`, "success");
            closeModal();
            await cargar();
        } catch (e) {
            pushToast(`❌ Error publicando operación: ${e?.message || "desconocido"}`, "error");
        } finally {
            setAprobandoOpId(null);
        }
    };

    // validar
    const [validandoOpId, setValidandoOpId] = useState(null);
    const validarOperacion = async (operacion) => {
        if (!operacion) return;
        const st = String(operacion.estado || "").toUpperCase();
        if (st !== "EN VALIDACCION") {
            pushToast("Solo se pueden validar operaciones en estado EN VALIDACCION.", "warning");
            return;
        }
        if (!(canValidar || rolesNorm.includes("ADMIN"))) {
            pushToast("No tienes permisos para validar esta operación.", "warning");
            return;
        }
        if (!window.confirm(`¿Validar la operación #${operacion.operacionId}?`)) return;

        const detalles = Array.isArray(operacion.detalles) ? operacion.detalles : [];
        const toNum = (x) => Number(x ?? 0);
        const payload = {
            Accion: "VALIDAR",
            Usuario: operacion.usuario ?? null,
            Gerente: operacion.gerente ?? null,
            Iva: toNum(operacion.iva),
            Observacion: operacion.observacion ?? null,
            OperacionId: operacion.operacionId,
            Cambios: detalles.map((d) => ({
                Codigo: d.prId || d.pr_id || d.codigo || d.Codigo,
                PrecioActual: toNum(d.precioActual ?? d.precio_actual),
                IncrementoPct: toNum(d.incrementoPct ?? d.incremento_pct),
                NuevoPrecioLista: toNum(d.nuevoPrecio ?? d.nuevo_precio ?? d.nuevo_precio_lista),
                Niveles: [
                    d.niveles?.n1 ?? d.n1,
                    d.niveles?.n2 ?? d.n2,
                    d.niveles?.n3 ?? d.n3,
                    d.niveles?.n4 ?? d.n4,
                    d.niveles?.n5 ?? d.n5,
                    d.niveles?.n6 ?? d.n6,
                    d.niveles?.n7 ?? d.n7,
                    d.niveles?.n8 ?? d.n8,
                    d.niveles?.n9 ?? d.n9,
                ].map(toNum),
            })),
        };

        try {
            setValidandoOpId(operacion.operacionId);
            const res = await fetch(VALIDAR_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const txt = await res.text();
            let j;
            try {
                j = JSON.parse(txt);
            } catch {
                j = { ok: res.ok, raw: txt };
            }
            if (!res.ok || j?.ok === false) throw new Error(j?.error || j?.mensaje || "No se pudo validar la operación.");

            pushToast(`✅ Operación #${operacion.operacionId} validada.`, "success");
            closeModal();
            await cargar();
        } catch (e) {
            pushToast(`❌ Error validando operación: ${e?.message || "desconocido"}`, "error");
        } finally {
            setValidandoOpId(null);
        }
    };

    // finalizar — ahora usa endpoint dedicado FINALIZAR_URL
    const [finalizandoOpId, setFinalizandoOpId] = useState(null);
    const finalizarOperacion = async (operacion) => {
        if (!operacion) return;
        const st = String(operacion.estado || "").toUpperCase();
        if (st !== "VALIDADO") {
            pushToast("Solo se puede finalizar una operación en estado VALIDADO.", "warning");
            return;
        }
        if (!(rolesNorm.includes("ADMIN") || canPublicar)) {
            pushToast("No tienes permisos para finalizar esta operación.", "warning");
            return;
        }
        if (!window.confirm(`¿Finalizar la operación #${operacion.operacionId}?`)) return;

        // 🔹 Obtener identificación ANTES de crear el payload
        let identificacion = localStorage.getItem("identificacion");
        if (!identificacion) {
            identificacion = prompt("Ingresa tu identificación:");
            if (identificacion) localStorage.setItem("identificacion", identificacion);
        }

        const detalles = Array.isArray(operacion.detalles) ? operacion.detalles : [];
        const toNum = (x) => Number(x ?? 0);

        const payload = {
            Accion: "FINALIZAR",
            Usuario: identificacion,
            Identificacion: identificacion,
            Gerente: operacion.gerente ?? null,
            Iva: toNum(operacion.iva),
            Observacion: operacion.observacion ?? null,
            OperacionId: operacion.operacionId,
            Cambios: detalles.map((d) => ({
                Codigo: d.prId || d.pr_id || d.codigo || d.Codigo,
                PrecioActual: toNum(d.precioActual ?? d.precio_actual),
                IncrementoPct: toNum(d.incrementoPct ?? d.incremento_pct),
                NuevoPrecioLista: toNum(d.nuevoPrecio ?? d.nuevo_precio ?? d.nuevo_precio_lista),
                Niveles: [
                    d.niveles?.n1 ?? d.n1,
                    d.niveles?.n2 ?? d.n2,
                    d.niveles?.n3 ?? d.n3,
                    d.niveles?.n4 ?? d.n4,
                    d.niveles?.n5 ?? d.n5,
                    d.niveles?.n6 ?? d.n6,
                    d.niveles?.n7 ?? d.n7,
                    d.niveles?.n8 ?? d.n8,
                    d.niveles?.n9 ?? d.n9,
                ].map(toNum),
            })),
        };

        try {
            setFinalizandoOpId(operacion.operacionId);
            const res = await fetch(FINALIZAR_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const txt = await res.text();
            let j;
            try {
                j = JSON.parse(txt);
            } catch {
                j = { ok: res.ok, raw: txt };
            }
            if (!res.ok || j?.ok === false) throw new Error(j?.error || j?.mensaje || "No se pudo finalizar la operación.");

            setShowModalExito({
                id: operacion.operacionId,
                mensaje: `La operación #${operacion.operacionId} fue finalizada exitosamente y quedó registrada en la compañía de cambio de precios.`,
            });
            closeModal();
            await cargar();
        } catch (e) {
            pushToast(`❌ Error al finalizar: ${e?.message || "desconocido"}`, "error");
        } finally {
            setFinalizandoOpId(null);
        }
    };

    // eliminar
    const [eliminandoOpId, setEliminandoOpId] = useState(null);
    const eliminarOperacion = async (operacion) => {
        if (!operacion) return;
        const st = String(operacion.estado || "").toUpperCase();

        if (st !== "PENDIENTE") {
            pushToast("Solo se pueden eliminar operaciones en estado PENDIENTE.", "warning");
            return;
        }

        if (!window.confirm(`¿Eliminar la operación #${operacion.operacionId}? Esta acción dejará trazabilidad en el historial.`))
            return;

        let identificacion = localStorage.getItem("identificacion");
        if (!identificacion) {
            identificacion = prompt("Ingresa tu identificación:");
            if (identificacion) localStorage.setItem("identificacion", identificacion);
        }

        const payload = {
            operacionId: operacion.operacionId,
            identificacion
        };

        try {
            setEliminandoOpId(operacion.operacionId);
            const res = await fetch(`${apiBaseURL}/api/ListasPrecios/eliminar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const txt = await res.text();
            const j = JSON.parse(txt || "{}");

            if (!res.ok || j?.ok === false)
                throw new Error(j?.mensaje || "No se pudo eliminar la operación.");

            pushToast(`🗑️ Operación #${operacion.operacionId} eliminada.`, "success");
            await cargar();
        } catch (e) {
            pushToast(`❌ Error eliminando operación: ${e?.message || "desconocido"}`, "error");
        } finally {
            setEliminandoOpId(null);
        }
    };

    const [showModalExito, setShowModalExito] = useState(null);

    /* Tarjeta móvil */
    const TarjetaOperacion = ({ op }) => {
        const badge = estadoBadgeClass(op.estado);
        const st = String(op.estado || "").toUpperCase();
        return (
            <Card className="shadow-md">
                <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="text-xs text-gray-500">Lista</div>
                            <div className="text-base font-semibold text-gray-900">#{op.operacionId}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${badge}`}>
                            {String(op.estado || "-").toUpperCase()}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className="text-xs text-gray-500">Fecha</div>
                            <div className="text-sm text-gray-800">{op.fecha || "-"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Acción</div>
                            <div className="text-sm text-gray-800">{op.accion || "-"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Gerente</div>
                            <div className="text-sm text-gray-800">{op.gerente || "-"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">% IVA</div>
                            <div className="text-sm text-gray-800">{Number(op.iva ?? 0).toFixed(0)}%</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Productos</div>
                            <div className="text-sm text-gray-800">
                                {op?.totales?.productos ?? op?.productos ?? (op?.detalles?.length || 0)}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {st === "PENDIENTE" && String(op.estado || "").toUpperCase() !== "ELIMINADO" && (
                            <button
                                onClick={() => {
                                    localStorage.setItem("LP_LAST_OP_ID", String(op.operacionId));
                                    goToActualizacion();
                                }}
                                className={BTN_OUTLINE}>
                                Continuar en actualización
                            </button>
                        )}

                        {op && String(op.estado || "").toUpperCase() === "PENDIENTE" && (
                            <button
                                onClick={() => eliminarOperacion(op)}
                                disabled={eliminandoOpId && eliminandoOpId === op.operacionId}
                                className={`${BTN_TABLE_OUTLINE} text-rose-700 border-rose-300 hover:bg-rose-50`}
                            >
                                {eliminandoOpId && eliminandoOpId === op.operacionId ? "Eliminando…" : "Eliminar"}
                            </button>
                        )}

                        {st === "EN VALIDACCION" && (canValidar || rolesNorm.includes("ADMIN")) && (
                            <button
                                onClick={() => validarOperacion(op)}
                                disabled={validandoOpId === op.operacionId}
                                className={BTN_ACCENT}>
                                {validandoOpId === op.operacionId ? "Validando…" : "Validar"}
                            </button>
                        )}

                        {st === "PENDIENTE" && canPublicar && (
                            <button
                                onClick={() => aprobarOperacion(op)}
                                disabled={aprobandoOpId === op.operacionId}
                                className={BTN_ACCENT}>
                                {aprobandoOpId === op.operacionId ? "Publicando…" : "Publicar"}
                            </button>
                        )}

                        {st === "VALIDADO" && (rolesNorm.includes("ADMIN") || canPublicar) && (
                            <button
                                onClick={() => finalizarOperacion(op)}
                                disabled={finalizandoOpId === op.operacionId}
                                className={BTN_ACCENT}>
                                {finalizandoOpId === op.operacionId ? "Finalizando…" : "Finalizar"}
                            </button>
                        )}

                        <button onClick={() => openModal(op)} className={BTN_OUTLINE}>
                            Ver detalles
                        </button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <section
            ref={sectionRef}
            className="p-2 md:p-4 space-y-4 overflow-x-hidden [padding-bottom:env(safe-area-inset-bottom)]"
            style={{ minHeight: "100vh", paddingBottom: `${bottomPad}px`, overflowY: "auto", scrollBehavior: "smooth" }}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-end">
                    <div className="flex gap-4 items-end flex-1">
                        <div className="flex-1">
                            <UnderInput
                                label="Buscar"
                                value={qGlobal}
                                onChange={(v) => {
                                    setQGlobal(v);
                                    setPage(1);
                                }}
                                placeholder="Operación o gerente"
                                autoFocus
                            />
                        </div>

                        <SelectPlain
                            label="Estado"
                            value={estado}
                            onChange={(v) => {
                                setEstado(v);
                                setPage(1);
                            }}>
                            <option value="TODOS">Todos</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="APROBADO">Aprobado</option>
                            <option value="VALIDADO">Validado</option>
                            <option value="EN VALIDACCION">En validación</option>
                            <option value="RECHAZADO">Rechazado</option>
                        </SelectPlain>

                        <SelectPlain label="Filas" value={pageSize} onChange={applyPageSize}>
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n === 0 ? "Todos" : n}
                                </option>
                            ))}
                        </SelectPlain>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button
                            className={BTN_OUTLINE}
                            onClick={() => {
                                setQGlobal("");
                                setEstado("TODOS");
                                setF({ operacion: "", gerente: "" });
                                setPage(1);
                            }}>
                            Limpiar filtros
                        </button>

                        <button
                            className={BTN_ACCENT}
                            onClick={async () => {
                                try {
                                    const url = `${apiBaseURL}/api/ListasPrecios/exportar-excel`;
                                    const res = await fetch(url);
                                    if (!res.ok) throw new Error("Error al generar el archivo Excel.");

                                    const blob = await res.blob();
                                    const urlBlob = window.URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = urlBlob;
                                    a.download = `ListaPrecios_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(urlBlob);

                                    pushToast("✅ Archivo Excel descargado correctamente.", "success");
                                } catch (e) {
                                    pushToast(`❌ ${e.message || "Error descargando Excel"}`, "error");
                                }
                            }}>
                            Descargar Excel
                        </button>

                    </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                        Total: <b>{resumen.total}</b>
                    </span>
                    <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                        Pendientes: <b>{resumen.pend}</b>
                    </span>
                    <span className="px-2 py-1 rounded-md bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200">
                        En validación: <b>{resumen.enval}</b>
                    </span>
                    <span className="px-2 py-1 rounded-md bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200">
                        Validados: <b>{resumen.val}</b>
                    </span>
                    <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
                        Aprobados: <b>{resumen.aprob}</b>
                    </span>
                    <span className="px-2 py-1 rounded-md bg-rose-100 text-rose-800 ring-1 ring-rose-200">
                        Rechazados: <b>{resumen.rech}</b>
                    </span>
                </div>
            </div>

            {cargando && <div className="text-sm text-gray-600">Cargando operaciones…</div>}
            {error && <div className="text-sm text-rose-700">❌ {error}</div>}

            {/* Móvil */}
            {!cargando && !error && (
                <div className="md:hidden space-y-3">
                    {rows.length === 0 ? (
                        <div className="px-3 py-6 text-center text-gray-500">No hay registros para los criterios ingresados.</div>
                    ) : (
                        rows.map((op, i) => <TarjetaOperacion key={`${op.operacionId}-${i}`} op={op} />)
                    )}
                </div>
            )}

            {/* Escritorio */}
            {!cargando && !error && (
                <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow">
                    <table className="min-w-full text-sm border-separate border-spacing-0 rounded-2xl shadow overflow-hidden">
                        <thead>
                        <tr className="bg-gradient-to-r from-[#0D2A45] to-[#103654] text-white">
                            <th className="py-3 px-4 text-center font-semibold rounded-tl-2xl">LISTA</th>
                            <th className="py-3 px-4 text-left font-semibold">FECHA</th>
                            <th className="py-3 px-4 text-left font-semibold">ACCIÓN</th>
                            <th className="py-3 px-4 text-center font-semibold">ESTADO</th>
                            <th className="py-3 px-4 text-center font-semibold">GERENTE</th>
                            <th className="py-3 px-4 text-center font-semibold">% IVA</th>
                            <th className="py-3 px-4 text-center font-semibold">PRODUCTOS</th>
                            <th className="py-3 px-4 text-left font-semibold rounded-tr-2xl">ACCIÓN</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                                    No hay registros para los criterios ingresados.
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, i) => {
                                const st = String(r.estado || "").toUpperCase();
                                return (
                                    <tr
                                        key={`op-${r.operacionId}-${i}`}
                                        className={`${i % 2 ? "bg-white" : "bg-gray-50"} hover:bg-[#0D2A45]/5`}>
                                        <td className="py-3 px-4 text-center font-semibold text-slate-800">#{r.operacionId}</td>
                                        <td className="py-3 px-4">{r.fecha || "-"}</td>
                                        <td className="py-3 px-4">{r.accion || "-"}</td>
                                        <td className="py-3 px-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${estadoBadgeClass(st)}`}>
                                                    {st || "-"}
                                                </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">{r.gerente || "-"}</td>
                                        <td className="py-3 px-4 text-center">{Number(r.iva ?? 0).toFixed(0)}%</td>
                                        <td className="py-3 px-4 text-center">
                                            {r?.totales?.productos ?? r?.productos ?? r?.detalles?.length ?? 0}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col items-start gap-2">

                                                {st === "PENDIENTE" && String(r.estado || "").toUpperCase() !== "ELIMINADO" && (
                                                    <button
                                                        onClick={() => {
                                                            localStorage.setItem("LP_LAST_OP_ID", String(r.operacionId));
                                                            goToActualizacion();
                                                        }}
                                                        className={BTN_TABLE_OUTLINE}>
                                                        Continuar en actualización
                                                    </button>
                                                )}

                                                {st === "PENDIENTE" && (
                                                    <button
                                                        onClick={() => eliminarOperacion(r)}
                                                        disabled={eliminandoOpId === r.operacionId}
                                                        className={`${BTN_TABLE_OUTLINE} text-rose-700 border-rose-300 hover:bg-rose-50`}
                                                    >
                                                        {eliminandoOpId === r.operacionId ? "Eliminando…" : "Eliminar"}
                                                    </button>
                                                )}

                                                {st === "EN VALIDACCION" && (canValidar || rolesNorm.includes("ADMIN")) && (
                                                    <button
                                                        onClick={() => validarOperacion(r)}
                                                        disabled={validandoOpId === r.operacionId}
                                                        className={BTN_TABLE_ACCENT}>
                                                        {validandoOpId === r.operacionId ? "Validando…" : "Validar"}
                                                    </button>
                                                )}

                                                {st === "PENDIENTE" && canPublicar && (
                                                    <button
                                                        onClick={() => aprobarOperacion(r)}
                                                        disabled={aprobandoOpId === r.operacionId}
                                                        className={BTN_TABLE_ACCENT}>
                                                        {aprobandoOpId === r.operacionId ? "Publicando…" : "Publicar"}
                                                    </button>
                                                )}

                                                {st === "VALIDADO" && (rolesNorm.includes("ADMIN") || canPublicar) && (
                                                    <button
                                                        onClick={() => finalizarOperacion(r)}
                                                        disabled={finalizandoOpId === r.operacionId}
                                                        className={BTN_TABLE_ACCENT}>
                                                        {finalizandoOpId === r.operacionId ? "Finalizando…" : "Finalizar"}
                                                    </button>
                                                )}

                                                <button onClick={() => openModal(r)} className={BTN_TABLE_OUTLINE}>
                                                    Ver detalles
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>

                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t rounded-b-2xl">
                        <span className="text-sm text-gray-600">
                            {pageSize === 0
                                ? `Mostrando todos — ${filtrados.length} registros`
                                : `Página ${page} de ${totalPages} — ${filtrados.length} registros`}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className={BTN_TABLE_OUTLINE}
                                disabled={pageSize === 0 || page <= 1}>
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className={BTN_TABLE_OUTLINE}
                                disabled={pageSize === 0 || page >= totalPages}>
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && sel && (
                <div className="fixed inset-0 z-[9998] flex items-start md:items-center justify-center p-3 md:p-6">
                    <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
                    <div className="relative w-full max-w-[1100px] bg-white rounded-2xl shadow-2xl overflow-hidden z-[9999]">
                        <div className="bg-gradient-to-r from-[#0D2A45] to-[#103654] text-white px-5 py-4 flex items-center justify-between">
                            <h3 className="text-lg md:text-xl font-bold">
                                Lista #{sel.operacionId}
                            </h3>
                            <button onClick={closeModal} className="text-white/90 hover:text-white text-xl leading-none" aria-label="Cerrar">
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500">Estado</div>
                                    <div className={`inline-block mt-1 px-3 py-1.5 rounded-full text-xs font-semibold ${estadoBadgeClass(sel.estado)}`}>
                                        {String(sel.estado || "-").toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Fecha</div>
                                    <div className="text-sm text-gray-800">{sel.fecha || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Gerente</div>
                                    <div className="text-sm text-gray-800">{sel.gerente || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">% IVA</div>
                                    <div className="text-sm text-gray-800">{Number(sel.iva ?? 0).toFixed(0)}%</div>
                                </div>

                            </div>

                            <div className="flex flex-wrap justify-end gap-2">

                                {String(sel.estado || "").toUpperCase() === "PENDIENTE" && String(sel.estado || "").toUpperCase() !== "ELIMINADO" && (
                                    <button
                                        onClick={() => {
                                            localStorage.setItem("LP_LAST_OP_ID", String(sel.operacionId));
                                            goToActualizacion();
                                        }}
                                        className={BTN_TABLE_OUTLINE}>
                                        Continuar en actualización
                                    </button>
                                )}

                                {String(sel.estado || "").toUpperCase() === "PENDIENTE" && (
                                    <button
                                        onClick={() => eliminarOperacion(sel)}
                                        disabled={eliminandoOpId === sel.operacionId}
                                        className={`${BTN_TABLE_OUTLINE} text-rose-700 border-rose-300 hover:bg-rose-50`}
                                    >
                                        {eliminandoOpId === sel.operacionId ? "Eliminando…" : "Eliminar"}
                                    </button>
                                )}

                                {String(sel.estado || "").toUpperCase() === "EN VALIDACCION" &&
                                    (canValidar || rolesNorm.includes("ADMIN")) && (
                                        <button
                                            onClick={() => validarOperacion(sel)}
                                            disabled={validandoOpId === sel.operacionId}
                                            className={BTN_TABLE_ACCENT}>
                                            {validandoOpId === sel.operacionId ? "Validando…" : "Validar"}
                                        </button>
                                    )}

                                {String(sel.estado || "").toUpperCase() === "PENDIENTE" && canPublicar && (
                                    <button
                                        onClick={() => aprobarOperacion(sel)}
                                        disabled={aprobandoOpId === sel.operacionId}
                                        className={BTN_TABLE_ACCENT}>
                                        {aprobandoOpId === sel.operacionId ? "Publicando…" : "Publicar"}
                                    </button>
                                )}

                                {String(sel.estado || "").toUpperCase() === "VALIDADO" &&
                                    (rolesNorm.includes("ADMIN") || canPublicar) && (
                                        <button
                                            onClick={() => finalizarOperacion(sel)}
                                            disabled={finalizandoOpId === sel.operacionId}
                                            className={BTN_TABLE_ACCENT}>
                                            {finalizandoOpId === sel.operacionId ? "Finalizando…" : "Finalizar"}
                                        </button>
                                    )}
                            </div>

                            <div className="overflow-x-auto border rounded-xl max-h-[60vh] overflow-y-auto">
                                <table className="min-w-[900px] w-full text-sm">
                                    <thead>
                                    <tr className="bg-[#D9E6F2] text-[#0D2A45]">
                                        <th className="py-3 px-4 text-left font-semibold">CÓDIGO</th>
                                        <th className="py-3 px-4 text-left font-semibold">DESCRIPCIÓN</th>
                                        <th className="py-3 px-4 text-right font-semibold">PRECIO ACTUAL</th>
                                        <th className="py-3 px-4 text-center font-semibold">INC %</th>
                                        <th className="py-3 px-4 text-right font-semibold">NUEVO PRECIO</th>
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <th key={`lhm-${i}`} className="py-3 px-4 text-center font-semibold bg-[#E8F0F7] border-b border-[#C3D4E2]">
                                                L{i + 1}
                                            </th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {(sel.detalles || []).map((d, i) => {
                                        const toNum = (x) => Number(x ?? 0);
                                        const niveles = [
                                            d.niveles?.n1 ?? d.n1,
                                            d.niveles?.n2 ?? d.n2,
                                            d.niveles?.n3 ?? d.n3,
                                            d.niveles?.n4 ?? d.n4,
                                            d.niveles?.n5 ?? d.n5,
                                            d.niveles?.n6 ?? d.n6,
                                            d.niveles?.n7 ?? d.n7,
                                            d.niveles?.n8 ?? d.n8,
                                            d.niveles?.n9 ?? d.n9,
                                        ].map(toNum);
                                        const inc = toNum(d.incrementoPct ?? d.incremento_pct);
                                        const nuevoPrecio = toNum(d.nuevoPrecio ?? d.nuevo_precio ?? d.nuevo_precio_lista);
                                        const prId = d.prId || d.pr_id || d.codigo || d.Codigo || "-";
                                        return (
                                            <tr key={`det-${i}`} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                                                <td className="py-2 px-4 font-semibold text-slate-800">{prId}</td>
                                                <td className="py-2 px-4 text-gray-800">{d.prDesc || "-"}</td>
                                                <td className="py-2 px-4 text-right">{fmtCOP(d.precioActual ?? d.precio_actual ?? 0)}</td>
                                                <td className="py-2 px-4 text-center">{inc.toFixed(2)}%</td>
                                                <td className="py-2 px-4 text-right font-medium text-slate-800">{fmtCOP(nuevoPrecio)}</td>
                                                {niveles.map((n, idx) => (
                                                    <td
                                                        key={`niv-${i}-${idx}`}
                                                        className="py-2 px-4 text-right whitespace-nowrap min-w-[92px] bg-[#F1F6FA] border-b border-[#E0ECF4]">
                                                        {fmtCOP(n)}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                    {(!sel.detalles || sel.detalles.length === 0) && (
                                        <tr>
                                            <td colSpan={13} className="py-4 px-4 text-center text-gray-500">
                                                Sin detalles
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button onClick={closeModal} className={BTN_TABLE_OUTLINE}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toasts.length > 0 && (
                <div className="fixed top-3 left-1/2 -translate-x-1/2 md:top-auto md:left-auto md:translate-x-0 md:bottom-4 md:right-4 z-[9999] space-y-2 w-[calc(100%-1.5rem)] max-w-sm">
                    {toasts.map((t) => (
                        <ToastItem
                            key={t.id}
                            message={t.message}
                            variant={t.variant}
                            onClose={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
                        />
                    ))}
                </div>
            )}

            {showModalExito && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center animate-[fadeIn_.3s_ease-in]">
                        <div className="text-5xl text-emerald-500 mb-4">✔</div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Proceso exitoso</h2>
                        <p className="text-gray-700 mb-6">
                            {showModalExito.mensaje}
                        </p>
                        <button
                            onClick={() => setShowModalExito(null)}
                            className="bg-[#0D2A45] text-white px-6 py-2 rounded-lg hover:bg-[#0D2A45]/90 transition"
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
