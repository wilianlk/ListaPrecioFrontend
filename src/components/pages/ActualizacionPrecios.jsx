// src/components/pages/ActualizacionPrecios.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getConfig } from "../../config/config";

/* ===========================
   UI mínima dentro del MISMO archivo
   =========================== */

// Card
const Card = ({ className = "", children }) => (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>{children}</div>
);

const CardContent = ({ className = "", children }) => (
    <div className={`p-4 ${className}`}>{children}</div>
);

// Button
const Button = ({ variant = "default", className = "", children, disabled, ...props }) => {
    const base =
        "px-4 py-2 rounded-xl text-sm font-medium border transition disabled:opacity-60 disabled:cursor-not-allowed";
    const styles = {
        default: "bg-[#0D2A45] text-white border-[#0D2A45] hover:brightness-95",
        secondary: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200",
        outline: "bg-transparent text-[#0D2A45] border-[#0D2A45] hover:bg-[#0D2A45]/5",
    };
    return (
        <button className={`${base} ${styles[variant]} ${className}`} disabled={disabled} {...props}>
            {children}
        </button>
    );
};

// Input
const Input = ({ className = "", ...props }) => (
    <input
        className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D2A45]/40 ${className}`}
        {...props}
    />
);

// Select compatible (Select, SelectItem, SelectTrigger, SelectValue, SelectContent)
const SelectItem = ({ value, children }) => null;
SelectItem.displayName = "SelectItem";
const SelectValue = () => null;
SelectValue.displayName = "SelectValue";
const SelectTrigger = ({ className = "", children }) => null;
SelectTrigger.displayName = "SelectTrigger";
const SelectContent = ({ children }) => <>{children}</>;
SelectContent.displayName = "SelectContent";

function Select({ onValueChange, defaultValue = "", value: controlled, children, className = "" }) {
    const [val, setVal] = useState(controlled ?? defaultValue ?? "");
    const extract = (nodes) => {
        const items = [];
        let placeholder;
        const walk = (n) => {
            React.Children.forEach(n, (child) => {
                if (!React.isValidElement(child)) return;
                const typeName = child.type?.displayName;
                if (typeName === "SelectItem") {
                    items.push({ value: child.props.value, label: child.props.children });
                } else if (typeName === "SelectValue") {
                    placeholder = child.props?.placeholder;
                }
                if (child.props?.children) walk(child.props.children);
            });
        };
        walk(nodes);
        return { items, placeholder };
    };
    const { items, placeholder } = extract(children);

    useEffect(() => {
        if (onValueChange) onValueChange(val);
    }, [val]); // eslint-disable-line

    return (
        <select
            className={`border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2A45]/40 ${className}`}
            value={val}
            onChange={(e) => setVal(e.target.value)}
        >
            <option value="" disabled hidden>
                {placeholder || "Seleccionar..."}
            </option>
            {items.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}

/* ===========================
   Toast mínimo (sin librerías)
   =========================== */

const ToastItem = ({ message, variant = "info", onClose }) => {
    const palette = {
        info: "bg-[#0D2A45] text-white border-[#0A1E31]",
        success: "bg-green-600 text-white border-green-700",
        error: "bg-red-600 text-white border-red-700",
        warning: "bg-yellow-500 text-black border-yellow-600",
    };
    return (
        <div
            className={`min-w-[220px] max-w-[360px] border rounded-lg shadow-lg px-4 py-3 ${palette[variant]} animate-[fadeIn_.2s_ease-in]`}
        >
            <div className="flex items-start gap-3">
                <span className="text-sm leading-5">{message}</span>
                <button onClick={onClose} className="ml-auto text-xs opacity-80 hover:opacity-100" aria-label="Cerrar">
                    ✕
                </button>
            </div>
        </div>
    );
};

/* ===========================
   Utilidades de cálculo
   =========================== */

const redondearCentena = (v) => Math.round((Number(v) || 0) / 100) * 100;

// Permitir >100 (solo limitar por abajo en 0)
const toPctInt = (x) => {
    const n = Number(x);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, n);
};

function extraerPorcentajes(descAplicados = {}, descCategoria = {}) {
    return Array.from({ length: 9 }, (_, i) => {
        const keyA = `pr${i + 1}`;
        const keyC = `prd_pr${i + 1}`;
        const fromA = descAplicados?.[keyA]?.valor;
        const fromC = descCategoria?.[keyC];
        return toPctInt(fromA ?? fromC ?? 0);
    });
}

/** Cálculo base (sin reglas especiales) */
function calcularNivelesBase(base, porcentajes = []) {
    const b = Number(base || 0);
    return Array.from({ length: 9 }, (_, i) => redondearCentena(b * (toPctInt(porcentajes[i]) / 100)));
}

/** Cálculo con reglas:
 *  - L4 (índice 3): se conserva el valor previo si está disponible.
 *  - L6 (índice 5): se calcula normal y luego +19%.
 */
function calcularNiveles(base, porcentajes = [], nivelesAnteriores = []) {
    const b = Number(base || 0);
    return Array.from({ length: 9 }, (_, i) => {
        if (i === 3 && nivelesAnteriores?.[3] != null) {
            return Number(nivelesAnteriores[3]) || 0;
        }
        let valor = b * (toPctInt(porcentajes[i]) / 100);
        if (i === 5) {
            valor = valor * 1.19;
        }
        return redondearCentena(valor);
    });
}

/* ===========================
   Fila de tabla (memo) con estado local
   =========================== */

const RowProducto = React.memo(function RowProducto({ p, valorGlobal, onCommit }) {
    const [local, setLocal] = useState(() => (valorGlobal ?? "0"));

    useEffect(() => {
        setLocal(valorGlobal ?? "0");
    }, [valorGlobal, p.codigo]);

    const incNum = useMemo(() => {
        const n = parseFloat(local);
        return Number.isFinite(n) ? n : 0;
    }, [local]);

    const nuevoPrecioLista = useMemo(() => {
        return incNum === 0 ? Number(p.precioLista) : redondearCentena(p.precioLista * (1 + incNum / 100));
    }, [incNum, p.precioLista]);

    const niveles = useMemo(() => {
        return calcularNiveles(nuevoPrecioLista, p.porcentajes, p.nivelesPrevios);
    }, [nuevoPrecioLista, p.porcentajes, p.nivelesPrevios]);

    const commitValor = useCallback(
        (raw) => {
            const vRaw = (raw ?? "").toString().trim();
            const v = vRaw === "" ? "0" : vRaw;
            setLocal(v);
            onCommit(p.codigo, v);
        },
        [onCommit, p.codigo]
    );

    return (
        <tr className="hover:bg-[#0D2A45]/5">
            <td className="px-3 py-3 text-center whitespace-nowrap">{p.codigoBarras}</td>
            <td className="px-3 py-3 text-center whitespace-nowrap font-semibold text-slate-800">{p.codigo}</td>
            <td className="px-3 py-3 text-left min-w-[260px]">{p.producto}</td>
            <td className="px-3 py-3 text-center whitespace-nowrap">{p.presentacion}</td>
            <td className="px-3 py-3 text-right whitespace-nowrap">
                ${Number(p.precioLista).toLocaleString("es-CO")}
            </td>
            <td className="px-3 py-3 text-center whitespace-nowrap">
                <Input
                    type="number"
                    step="any"
                    value={local}
                    onFocus={(e) => {
                        if (local === "0" || local === 0 || local === "") setLocal("");
                        e.target.select();
                    }}
                    onChange={(e) => setLocal(e.target.value)}
                    onBlur={(e) => commitValor(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                            setLocal("0");
                            requestAnimationFrame(() => e.currentTarget.blur());
                        }
                    }}
                    className="w-20 text-center"
                />
            </td>
            <td className="px-3 py-3 text-right whitespace-nowrap">
                ${Number(nuevoPrecioLista).toLocaleString("es-CO")}
            </td>

            {niveles.map((nivel, idx) => (
                <td
                    key={`lvl-${p.codigo}-${idx}`}
                    className="px-3 py-2 text-right align-top whitespace-nowrap bg-[#F1F6FA] border-b border-[#E0ECF4] min-w-[110px]"
                >
                    <div className="text-[11px] font-semibold text-[#0D2A45] mb-1 text-right">
                        {Number(p.porcentajes[idx]).toFixed(0)}%
                    </div>
                    <div>${Number(nivel).toLocaleString("es-CO")}</div>
                </td>
            ))}
            <td className="px-3 py-2"></td>
        </tr>
    );
});

/* ===========================
   Tarjeta móvil (memo) con estado local
   =========================== */

const CardProducto = React.memo(function CardProducto({ p, valorGlobal, onCommit }) {
    const [local, setLocal] = useState(() => (valorGlobal ?? "0"));

    useEffect(() => {
        setLocal(valorGlobal ?? "0");
    }, [valorGlobal, p.codigo]);

    const incNum = useMemo(() => {
        const n = parseFloat(local);
        return Number.isFinite(n) ? n : 0;
    }, [local]);

    const nuevoPrecioLista = useMemo(() => {
        return incNum === 0 ? Number(p.precioLista) : redondearCentena(p.precioLista * (1 + incNum / 100));
    }, [incNum, p.precioLista]);

    const niveles = useMemo(() => {
        return calcularNiveles(nuevoPrecioLista, p.porcentajes, p.nivelesPrevios);
    }, [nuevoPrecioLista, p.porcentajes, p.nivelesPrevios]);

    const commitValor = useCallback(
        (raw) => {
            const vRaw = (raw ?? "").toString().trim();
            const v = vRaw === "" ? "0" : vRaw;
            setLocal(v);
            onCommit(p.codigo, v);
        },
        [onCommit, p.codigo]
    );

    return (
        <Card className="shadow-md">
            <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-xs text-gray-500">Código</div>
                        <div className="text-sm font-semibold text-gray-900 truncate">{p.codigo}</div>
                        <div className="text-xs text-gray-500 mt-1">Producto</div>
                        <div className="text-sm text-gray-800 truncate">{p.producto}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500">Presentación</div>
                        <div className="text-sm text-gray-800">{p.presentacion}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <div className="text-xs text-gray-500">Precio actual</div>
                        <div className="text-sm font-medium text-gray-900">
                            ${Number(p.precioLista).toLocaleString("es-CO")}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">% Incremento</div>
                        <Input
                            type="number"
                            step="any"
                            value={local}
                            onFocus={(e) => {
                                if (local === "0" || local === 0 || local === "") setLocal("");
                                e.target.select();
                            }}
                            onChange={(e) => setLocal(e.target.value)}
                            onBlur={(e) => commitValor(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                                if (e.key === "Escape") {
                                    setLocal("0");
                                    requestAnimationFrame(() => e.currentTarget.blur());
                                }
                            }}
                            className="w-full text-center"
                        />
                    </div>
                    <div className="col-span-2">
                        <div className="text-xs text-gray-500">Nuevo precio de lista</div>
                        <div className="text-sm font-semibold text-gray-900">
                            ${Number(nuevoPrecioLista).toLocaleString("es-CO")}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="text-xs text-gray-500 mb-1">Niveles (L1..L9)</div>
                    <div className="-mx-1 px-1 flex gap-2 overflow-x-auto pb-1">
                        {niveles.map((nivel, idx) => (
                            <div
                                key={`m-lvl-${p.codigo}-${idx}`}
                                className="min-w-[92px] px-2 py-1 rounded-xl border bg-[#F1F6FA] text-right"
                            >
                                <div className="text-[10px] font-semibold text-[#0D2A45] flex items-center justify-between">
                                    <span>L{idx + 1}</span>
                                    <span>{Number(p.porcentajes[idx]).toFixed(0)}%</span>
                                </div>
                                <div className="text-xs">${Number(nivel).toLocaleString("es-CO")}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

/* ===========================
   Componente principal
   =========================== */

function ActualizacionPrecios() {
    const { apiBaseURL } = getConfig();
    const API_OPERAR_URL = `${apiBaseURL}/api/ListasPrecios/operar`;

    const [iva, setIva] = useState(19);
    const [filtro, setFiltro] = useState("");
    const [busqueda, setBusqueda] = useState("");

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [productos, setProductos] = useState([]);

    // % incremento COMMITeado por fila (estado global mínimo)
    const [incrementos, setIncrementos] = useState({});

    // Estado de operación (guardar/aprobar) para deshabilitar botones
    const [operando, setOperando] = useState(false);

    // NUEVO: id de operación existente (si se cargó desde LP_LAST_OP_ID)
    const [operacionId, setOperacionId] = useState(null);

    // Toasts
    const [toasts, setToasts] = useState([]);
    const pushToast = (message, variant = "info", ttlMs = 3200) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, message, variant }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, ttlMs);
    };
    const closeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

    useEffect(() => {
        let cancelado = false;
        const fetchData = async () => {
            setCargando(true);
            setError("");
            try {
                const url = `${apiBaseURL}/api/ListasPrecios/catalogo-descuentos`;
                const res = await fetch(url);
                if (!res.ok) throw new Error((await res.text()) || "Error HTTP al consultar catálogo.");
                const j = await res.json();
                const registros = Array.isArray(j) ? j : j?.datos || j?.data || [];
                if (!cancelado) setProductos(registros);
            } catch (e) {
                if (!cancelado) {
                    const msg = e?.message || "Error al obtener datos.";
                    setError(msg);
                    pushToast(`❌ ${msg}`, "error");
                }
            } finally {
                if (!cancelado) setCargando(false);
            }
        };
        fetchData();
        return () => {
            cancelado = true;
        };
    }, [apiBaseURL]);

    // Cargar operación previa si existe (desde ListarCambios)
    useEffect(() => {
        const cargarOperacionGuardada = async () => {
            const opId = localStorage.getItem("LP_LAST_OP_ID");
            if (!opId) return;

            try {
                const res = await fetch(`${apiBaseURL}/api/ListasPrecios/operacion/${opId}`);
                if (!res.ok) throw new Error("No se pudo obtener la operación guardada.");
                const data = await res.json();

                if (data?.ok && data?.operacion) {
                    const op = data.operacion;
                    const cab = op.operacion || {};
                    const det = op.detalles || [];

                    const nuevosIncrementos = {};
                    det.forEach((d) => {
                        const cod = String(d.codigo || "").trim();
                        if (cod) nuevosIncrementos[cod] = String(d.incrementoPct ?? 0);
                    });

                    setIva(cab.iva ?? iva);
                    setIncrementos(nuevosIncrementos);
                    setOperacionId(Number(opId) || null); // <-- NUEVO: persistimos el id en estado

                    pushToast(`✅ Operación #${opId} cargada correctamente.`, "success");
                    localStorage.removeItem("LP_LAST_OP_ID"); // conservamos el estado en memoria
                }
            } catch (e) {
                pushToast(`❌ Error cargando operación previa: ${e?.message}`, "error");
            }
        };

        cargarOperacionGuardada();
    }, [apiBaseURL]);

    const rows = useMemo(() => {
        return (productos || []).map((p) => {
            const precios = p?.precios || {};
            const lista = Number(precios?.lista ?? precios?.pri_list ?? 0);
            const porcentajes = extraerPorcentajes(p?.descuentos_aplicados, p?.descuentos);

            const nivelesPrevios =
                (p?.niveles
                        ? [p.niveles.n1, p.niveles.n2, p.niveles.n3, p.niveles.n4, p.niveles.n5, p.niveles.n6, p.niveles.n7, p.niveles.n8, p.niveles.n9]
                        : calcularNivelesBase(lista, porcentajes)
                ).map((x) => Number(x || 0));

            return {
                codigoBarras: p?.barcode || p?.ean || "-",
                codigo: p?.pr_id || p?.id || "-",
                producto: p?.pr_desc || p?.descripcion || "-",
                presentacion: p?.presentacion || "-",
                linea: p?.linea || p?.xpr_linea || "",
                sublinea: p?.sublinea || p?.xpr_sublinea || "",
                referencia: p?.referencia || p?.pr_invnt || "",
                precioLista: lista,
                porcentajes,
                nivelesPrevios,
            };
        });
    }, [productos]);

    const rowsFiltrados = useMemo(() => {
        const q = (busqueda || "").toLowerCase();
        return rows.filter((r) => {
            if (!q) return true;
            if (filtro === "linea") return String(r.linea || "").toLowerCase().includes(q);
            if (filtro === "sublinea") return String(r.sublinea || "").toLowerCase().includes(q);
            if (filtro === "referencia") return String(r.referencia || "").toLowerCase().includes(q);
            if (filtro === "producto") return String(r.producto || "").toLowerCase().includes(q);
            return String(r.codigo || "").toLowerCase().includes(q) || String(r.producto || "").toLowerCase().includes(q);
        });
    }, [rows, filtro, busqueda]);

    // Commit de incremento por fila
    const commitIncremento = useCallback((codigo, valor) => {
        setIncrementos((prev) => {
            if (prev[codigo] === valor) return prev;
            return { ...prev, [codigo]: valor };
        });
    }, []);

    // Construir cambios solo con valores COMMITeados
    const construirCambios = useCallback(() => {
        return rows.reduce((acc, p) => {
            const incStr = incrementos[p.codigo];
            if (incStr === undefined || incStr === "") return acc;
            const inc = parseFloat(incStr);
            if (!Number.isFinite(inc) || inc === 0) return acc;

            const nuevoPrecioLista =
                inc === 0 ? Number(p.precioLista) : redondearCentena(p.precioLista * (1 + inc / 100));

            const niveles = calcularNiveles(nuevoPrecioLista, p.porcentajes, p.nivelesPrevios);

            acc.push({
                codigo: p.codigo,
                precioActual: Number(p.precioLista),
                incrementoPct: inc,
                nuevoPrecioLista,
                niveles,
            });
            return acc;
        }, []);
    }, [rows, incrementos]);

    // Forzar commit de cualquier input activo antes de operar
    const forceCommitFocus = () => {
        if (typeof document !== "undefined" && document.activeElement && "blur" in document.activeElement) {
            document.activeElement.blur();
        }
    };

    const operar = async (accion) => {
        forceCommitFocus();
        const cambios = construirCambios();

        if (cambios.length === 0) {
            pushToast("No hay cambios para procesar.", "warning");
            return;
        }

        setOperando(true);
        try {
            const identificacion =
                (typeof localStorage !== "undefined" && localStorage.getItem("identificacion")) || "";

            const payload = {
                accion, // "GUARDAR" | "APROBAR"
                iva: Number(iva) || 0,
                cambios,
                identificacion,
                operacionId: operacionId ?? null, // <-- NUEVO: enviar si existe
            };

            const res = await fetch(API_OPERAR_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "Error HTTP en la operación.");
            }

            const data = await res.json().catch(() => ({}));
            if (accion === "GUARDAR") {
                pushToast(`✅ Guardado: ${data?.procesados ?? cambios.length} ítem(s).`, "success");
            } else {
                pushToast(`✅ Aprobado: ${data?.procesados ?? cambios.length} ítem(s).`, "success");
            }
        } catch (e) {
            pushToast(`❌ Error al ${accion === "GUARDAR" ? "guardar" : "aprobar"}: ${e?.message || "desconocido"}`, "error");
        } finally {
            setOperando(false);
        }
    };

    return (
        <div className="p-2 md:p-6 space-y-6">
            <Card className="shadow-lg">
                <CardContent className="space-y-4">
                    {/* Filtros superiores */}
                    <div className="flex flex-wrap items-end gap-4 bg-[#0D2A45]/5 p-3 rounded-md">
                        {/* Orden: Filtro principal → Buscar */}
                        <div className="flex flex-col">
                            <label className="font-semibold text-sm text-gray-700">Filtro principal</label>
                            <Select onValueChange={setFiltro}>
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Seleccionar tipo de filtro" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="linea">Línea</SelectItem>
                                    <SelectItem value="sublinea">Sublínea</SelectItem>
                                    <SelectItem value="referencia">Referencia</SelectItem>
                                    <SelectItem value="producto">Producto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col">
                            <label className="font-semibold text-sm text-gray-700">Buscar</label>
                            <Input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder={`Buscar por ${filtro || "código o producto"}`}
                                className="w-64"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="font-semibold text-sm text-gray-700">% IVA</label>
                            <Input
                                type="number"
                                step="any"
                                value={iva}
                                onChange={(e) => setIva(parseFloat(e.target.value) || 0)}
                                className="w-24 text-center"
                            />
                        </div>
                    </div>

                    {/* Estados de red */}
                    {cargando && <div className="text-sm text-gray-600">Cargando catálogo de precios…</div>}
                    {error && <div className="text-sm text-red-700">❌ Error al obtener datos: {error}</div>}

                    {/* ===== Vista móvil (tarjetas) ===== */}
                    {!cargando && !error && (
                        <div className="md:hidden space-y-3">
                            {rowsFiltrados.length === 0 ? (
                                <div className="px-3 py-6 text-center text-gray-500">No hay registros para los criterios ingresados.</div>
                            ) : (
                                rowsFiltrados.map((p) => (
                                    <CardProducto
                                        key={`m-${p.codigo}`}
                                        p={p}
                                        valorGlobal={incrementos[p.codigo] ?? "0"}
                                        onCommit={commitIncremento}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {/* ===== Vista escritorio (tabla) ===== */}
                    {!cargando && !error && (
                        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[70vh] rounded-2xl border border-gray-200 shadow relative">
                            <table className="w-full text-sm border-separate border-spacing-0 rounded-2xl shadow overflow-hidden">
                                <thead className="sticky top-0 z-30">
                                <tr className="bg-gradient-to-r from-[#0D2A45] to-[#103654] text-white text-center">
                                    <th className="px-3 py-3 rounded-tl-2xl">CÓDIGO BARRAS</th>
                                    <th className="px-3 py-3">CÓDIGO</th>
                                    <th className="px-3 py-3 text-left">PRODUCTO</th>
                                    <th className="px-3 py-3">PRESENTACIÓN</th>
                                    <th className="px-3 py-3 text-right">PRECIO ACTUAL</th>
                                    <th className="px-3 py-3">% INCREMENTO</th>
                                    <th className="px-3 py-3 text-right">NUEVO PRECIO DE LISTA</th>
                                    <th colSpan={9} className="px-3 py-3">Niveles de precio de listas</th>
                                    <th className="px-3 py-3 rounded-tr-2xl"></th>
                                </tr>
                                <tr className="bg-[#D9E6F2] text-[#0D2A45]">
                                    <th colSpan={7}></th>
                                    {Array.from({ length: 9 }, (_, n) => (
                                        <th
                                            key={`head-n-${n}`}
                                            className="px-3 py-2 text-center font-medium border-b border-[#C3D4E2] bg-[#E8F0F7]"
                                        >
                                            L{n + 1}
                                        </th>
                                    ))}
                                    <th></th>
                                </tr>
                                </thead>

                                <tbody>
                                {rowsFiltrados.map((p, i) => (
                                    <RowProducto
                                        key={`${p.codigo}-${i}`}
                                        p={p}
                                        valorGlobal={incrementos[p.codigo] ?? "0"}
                                        onCommit={commitIncremento}
                                    />
                                ))}

                                {rowsFiltrados.length === 0 && (
                                    <tr>
                                        <td colSpan={17} className="px-3 py-6 text-center text-gray-500">
                                            No hay registros para los criterios ingresados.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Botonera inferior */}
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="secondary" disabled={operando} onClick={() => operar("GUARDAR")}>
                            {operando ? "Procesando…" : "Guardar"}
                        </Button>
                        <Button variant="default" disabled={operando} onClick={() => operar("APROBAR")}>
                            {operando ? "Procesando…" : "Aprobar"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Contenedor de toasts */}
            {toasts.length > 0 && (
                <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
                    {toasts.map((t) => (
                        <ToastItem key={t.id} message={t.message} variant={t.variant} onClose={() => closeToast(t.id)} />
                    ))}
                </div>
            )}

            {/* Animación simple para entrada */}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

export default ActualizacionPrecios;
