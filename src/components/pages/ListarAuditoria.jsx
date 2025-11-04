// src/components/pages/ListarAuditoria.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getConfig } from "../../config/config";

/* ==== UI helpers (mismos que ListarCambios) ==== */
const Card = ({ className = "", children, ...rest }) => (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`} {...rest}>{children}</div>
);
const CardContent = ({ className = "", children }) => <div className={`p-4 ${className}`}>{children}</div>;
const UnderInput = ({ label, type="text", value, onChange, placeholder, autoFocus }) => (
    <label className="flex flex-col">
        {label && <span className="text-sm font-medium text-gray-700 mb-1">{label}</span>}
        <input
            type={type}
            value={value ?? ""}
            onChange={(e)=> onChange(e.target.value)}
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
            onChange={(e)=> onChange(e.target.value)}
            className="px-0 py-2 bg-transparent border-0 border-b border-gray-300 focus:outline-none focus:ring-0 focus:border-[#0D2A45]"
        >
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
                <button onClick={onClose} className="ml-auto text-xs opacity-80 hover:opacity-100" aria-label="Cerrar">✕</button>
            </div>
        </div>
    );
};
/* ==== util ==== */
const fmtCOP = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 0];
const estadoBadgeClass = (estado) => {
    const st = String(estado || "").toUpperCase();
    if (st === "APROBADO")  return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
    if (st === "PENDIENTE") return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
    if (st === "RECHAZADO") return "bg-rose-100 text-rose-800 ring-1 ring-rose-200";
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
};

export default function ListarAuditoria() {
    const { apiBaseURL } = getConfig();
    const API_URL = `${apiBaseURL}/api/ListasPrecios/listar-auditoria`;

    const [raw, setRaw] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [toasts, setToasts] = useState([]);
    const pushToast = (message, variant = "info", ttlMs = 3000) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, message, variant }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ttlMs);
    };

    // filtros
    const [estado, setEstado] = useState("TODOS"); // PENDIENTE | APROBADO | RECHAZADO | TODOS
    const [qGlobal, setQGlobal] = useState("");
    const [f, setF] = useState({ operacion: "", gerente: "" });

    // paginación
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const applyPageSize = (n) => { setPageSize(Number(n)); setPage(1); };

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
        setCargando(true); setError("");
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error((await res.text()) || "HTTP error");
            const j = await res.json().catch(() => ({}));
            const arr = Array.isArray(j) ? j : j?.datos || j?.data || [];
            setRaw(arr);
            if (!Array.isArray(j) && j?.ok === false) pushToast("El servicio devolvió un error.", "warning");
        } catch (e) {
            setError(e?.message || "Error al consultar auditoría.");
            pushToast(`❌ ${e?.message || "Error al consultar auditoría."}`, "error");
            setRaw([]);
        } finally {
            setCargando(false);
        }
    };
    useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [API_URL]);

    // === Agrupar por operación ===
    const grupos = useMemo(() => {
        const map = new Map();
        const toNum = (x) => Number(x ?? 0);

        for (const r of (raw || [])) {
            const operacionId = r.operacionId ?? r.OperacionId ?? r.operacion?.id ?? 0;
            if (!operacionId) continue;

            const estadoOp = (r.operacion?.estado ?? r.estadoNuevo ?? "").toString();
            const accionOp = (r.operacion?.accion ?? r.accion ?? "").toString();
            const gerente  = r.operacion?.gerente ?? r.gerente ?? "";
            const iva      = toNum(r.operacion?.iva ?? r.iva ?? 0);
            const fecha    = r.operacion?.fecha ?? r.fecha ?? "";
            const productos= r.totales?.productos ?? ((r.detalles || []).length);

            const rev = {
                auditoriaId : r.auditoriaId ?? 0,
                operacionId,
                fecha,
                usuario      : r.usuario ?? "",
                gerente,
                accion       : r.accion ?? accionOp ?? "",
                estadoAnterior: r.estadoAnterior ?? "",
                estadoNuevo  : r.estadoNuevo ?? estadoOp ?? "",
                observacion  : r.observacion ?? "",
                revisionNum  : r.revisionNum ?? 0,
                detalles     : r.detalles ?? [],
                iva,
            };

            if (!map.has(operacionId)) {
                map.set(operacionId, {
                    operacionId,
                    estadoActual: estadoOp,
                    accionActual: accionOp,
                    gerente,
                    iva,
                    fechaUltima: fecha,
                    productos,
                    revisiones: [rev],
                });
            } else {
                const g = map.get(operacionId);
                g.revisiones.push(rev);
                const maxRev = Math.max(...g.revisiones.map(x => Number(x.revisionNum || 0)));
                if (Number(rev.revisionNum || 0) >= maxRev) {
                    g.estadoActual = estadoOp || rev.estadoNuevo || g.estadoActual;
                    g.accionActual = accionOp || rev.accion || g.accionActual;
                    g.gerente      = gerente || g.gerente;
                    g.iva          = iva || g.iva;
                    g.fechaUltima  = fecha || g.fechaUltima;
                    g.productos    = productos || g.productos;
                }
            }
        }

        const out = Array.from(map.values()).map(g => ({
            ...g,
            revisiones: [...g.revisiones].sort((a,b) => Number(b.revisionNum||0) - Number(a.revisionNum||0)),
        }));

        return out.sort((a,b) => {
            const tA = Date.parse(a.fechaUltima || "") || 0;
            const tB = Date.parse(b.fechaUltima || "") || 0;
            return (tB - tA) || ((b.operacionId || 0) - (a.operacionId || 0));
        });
    }, [raw]);

    const resumen = useMemo(() => {
        const total = grupos.length;
        const pend  = grupos.filter(g => String(g.estadoActual || "").toUpperCase() === "PENDIENTE").length;
        const aprob = grupos.filter(g => String(g.estadoActual || "").toUpperCase() === "APROBADO").length;
        return { total, pend, aprob };
    }, [grupos]);

    // filtro listado
    const filtrados = useMemo(() => {
        const norm = (v) => (v ?? "").toString().trim().toLowerCase();
        const q = norm(qGlobal);
        return (grupos || []).filter((g) => {
            const opId = String(g.operacionId ?? "").toLowerCase();
            const ger  = norm(g.gerente);
            const st   = String(g.estadoActual || "").toUpperCase();

            const okEstado = estado === "TODOS" || st === estado;
            const okGlobal = !q || opId.includes(q) || ger.includes(q);
            const okOp     = !f.operacion || opId.includes(norm(f.operacion));
            const okGer    = !f.gerente || ger.includes(norm(f.gerente));
            return okEstado && okGlobal && okOp && okGer;
        });
    }, [grupos, estado, qGlobal, f]);

    // paginación
    const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filtrados.length / pageSize));
    const rows = useMemo(() => {
        if (pageSize === 0) return filtrados;
        const start = (page - 1) * pageSize;
        return filtrados.slice(start, start + pageSize);
    }, [filtrados, page, pageSize]);

    // modal
    const [showModal, setShowModal] = useState(false);
    const [selOp, setSelOp] = useState(null);
    const [selRev, setSelRev] = useState(null);
    const openModal = (grupo) => {
        setSelOp(grupo);
        const rev0 = (grupo?.revisiones || [])[0] ?? null; // más reciente
        setSelRev(rev0);
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); setSelOp(null); setSelRev(null); };

    // móvil
    const TarjetaOperacion = ({ op }) => {
        const badge = estadoBadgeClass(op.estadoActual);
        return (
            <Card className="shadow-md">
                <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="text-xs text-gray-500">Operación</div>
                            <div className="text-base font-semibold text-gray-900">#{op.operacionId}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${badge}`}>{String(op.estadoActual || "-").toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><div className="text-xs text-gray-500">Fecha</div><div className="text-sm text-gray-800">{op.fechaUltima || "-"}</div></div>
                        <div><div className="text-xs text-gray-500">Acción</div><div className="text-sm text-gray-800">{op.accionActual || "-"}</div></div>
                        <div><div className="text-xs text-gray-500">Gerente</div><div className="text-sm text-gray-800">{op.gerente || "-"}</div></div>
                        <div><div className="text-xs text-gray-500">% IVA</div><div className="text-sm text-gray-800">{Number(op.iva ?? 0).toFixed(0)}%</div></div>
                        <div><div className="text-xs text-gray-500">Revisiones</div><div className="text-sm text-gray-800">{op.revisiones?.length || 0}</div></div>
                        <div><div className="text-xs text-gray-500">Productos</div><div className="text-sm text-gray-800">{op.productos ?? 0}</div></div>
                    </div>
                    <div className="flex items-center justify-end">
                        <button
                            onClick={() => openModal(op)}
                            className="px-3 py-1.5 rounded-md bg-gradient-to-r from-[#0D2A45] to-[#103654] text-white text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0D2A45]/40"
                        >
                            Ver historial
                        </button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // ===== Render =====
    return (
        <section
            ref={sectionRef}
            className="p-2 md:p-4 space-y-4 overflow-x-hidden [padding-bottom:env(safe-area-inset-bottom)]"
            style={{ minHeight: "100vh", paddingBottom: `${bottomPad}px`, overflowY: "auto", scrollBehavior: "smooth" }}
        >
            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-end">
                    <div className="flex gap-4 items-end flex-1">
                        <div className="flex-1">
                            <UnderInput
                                label="Buscar"
                                value={qGlobal}
                                onChange={(v)=> { setQGlobal(v); setPage(1); }}
                                placeholder="Operación o gerente"
                                autoFocus
                            />
                        </div>
                        <SelectPlain label="Estado" value={estado} onChange={(v)=>{ setEstado(v); setPage(1); }}>
                            <option value="TODOS">Todos</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="APROBADO">Aprobado</option>
                        </SelectPlain>
                        <SelectPlain label="Filas" value={pageSize} onChange={applyPageSize}>
                            {PAGE_SIZE_OPTIONS.map(n => (<option key={n} value={n}>{n === 0 ? "Todos" : n}</option>))}
                        </SelectPlain>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            className="px-3 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                            onClick={() => { setQGlobal(""); setEstado("TODOS"); setF({ operacion:"", gerente:"" }); setPage(1); }}
                        >
                            Limpiar filtros
                        </button>
                        <button
                            className="px-3 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                            onClick={cargar}
                            disabled={cargando}
                        >
                            {cargando ? "Actualizando…" : "Refrescar"}
                        </button>
                    </div>
                </div>

                {/* Chips de resumen */}
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 ring-1 ring-slate-200">Operaciones: <b>{resumen.total}</b></span>
                    <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 ring-1 ring-amber-200">Pendientes: <b>{resumen.pend}</b></span>
                    <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">Aprobadas: <b>{resumen.aprob}</b></span>
                </div>
            </div>

            {cargando && <div className="text-sm text-gray-600">Cargando auditoría…</div>}
            {error && <div className="text-sm text-rose-700">❌ {error}</div>}

            {/* Móvil: tarjetas por operación */}
            {!cargando && !error && (
                <div className="md:hidden space-y-3">
                    {rows.length === 0
                        ? <div className="px-3 py-6 text-center text-gray-500">No hay registros para los criterios ingresados.</div>
                        : rows.map((op, i) => <TarjetaOperacion key={`${op.operacionId}-${i}`} op={op} />)
                    }
                </div>
            )}

            {/* Escritorio: tabla de operaciones */}
            {!cargando && !error && (
                <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow">
                    <table className="min-w-full text-sm border-separate border-spacing-0 rounded-2xl shadow overflow-hidden">
                        <thead>
                        <tr className="bg-gradient-to-r from-[#0D2A45] to-[#103654] text-white">
                            <th className="py-3 px-4 text-center font-semibold rounded-tl-2xl">OPERACIÓN</th>
                            <th className="py-3 px-4 text-left font-semibold">FECHA</th>
                            <th className="py-3 px-4 text-left font-semibold">ACCIÓN</th>
                            <th className="py-3 px-4 text-center font-semibold">ESTADO</th>
                            <th className="py-3 px-4 text-center font-semibold">GERENTE</th>
                            <th className="py-3 px-4 text-center font-semibold">% IVA</th>
                            <th className="py-3 px-4 text-center font-semibold">REVISIONES</th>
                            <th className="py-3 px-4 text-center font-semibold">PRODUCTOS</th>
                            <th className="py-3 px-4 text-center font-semibold rounded-tr-2xl">ACCIÓN</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                                    No hay registros para los criterios ingresados.
                                </td>
                            </tr>
                        ) : rows.map((g, i) => {
                            const st = String(g.estadoActual || "").toUpperCase();
                            return (
                                <tr key={`op-${g.operacionId}-${i}`} className={`${i % 2 ? "bg-white" : "bg-gray-50"} hover:bg-[#0D2A45]/5`}>
                                    <td className="py-3 px-4 text-center font-semibold text-slate-800">#{g.operacionId}</td>
                                    <td className="py-3 px-4">{g.fechaUltima || "-"}</td>
                                    <td className="py-3 px-4">{g.accionActual || "-"}</td>
                                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${estadoBadgeClass(st)}`}>
                        {st || "-"}
                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">{g.gerente || "-"}</td>
                                    <td className="py-3 px-4 text-center">{Number(g.iva ?? 0).toFixed(0)}%</td>
                                    <td className="py-3 px-4 text-center">{g.revisiones?.length || 0}</td>
                                    <td className="py-3 px-4 text-center">{g.productos ?? 0}</td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => openModal(g)}
                                                className="px-3 py-1.5 rounded-md bg-gradient-to-r from-[#0D2A45] to-[#103654] text-white text-xs font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#0D2A45]/40"
                                            >
                                                Ver historial
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>

                    {/* Paginación */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t rounded-b-2xl">
            <span className="text-sm text-gray-600">
              {pageSize === 0
                  ? `Mostrando todos — ${filtrados.length} registros`
                  : `Página ${page} de ${totalPages} — ${filtrados.length} registros`}
            </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 disabled:opacity-50 hover:bg-slate-100"
                                disabled={pageSize === 0 || page <= 1}
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 disabled:opacity-50 hover:bg-slate-100"
                                disabled={pageSize === 0 || page >= totalPages}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: historial + detalle (sin “Usuario”) */}
            {showModal && selOp && (
                <div className="fixed inset-0 z-[9998] flex items-start md:items-center justify-center p-3 md:p-6">
                    <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
                    <div className="relative w-full max-w-[1200px] bg-white rounded-2xl shadow-2xl overflow-hidden z-[9999]">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#0D2A45] to-[#103654] text-white px-5 py-4 flex items-center justify-between">
                            <h3 className="text-lg md:text-xl font-bold">
                                Historial Operación #{selOp.operacionId} — {selOp.accionActual || "-"}
                            </h3>
                            <button onClick={closeModal} className="text-white/90 hover:text-white text-xl leading-none" aria-label="Cerrar">✕</button>
                        </div>

                        {/* Info operación */}
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500">Estado actual</div>
                                    <div className={`inline-block mt-1 px-3 py-1.5 rounded-full text-xs font-semibold ${estadoBadgeClass(selOp.estadoActual)}`}>
                                        {String(selOp.estadoActual || "-").toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Fecha última</div>
                                    <div className="text-sm text-gray-800">{selOp.fechaUltima || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Gerente</div>
                                    <div className="text-sm text-gray-800">{selOp.gerente || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">% IVA</div>
                                    <div className="text-sm text-gray-800">{Number(selOp.iva ?? 0).toFixed(0)}%</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Revisiones</div>
                                    <div className="text-sm text-gray-800">{selOp.revisiones?.length || 0}</div>
                                </div>
                            </div>

                            {/* Revisiones (sin “Usuario”) */}
                            <div className="border rounded-xl overflow-hidden">
                                <div className="bg-[#D9E6F2] text-[#0D2A45] px-4 py-2 font-semibold">Revisiones</div>
                                <ul className="divide-y">
                                    {(selOp.revisiones || []).map((rv) => {
                                        const active = selRev?.revisionNum === rv.revisionNum;
                                        return (
                                            <li
                                                key={`rev-${rv.revisionNum}`}
                                                onClick={() => setSelRev(rv)}
                                                className={`px-4 py-3 flex flex-col md:flex-row md:items-center gap-2 ${active ? "bg-[#0D2A45]/10" : "bg-white"} cursor-pointer hover:bg-[#0D2A45]/5`}
                                            >
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-slate-800">Rev #{rv.revisionNum} — {rv.fecha || "-"}</div>
                                                    <div className="text-xs text-slate-600">
                                                        Estado: <b>{rv.estadoAnterior || "-"}</b> → <b>{rv.estadoNuevo || "-"}</b> &nbsp;•&nbsp;
                                                        Acción: <b>{rv.accion || "-"}</b>
                                                    </div>
                                                    {rv.observacion && <div className="text-xs text-slate-600 mt-1">Obs: {rv.observacion}</div>}
                                                </div>
                                            </li>
                                        );
                                    })}
                                    {(!selOp.revisiones || selOp.revisiones.length === 0) && (
                                        <li className="px-4 py-4 text-center text-gray-500">Sin revisiones</li>
                                    )}
                                </ul>
                            </div>

                            {/* Detalle de la revisión seleccionada */}
                            <div className="overflow-x-auto border rounded-xl">
                                <table className="min-w-[1000px] w-full text-sm">
                                    <thead>
                                    <tr className="bg-[#D9E6F2] text-[#0D2A45]">
                                        <th className="py-3 px-4 text-left font-semibold">CÓDIGO</th>
                                        <th className="py-3 px-4 text-right font-semibold">PRECIO ANTERIOR</th>
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
                                    {(selRev?.detalles || []).map((d, i) => {
                                        const toNum = (x) => Number(x ?? 0);
                                        const nv = d.niveles || {};
                                        const niveles = [nv.n1, nv.n2, nv.n3, nv.n4, nv.n5, nv.n6, nv.n7, nv.n8, nv.n9].map(toNum);
                                        const inc = toNum(d.incrementoPct);
                                        const nuevoPrecio = toNum(d.nuevoPrecio);
                                        const prId = d.prId || d.pr_id || d.codigo || d.Codigo || "-";
                                        return (
                                            <tr key={`det-${i}`} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                                                <td className="py-2 px-4 font-semibold text-slate-800">{prId}</td>
                                                <td className="py-2 px-4 text-right">{fmtCOP(d.precioAnterior ?? 0)}</td>
                                                <td className="py-2 px-4 text-center">{inc.toFixed(2)}%</td>
                                                <td className="py-2 px-4 text-right font-medium text-slate-800">{fmtCOP(nuevoPrecio)}</td>
                                                {niveles.map((n, idx) => (
                                                    <td key={`niv-${i}-${idx}`} className="py-2 px-4 text-right whitespace-nowrap min-w-[92px] bg-[#F1F6FA] border-b border-[#E0ECF4]">
                                                        {fmtCOP(n)}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                    {(!selRev?.detalles || selRev.detalles.length === 0) && (
                                        <tr><td colSpan={13} className="py-4 px-4 text-center text-gray-500">Sin detalles</td></tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toasts responsivos */}
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
        </section>
    );
}
