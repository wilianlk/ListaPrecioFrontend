// src/components/pages/ActualizacionPrecios.jsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
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

// Select mínimo
const SimpleSelect = ({ value, onChange, options, placeholder = "Seleccionar...", className = "", disabled }) => (
    <select
        className={`border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2A45]/40 ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
    >
        <option value="">{placeholder}</option>
        {options.map((o) => (
            <option key={o.value} value={o.value}>
                {o.label}
            </option>
        ))}
    </select>
);

/* ===========================
   Toast mínimo
   =========================== */

const ToastItem = ({ message, variant = "info", onClose }) => {
    const palette = {
        info: "bg-[#0D2A45] text-white border-[#0A1E31]",
        success: "bg-green-600 text-white border-green-700",
        error: "bg-red-600 text-white border-red-700",
        warning: "bg-yellow-500 text-black border-yellow-600",
    };
    return (
        <div className={`min-w-[220px] max-w-[360px] border rounded-lg shadow-lg px-4 py-3 ${palette[variant]} animate-[fadeIn_.2s_ease-in]`}>
            <div className="flex items-start gap-3">
                <span className="text-sm leading-5">{message}</span>
                <button onClick={onClose} className="ml-auto text-xs opacity-80 hover:opacity-100" aria-label="Cerrar">✕</button>
            </div>
        </div>
    );
};

/* ===========================
   Utilidades de cálculo
   =========================== */

const redondearCentena = (v) => Math.round((Number(v) || 0) / 100) * 100;
const toPctInt = (x) => { const n = Number(x); if (!Number.isFinite(n)) return 0; return Math.max(0, n); };

function extraerPorcentajes(descAplicados = {}, descCategoria = {}) {
    return Array.from({ length: 9 }, (_, i) => {
        const keyA = `pr${i + 1}`; const keyC = `prd_pr${i + 1}`;
        const fromA = descAplicados?.[keyA]?.valor; const fromC = descCategoria?.[keyC];
        return toPctInt(fromA ?? fromC ?? 0);
    });
}

function calcularNivelesBase(base, porcentajes = []) {
    const b = Number(base || 0);
    return Array.from({ length: 9 }, (_, i) => redondearCentena(b * (toPctInt(porcentajes[i]) / 100)));
}

function calcularNiveles(base, porcentajes = [], nivelesAnteriores = [], ivaUsuario = 19) {
    const b = Number(base || 0);
    const ivaFactor = 1 + (Number(ivaUsuario) / 100); // convierte 19 → 1.19

    return Array.from({ length: 9 }, (_, i) => {
        // L4 NO se recalcula (índice 3)
        if (i === 3 && nivelesAnteriores?.[3] != null)
            return Number(nivelesAnteriores[3]) || 0;

        let valor;

        // ✅ L6 ignora su porcentaje y usa el IVA dinámico del usuario
        if (i === 5) {
            const valorConIva = b * ivaFactor;
            const redondeado = redondearCentena(valorConIva);
            valor = redondeado / ivaFactor; // sin redondear el resultado final
        } else {
            valor = b * (toPctInt(porcentajes[i]) / 100);
            valor = redondearCentena(valor);
        }

        return valor;
    });
}


/* ===========================
   Debounce
   =========================== */
function useDebouncedValue(value, delay = 200) {
    const [v, setV] = useState(value);
    useEffect(() => { const id = setTimeout(() => setV(value), delay); return () => clearTimeout(id); }, [value, delay]);
    return v;
}

/* ===========================
   Dropdown MultiSelect (oculto por defecto)
   =========================== */
const DropdownMultiSelect = React.memo(function DropdownMultiSelect({
                                                                        options,                // [{value, label, norm}]
                                                                        selectedValues,         // Set<string>
                                                                        onChange,               // (newSet:Set<string>) => void
                                                                        placeholder = "Seleccionar productos…",
                                                                        className = ""
                                                                    }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const qDeb = useDebouncedValue(q, 200);
    const ref = useRef(null);

    const filtered = useMemo(() => {
        if (!qDeb) return options;
        const needle = qDeb.toLowerCase();
        return options.filter(o => o.norm.includes(needle));
    }, [options, qDeb]);

    const toggle = useCallback((val) => {
        const next = new Set(selectedValues);
        if (next.has(val)) next.delete(val); else next.add(val);
        onChange(next);
    }, [selectedValues, onChange]);

    const selectVisible = () => {
        const next = new Set(selectedValues);
        for (const o of filtered) next.add(o.value);
        onChange(next);
    };
    const clearAll = () => onChange(new Set());

    useEffect(() => {
        const onDocClick = (e) => { if (!ref.current) return; if (!ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("mousedown", onDocClick); document.removeEventListener("keydown", onKey); };
    }, []);

    const label = selectedValues.size > 0
        ? `${selectedValues.size} seleccionado${selectedValues.size > 1 ? "s" : ""}`
        : placeholder;

    return (
        <div className={`relative ${className}`} ref={ref}>
            {/* Trigger estilo select */}
            <button
                type="button"
                className="w-full border rounded-md px-3 py-2 text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#0D2A45]/40"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={`${selectedValues.size ? "text-gray-900" : "text-gray-500"}`}>{label}</span>
                <span className={`ml-2 transition ${open ? "rotate-180" : ""}`}>▾</span>
            </button>

            {/* Panel desplegable */}
            {open && (
                <div className="absolute z-[1000] mt-1 w-full bg-white border rounded-xl shadow-xl">
                    <div className="p-2 border-b bg-gray-50 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por producto o código" className="flex-1" />
                            <Button variant="secondary" onClick={selectVisible}>Seleccionar visibles</Button>
                            <Button variant="outline" onClick={clearAll}>Limpiar</Button>
                        </div>
                        <div className="text-xs text-gray-600 mt-2">{selectedValues.size} seleccionados · {filtered.length} opciones</div>
                    </div>

                    <div className="max-h-72 overflow-auto">
                        {filtered.map((o) => (
                            <label key={o.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="accent-[#0D2A45]"
                                    checked={selectedValues.has(o.value)}
                                    onChange={() => toggle(o.value)}
                                />
                                <span className="text-sm">{o.label}</span>
                            </label>
                        ))}
                        {filtered.length === 0 && (
                            <div className="py-6 text-center text-gray-500 text-sm">Sin coincidencias</div>
                        )}
                    </div>

                    <div className="p-2 border-t bg-gray-50 rounded-b-xl flex justify-end">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
                    </div>
                </div>
            )}
        </div>
    );
});

/* ===========================
   Fila de tabla (memo) con estado local
   =========================== */

const RowProducto = React.memo(function RowProducto({ p, valorGlobal, onCommit, iva }) {
    const [local, setLocal] = useState(() => (valorGlobal ?? "0"));

    useEffect(() => { setLocal(valorGlobal ?? "0"); }, [valorGlobal, p.codigo]);

    const incNum = useMemo(() => { const n = parseFloat(local); return Number.isFinite(n) ? n : 0; }, [local]);
    const nuevoPrecioLista = useMemo(
        () => (incNum === 0 ? Number(p.precioLista) : redondearCentena(p.precioLista * (1 + incNum / 100))),
        [incNum, p.precioLista]
    );

    // 🔹 ahora el IVA dinámico se usa aquí
    const niveles = useMemo(
        () => calcularNiveles(nuevoPrecioLista, p.porcentajes, p.nivelesPrevios, iva),
        [nuevoPrecioLista, p.porcentajes, p.nivelesPrevios, iva]
    );

    const commitValor = useCallback((raw) => {
        const vRaw = (raw ?? "").toString().trim();
        const v = vRaw === "" ? "0" : vRaw;
        setLocal(v);
        onCommit(p.codigo, v);
    }, [onCommit, p.codigo]);

    return (
        <tr className="hover:bg-[#0D2A45]/5">
            <td className="px-3 py-3 text-center whitespace-nowrap">{p.codigoBarras}</td>
            <td className="px-3 py-3 text-center whitespace-nowrap font-semibold text-slate-800">{p.codigo}</td>
            <td className="px-3 py-3 text-left min-w-[260px]">{p.producto}</td>
            <td className="px-3 py-3 text-center whitespace-nowrap">{p.sublinea || "-"}</td>
            <td className="px-3 py-3 text-center whitespace-nowrap">{p.presentacion}</td>
            <td className="px-3 py-3 text-right whitespace-nowrap">
                ${Number(p.precioLista).toLocaleString("es-CO")}
            </td>
            <td className="px-3 py-3 text-center whitespace-nowrap">
                <Input
                    type="number" step="any" value={local}
                    onFocus={(e) => { if (local === "0" || local === 0 || local === "") setLocal(""); e.target.select(); }}
                    onChange={(e) => setLocal(e.target.value)}
                    onBlur={(e) => commitValor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setLocal("0"); requestAnimationFrame(() => e.currentTarget.blur()); } }}
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
                        {p.porcentajes[idx] != null ? Number(p.porcentajes[idx]).toString() : "0"}%
                    </div>
                    <div>${Number(nivel).toLocaleString("es-CO")}</div>
                </td>
            ))}
            <td className="px-3 py-2"></td>
        </tr>
    );
});


/* ===========================
   Componente principal
   =========================== */

function ActualizacionPrecios() {
    const { apiBaseURL } = getConfig();
    const API_OPERAR_URL = `${apiBaseURL}/api/ListasPrecios/operar`;

    const [iva, setIva] = useState(19);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [productos, setProductos] = useState([]);

    const [incrementos, setIncrementos] = useState({});
    const [operando, setOperando] = useState(false);
    const [operacionId, setOperacionId] = useState(null);

    // Filtros anidados
    const [lineaSel, setLineaSel] = useState("");
    const [sublineaSel, setSublineaSel] = useState("");
    const [productosSel, setProductosSel] = useState(new Set()); // códigos

    // Toasts
    const [toasts, setToasts] = useState([]);
    const pushToast = (message, variant = "info", ttlMs = 3200) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, message, variant }]);
        setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, ttlMs);
    };
    const closeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

    // Fetch catálogo
    useEffect(() => {
        let cancelado = false;
        (async () => {
            setCargando(true); setError("");
            try {
                const res = await fetch(`${apiBaseURL}/api/ListasPrecios/catalogo-descuentos`);
                if (!res.ok) throw new Error((await res.text()) || "Error HTTP al consultar catálogo.");
                const j = await res.json();
                const registros = Array.isArray(j) ? j : j?.datos || j?.data || [];
                if (!cancelado) setProductos(registros);
            } catch (e) {
                if (!cancelado) { const msg = e?.message || "Error al obtener datos."; setError(msg); pushToast(`❌ ${msg}`, "error"); }
            } finally { if (!cancelado) setCargando(false); }
        })();
        return () => { cancelado = true; };
    }, [apiBaseURL]);

    // Cargar operación previa
    useEffect(() => {
        (async () => {
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
                    det.forEach((d) => { const cod = String(d.codigo || "").trim(); if (cod) nuevosIncrementos[cod] = String(d.incrementoPct ?? 0); });
                    setIva(cab.iva ?? iva);
                    setIncrementos(nuevosIncrementos);
                    setOperacionId(Number(opId) || null);
                    pushToast(`✅ Operación #${opId} cargada correctamente.`, "success");
                    localStorage.removeItem("LP_LAST_OP_ID");
                }
            } catch (e) { pushToast(`❌ Error cargando operación previa: ${e?.message}`, "error"); }
        })();
    }, [apiBaseURL]);

    // Dataset normalizado + índices
    const dataset = useMemo(() => {
        const d = (productos || []).map((p) => {
            const precios = p?.precios || {};
            const lista = Number(precios?.lista ?? precios?.pri_list ?? 0); // "Precio actual"
            const porcentajes = extraerPorcentajes(p?.descuentos_aplicados, p?.descuentos);

            let nivelesPrevios = (
                p?.niveles
                    ? [p.niveles.n1, p.niveles.n2, p.niveles.n3, p.niveles.n4, p.niveles.n5, p.niveles.n6, p.niveles.n7, p.niveles.n8, p.niveles.n9]
                    : calcularNivelesBase(lista, porcentajes)
            ).map((x) => Number(x || 0));

            // 🔒 AJUSTE: L4 SIEMPRE = PRECIO ACTUAL (sin redondeo ni porcentaje)
            nivelesPrevios[3] = Number(lista);

            const codigo = String(p?.pr_id || p?.id || "-").trim();
            const productoTxt = String(p?.pr_desc || p?.descripcion || "-").trim();
            const presentacion = String(p?.size  || "-").trim();
            const linea = String(p?.linea ?? "").trim();
            const sublinea = String(p?.sublinea ?? "").trim();
            const referencia = String(p?.referencia || p?.pr_invnt || "").trim();
            const ean = String(p?.barcode || p?.ean || "-").trim();

            return {
                codigoBarras: ean || "-",
                codigo,
                producto: productoTxt,
                presentacion,
                linea,
                sublinea,
                referencia,
                precioLista: Number(lista),
                porcentajes,
                nivelesPrevios,
                _normCodigo: codigo.toLowerCase(),
                _normProducto: productoTxt.toLowerCase(),
            };
        });
        return d;
    }, [productos]);

    const lineas = useMemo(() => {
        const s = new Set(); dataset.forEach((r) => { if (r.linea) s.add(r.linea); });
        return Array.from(s).sort((a, b) => a.localeCompare(b, "es"));
    }, [dataset]);

    const sublineasPorLinea = useMemo(() => {
        const map = new Map();
        dataset.forEach((r) => { if (!r.linea) return; if (!map.has(r.linea)) map.set(r.linea, new Set()); if (r.sublinea) map.get(r.linea).add(r.sublinea); });
        const obj = {}; for (const [k, v] of map.entries()) obj[k] = Array.from(v).sort((a, b) => a.localeCompare(b, "es"));
        return obj;
    }, [dataset]);

    const opcionesProductoIndex = useMemo(() => {
        const m = new Map(); // key = `${linea}::${sublinea}`
        for (const r of dataset) {
            const key = `${r.linea}::${r.sublinea}`;
            if (!m.has(key)) m.set(key, []);
            m.get(key).push({
                value: r.codigo,
                label: `${r.codigo} — ${r.producto}`,
                norm: `${r._normCodigo} ${r._normProducto}`,
            });
        }
        m.forEach((arr) => arr.sort((a, b) => a.label.localeCompare(b.label, "es")));
        return m;
    }, [dataset]);

    const lineaOptions = useMemo(() => lineas.map((l) => ({ value: l, label: l })), [lineas]);
    const sublineaOptions = useMemo(() => {
        if (!lineaSel) return [];
        const subs = sublineasPorLinea[lineaSel] || [];
        return subs.map((s) => ({ value: s, label: s }));
    }, [lineaSel, sublineasPorLinea]);

    // Reset anidado
    useEffect(() => { setSublineaSel(""); setProductosSel(new Set()); }, [lineaSel]);
    useEffect(() => { setProductosSel(new Set()); }, [sublineaSel]);

    // Opciones del dropdown por contexto
    const opcionesProductoVisibles = useMemo(() => {
        let arr = [];
        if (lineaSel && sublineaSel) {
            arr = opcionesProductoIndex.get(`${lineaSel}::${sublineaSel}`) || [];
        } else if (lineaSel) {
            const subs = sublineasPorLinea[lineaSel] || [];
            const set = new Set();
            for (const s of subs) {
                const key = `${lineaSel}::${s}`;
                const list = opcionesProductoIndex.get(key) || [];
                for (const o of list) { if (!set.has(o.value)) { set.add(o.value); arr.push(o); } }
            }
        } else {
            const set = new Set();
            opcionesProductoIndex.forEach((list) => { for (const o of list) { if (!set.has(o.value)) { set.add(o.value); arr.push(o); } } });
        }
        return arr;
    }, [lineaSel, sublineaSel, sublineasPorLinea, opcionesProductoIndex]);

    // Filtrado final de filas (para operaciones/cálculo)
    const rowsFiltrados = useMemo(() => {
        const hasProdFilter = productosSel.size > 0;
        return dataset.filter((r) => {
            if (lineaSel && r.linea !== lineaSel) return false;
            if (sublineaSel && r.sublinea !== sublineaSel) return false;
            if (hasProdFilter && !productosSel.has(r.codigo)) return false;
            return true;
        });
    }, [dataset, lineaSel, sublineaSel, productosSel]);

    // Versión solo para render (ordenada por línea → producto) para que la agrupación sea continua
    const rowsParaRender = useMemo(() => {
        return [...rowsFiltrados].sort(
            (a, b) => a.linea.localeCompare(b.linea, "es") || a.producto.localeCompare(b.producto, "es")
        );
    }, [rowsFiltrados]);

    // Commit de incremento por fila
    const commitIncremento = useCallback((codigo, valor) => {
        setIncrementos((prev) => { if (prev[codigo] === valor) return prev; return { ...prev, [codigo]: valor }; });
    }, []);

    const construirCambios = useCallback(() => {
        return rowsFiltrados.reduce((acc, p) => {
            const incStr = incrementos[p.codigo];
            if (incStr === undefined || incStr === "") return acc;
            const inc = parseFloat(incStr);
            if (!Number.isFinite(inc) || inc === 0) return acc;

            const nuevoPrecioLista = inc === 0 ? Number(p.precioLista) : redondearCentena(p.precioLista * (1 + inc / 100));
            const niveles = calcularNiveles(nuevoPrecioLista, p.porcentajes, p.nivelesPrevios, iva);

            acc.push({ codigo: p.codigo, precioActual: Number(p.precioLista), incrementoPct: inc, nuevoPrecioLista, niveles });
            return acc;
        }, []);
    }, [rowsFiltrados, incrementos]);

    const forceCommitFocus = () => {
        if (typeof document !== "undefined" && document.activeElement && "blur" in document.activeElement) {
            document.activeElement.blur();
        }
    };

    const goToListarCambios = () => {
        try {
            // 🔹 Dispara el evento global (igual que goToActualizacion)
            window.dispatchEvent(new CustomEvent("lp:goto", { detail: "listarCambios" }));
        } catch {}

        try {
            // 🔹 Busca el botón del menú lateral con texto “Listar Precios” o “Listar Cambios”
            const candidates = Array.from(document.querySelectorAll("aside button, aside a, nav button, nav a"));
            const target = candidates.find((el) => {
                const txt = (el.textContent || el.title || "").toLowerCase();
                return txt.includes("listar precios") || txt.includes("listar cambios");
            });
            if (target) {
                target.click();
                return;
            }
        } catch {}

        try {
            // 🔹 Fallback: guarda el tab en localStorage
            localStorage.setItem("LP_TARGET_TAB", "listarCambios");
        } catch {}
    };

    const operar = async (accion) => {
        forceCommitFocus();
        const cambios = construirCambios();
        if (cambios.length === 0) { pushToast("No hay cambios para procesar.", "warning"); return; }

        setOperando(true);
        try {
            const identificacion = (typeof localStorage !== "undefined" && localStorage.getItem("identificacion")) || "";
            const payload = { accion, iva: Number(iva) || 0, cambios, identificacion, operacionId: operacionId ?? null };
            const res = await fetch(API_OPERAR_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) { const txt = await res.text(); throw new Error(txt || "Error HTTP en la operación."); }
            const data = await res.json().catch(() => ({}));
            pushToast(`✅ ${accion === "GUARDAR" ? "Guardado" : "Aprobado"}: ${data?.procesados ?? cambios.length} ítem(s).`, "success");

            // 🔹 Redirige automáticamente a “Listar Cambios”
            setTimeout(() => {
                goToListarCambios();
            }, 1000);

        } catch (e) {
            pushToast(`❌ Error al ${accion === "GUARDAR" ? "guardar" : "aprobar"}: ${e?.message || "desconocido"}`, "error");
        } finally { setOperando(false); }
    };

    return (
        <div className="p-2 md:p-6 space-y-6">
            <Card className="shadow-lg">
                <CardContent className="space-y-4">
                    {/* ===== Panel de filtros ===== */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0D2A45]/5 p-3 rounded-md">
                        <div className="flex flex-col">
                            <label className="font-semibold text-sm text-gray-700">Línea</label>
                            <SimpleSelect value={lineaSel} onChange={setLineaSel} options={lineaOptions} placeholder="Todas" />
                        </div>

                        <div className="flex flex-col">
                            <label className="font-semibold text-sm text-gray-700">Sublínea</label>
                            <SimpleSelect
                                value={sublineaSel}
                                onChange={setSublineaSel}
                                options={sublineaOptions}
                                placeholder={lineaSel ? "Todas" : "Seleccione una línea"}
                                disabled={!lineaSel}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="font-semibold text-sm text-gray-700">% IVA</label>
                            <Input type="number" step="any" value={iva} onChange={(e) => setIva(parseFloat(e.target.value) || 0)} className="w-24 text-center" />
                        </div>

                        <div className="md:col-span-4">
                            <label className="font-semibold text-sm text-gray-700">Productos (múltiple)</label>
                            <DropdownMultiSelect
                                options={opcionesProductoVisibles}
                                selectedValues={productosSel}
                                onChange={setProductosSel}
                                placeholder="Seleccionar productos…"
                            />
                        </div>
                    </div>

                    {/* Estados de red */}
                    {cargando && <div className="text-sm text-gray-600">Cargando catálogo de precios…</div>}
                    {error && <div className="text-sm text-red-700">❌ Error al obtener datos: {error}</div>}

                    {/* ===== Tabla escritorio ===== */}
                    {!cargando && !error && (
                        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[70vh] rounded-2xl border border-gray-200 shadow relative">
                            <table className="w-full text-sm border-separate border-spacing-0 rounded-2xl shadow overflow-hidden">
                                <thead className="sticky top-0 z-30">
                                <tr className="bg-gradient-to-r from-[#0D2A45] to-[#103654] text-white text-center">
                                    <th className="px-3 py-3 rounded-tl-2xl">CÓDIGO BARRAS</th>
                                    <th className="px-3 py-3">CÓDIGO</th>
                                    <th className="px-3 py-3 text-left">PRODUCTO</th>
                                    <th className="px-3 py-3">SUBLÍNEA</th>
                                    <th className="px-3 py-3">PRESENTACIÓN</th>
                                    <th className="px-3 py-3 text-right">PRECIO ACTUAL</th>
                                    <th className="px-3 py-3">% INCREMENTO</th>
                                    <th className="px-3 py-3 text-right">NUEVO PRECIO DE LISTA</th>
                                    <th colSpan={9} className="px-3 py-3">Niveles de precio de listas</th>
                                    <th className="px-3 py-3 rounded-tr-2xl"></th>
                                </tr>
                                <tr className="bg-[#D9E6F2] text-[#0D2A45]">
                                    <th colSpan={8}></th>
                                    {Array.from({ length: 9 }, (_, n) => (
                                        <th key={`head-n-${n}`} className="px-3 py-2 text-center font-medium border-b border-[#C3D4E2] bg-[#E8F0F7]">
                                            L{n + 1}
                                        </th>
                                    ))}
                                    <th></th>
                                </tr>
                                </thead>

                                <tbody>
                                {(() => {
                                    // AGRUPACIÓN POR LÍNEA (encabezado por grupo)
                                    const out = [];
                                    let lastLinea = "";
                                    for (let i = 0; i < rowsParaRender.length; i++) {
                                        const p = rowsParaRender[i];
                                        if (p.linea && p.linea !== lastLinea) {
                                            lastLinea = p.linea;
                                            out.push(
                                                <tr key={`group-${lastLinea}`} className="bg-gray-100">
                                                    <td colSpan={18} className="px-3 py-2 font-semibold text-[#0D2A45] uppercase">
                                                        {lastLinea}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        out.push(
                                            <RowProducto
                                                key={`${p.codigo}-${i}`}
                                                p={p}
                                                valorGlobal={incrementos[p.codigo] ?? "0"}
                                                onCommit={commitIncremento}
                                                iva={iva}
                                            />
                                        );
                                    }
                                    if (out.length === 0) {
                                        out.push(
                                            <tr key="empty">
                                                <td colSpan={18} className="px-3 py-6 text-center text-gray-500">
                                                    No hay registros para los criterios ingresados.
                                                </td>
                                            </tr>
                                        );
                                    }
                                    return out;
                                })()}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Botonera inferior */}
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="secondary" disabled={operando} onClick={() => operar("GUARDAR")}>{operando ? "Procesando…" : "Guardar"}</Button>
                        <Button variant="default" disabled={operando} onClick={() => operar("APROBAR")}>{operando ? "Procesando…" : "Aprobar"}</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Contenedor de toasts */}
            {toasts.length > 0 && (
                <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
                    {toasts.map((t) => <ToastItem key={t.id} message={t.message} variant={t.variant} onClose={() => closeToast(t.id)} />)}
                </div>
            )}

            {/* Animación simple */}
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
}

export default ActualizacionPrecios;
