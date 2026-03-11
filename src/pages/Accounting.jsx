import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, ChevronLeft, ChevronRight, AlertTriangle, TrendingUp, DollarSign, Fuel, Pencil, Trash2, Plus, Check, Download, Package } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────
const TYPE_COLORS = {
    A: { bg: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24' },
    AA: { bg: 'rgba(96, 165, 250, 0.2)', text: '#60a5fa' },
    AAA: { bg: 'rgba(134, 239, 172, 0.2)', text: '#86efac' },
};

const formatCurrency = (v) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const formatDate = (d) => d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

// Use local date to avoid UTC timezone shift
const toLocalDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekRange = (offset) => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + offset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday };
};

// ─── Component ────────────────────────────────────
export default function Accounting() {
    const [orders, setOrders] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weekOffset, setWeekOffset] = useState(0);

    // Prices from DB (per week)
    const [prices, setPrices] = useState({ A: { compra: 0, venta: 0 }, AA: { compra: 0, venta: 0 }, AAA: { compra: 0, venta: 0 } });
    const [currentWeekPrices, setCurrentWeekPrices] = useState(null);
    const [editingPrices, setEditingPrices] = useState(false);
    const [tempPrices, setTempPrices] = useState(prices);

    // Additional costs
    const [gastos, setGastos] = useState([]);
    const [showGastoForm, setShowGastoForm] = useState(false);
    const [gastoData, setGastoData] = useState({ descripcion: '', monto: '' });
    const [editingGasto, setEditingGasto] = useState(false);
    const [deleteGastoModal, setDeleteGastoModal] = useState({ show: false, id: null });

    // Purchase tracking
    const [purchased, setPurchased] = useState({ A: false, AA: false, AAA: false });

    // Monthly view
    const [showMonthly, setShowMonthly] = useState(false);

    // Inventory
    const [inventario, setInventario] = useState({ A: 0, AA: 0, AAA: 0 });
    const [addingStock, setAddingStock] = useState(null); // 'A' | 'AA' | 'AAA' | null
    const [stockInput, setStockInput] = useState('');

    const { monday, sunday } = getWeekRange(weekOffset);
    const mondayStr = toLocalDateStr(monday);
    const sundayStr = toLocalDateStr(sunday);

    useEffect(() => { fetchData(); }, [weekOffset]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchOrders(), fetchPrices(), fetchGastos(), fetchAllOrders(), fetchPurchased(), fetchCurrentWeekPrices(), fetchInventario()]);
        setLoading(false);
    };

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('pedidos').select('*, clientes(nombre_completo)')
            .gte('fecha_entrega', mondayStr).lte('fecha_entrega', sundayStr)
            .order('fecha_entrega');
        if (data) setOrders(data);
    };

    const fetchAllOrders = async () => {
        const { data } = await supabase.from('pedidos').select('*, clientes(nombre_completo)').order('fecha_entrega', { ascending: false });
        if (data) setAllOrders(data);
    };

    const fetchPrices = async () => {
        const { data } = await supabase.from('precios_panales').select('*').eq('semana_inicio', mondayStr);
        const p = { A: { compra: 0, venta: 0 }, AA: { compra: 0, venta: 0 }, AAA: { compra: 0, venta: 0 } };
        if (data && data.length > 0) {
            data.forEach(r => { p[r.tipo_huevo] = { compra: r.precio_compra || 0, venta: r.precio_venta || 0 }; });
        }
        setPrices(p);
        setTempPrices(p);
    };

    const fetchCurrentWeekPrices = async () => {
        const { monday: curMonday } = getWeekRange(0);
        const curMondayStr = toLocalDateStr(curMonday);
        if (curMondayStr === mondayStr) { setCurrentWeekPrices(null); return; }
        const { data } = await supabase.from('precios_panales').select('*').eq('semana_inicio', curMondayStr);
        if (data && data.length > 0) {
            const p = { A: { compra: 0, venta: 0 }, AA: { compra: 0, venta: 0 }, AAA: { compra: 0, venta: 0 } };
            data.forEach(r => { p[r.tipo_huevo] = { compra: r.precio_compra || 0, venta: r.precio_venta || 0 }; });
            setCurrentWeekPrices(p);
        } else {
            setCurrentWeekPrices(null);
        }
    };

    const fetchGastos = async () => {
        const { data } = await supabase
            .from('gastos_adicionales').select('*')
            .gte('fecha', mondayStr).lte('fecha', sundayStr)
            .order('fecha', { ascending: false });
        if (data) setGastos(data);
    };

    const fetchInventario = async () => {
        const { data } = await supabase.from('inventario').select('*');
        if (data) {
            const inv = { A: 0, AA: 0, AAA: 0 };
            data.forEach(r => { inv[r.tipo_huevo] = r.cantidad; });
            setInventario(inv);
        }
    };

    const addStock = async (tipo) => {
        const amount = Number(stockInput);
        if (!amount || amount <= 0) return;
        const newQty = inventario[tipo] + amount;
        await supabase.from('inventario').update({ cantidad: newQty }).eq('tipo_huevo', tipo);
        setInventario({ ...inventario, [tipo]: newQty });
        setAddingStock(null);
        setStockInput('');
    };

    const fetchPurchased = async () => {
        const { data } = await supabase
            .from('compras_semanales').select('*')
            .eq('semana_inicio', mondayStr);
        if (data && data.length > 0) {
            const p = { A: false, AA: false, AAA: false };
            data.forEach(r => { p[r.tipo_huevo] = r.comprado; });
            setPurchased(p);
        } else {
            setPurchased({ A: false, AA: false, AAA: false });
        }
    };

    // ─── Price actions ─────────────────────
    const savePrices = async () => {
        for (const tipo of ['A', 'AA', 'AAA']) {
            await supabase.from('precios_panales').upsert({
                semana_inicio: mondayStr,
                tipo_huevo: tipo,
                precio_compra: Number(tempPrices[tipo].compra),
                precio_venta: Number(tempPrices[tipo].venta)
            }, { onConflict: 'semana_inicio,tipo_huevo' });
        }
        setPrices(tempPrices);
        setEditingPrices(false);
    };

    // ─── Purchase tracking actions ────────
    const togglePurchased = async (tipo) => {
        const newVal = !purchased[tipo];
        await supabase.from('compras_semanales').upsert({
            semana_inicio: mondayStr,
            tipo_huevo: tipo,
            comprado: newVal
        }, { onConflict: 'semana_inicio,tipo_huevo' });
        setPurchased({ ...purchased, [tipo]: newVal });
    };

    // ─── Gasto actions ────────────────────
    const handleSaveGasto = async (e) => {
        e.preventDefault();
        const payload = { ...gastoData, monto: Number(gastoData.monto), fecha: toLocalDateStr(new Date()) };
        if (editingGasto) {
            const { data } = await supabase.from('gastos_adicionales').update({ descripcion: gastoData.descripcion, monto: Number(gastoData.monto) }).eq('id', gastoData.id).select();
            if (data) setGastos(gastos.map(g => g.id === data[0].id ? data[0] : g));
        } else {
            const { data } = await supabase.from('gastos_adicionales').insert([payload]).select();
            if (data) setGastos([data[0], ...gastos]);
        }
        setShowGastoForm(false);
        setEditingGasto(false);
        setGastoData({ descripcion: '', monto: '' });
    };

    const confirmDeleteGasto = async () => {
        await supabase.from('gastos_adicionales').delete().eq('id', deleteGastoModal.id);
        setGastos(gastos.filter(g => g.id !== deleteGastoModal.id));
        setDeleteGastoModal({ show: false, id: null });
    };

    // ─── Calculations ─────────────────────
    const pending = orders.filter(o => o.estado === 'Pending');
    const delivered = orders.filter(o => o.estado === 'Delivered');

    const calc = (list) => ({
        A: list.filter(o => o.tipo_huevo === 'A').reduce((s, o) => s + Number(o.cantidad), 0),
        AA: list.filter(o => o.tipo_huevo === 'AA').reduce((s, o) => s + Number(o.cantidad), 0),
        AAA: list.filter(o => o.tipo_huevo === 'AAA').reduce((s, o) => s + Number(o.cantidad), 0),
    });

    const pendingTotals = calc(pending);
    const deliveredTotals = calc(delivered);
    const allTotals = calc(orders);
    const totalPanales = allTotals.A + allTotals.AA + allTotals.AAA;

    const investmentCost = ['A', 'AA', 'AAA'].reduce((s, t) => s + allTotals[t] * prices[t].compra, 0);
    const expectedIncome = ['A', 'AA', 'AAA'].reduce((s, t) => s + allTotals[t] * prices[t].venta, 0);
    const collectedIncome = ['A', 'AA', 'AAA'].reduce((s, t) => s + deliveredTotals[t] * prices[t].venta, 0);
    const pendingIncome = ['A', 'AA', 'AAA'].reduce((s, t) => s + pendingTotals[t] * prices[t].venta, 0);
    const totalGastos = gastos.reduce((s, g) => s + Number(g.monto), 0);
    const profit = expectedIncome - investmentCost - totalGastos;

    // Payment method breakdown
    const paymentBreakdown = { Efectivo: 0, Transferencia: 0, Otro: 0 };
    orders.forEach(o => { paymentBreakdown[o.metodo_pago] = (paymentBreakdown[o.metodo_pago] || 0) + Number(o.cantidad); });

    // Monthly data
    const monthlyData = useMemo(() => {
        const months = {};
        allOrders.forEach(o => {
            const key = o.fecha_entrega?.substring(0, 7); // YYYY-MM
            if (!key) return;
            if (!months[key]) months[key] = { panales: 0, ingresos: 0, compra: 0 };
            months[key].panales += Number(o.cantidad);
            months[key].ingresos += Number(o.cantidad) * (prices[o.tipo_huevo]?.venta || 0);
            months[key].compra += Number(o.cantidad) * (prices[o.tipo_huevo]?.compra || 0);
        });
        return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
    }, [allOrders, prices]);

    // Alerts
    const alerts = [];
    const hasPrices = prices.A.compra > 0 || prices.AA.compra > 0 || prices.AAA.compra > 0;
    if (!hasPrices) alerts.push('No has configurado los precios de compra/venta para esta semana.');
    if (pending.length > 0) alerts.push(`Tienes ${pending.length} pedido${pending.length > 1 ? 's' : ''} pendientes (${pendingTotals.A + pendingTotals.AA + pendingTotals.AAA} panales).`);
    const notPurchased = ['A', 'AA', 'AAA'].filter(t => allTotals[t] > 0 && !purchased[t]);
    if (notPurchased.length > 0) alerts.push(`Faltan por comprar panales: ${notPurchased.map(t => `Tipo ${t}`).join(', ')}.`);
    if (currentWeekPrices && weekOffset !== 0) {
        const diffs = ['A', 'AA', 'AAA'].filter(t => prices[t].compra !== currentWeekPrices[t].compra || prices[t].venta !== currentWeekPrices[t].venta);
        if (diffs.length > 0) alerts.push(`⚠️ Los precios de esta semana son diferentes a los de la semana actual (${diffs.map(t => `Tipo ${t}`).join(', ')}).`);
    }

    // Bar chart max
    const maxBar = Math.max(allTotals.A, allTotals.AA, allTotals.AAA, 1);

    const weekLabel = weekOffset === 0 ? 'Esta Semana' : weekOffset === 1 ? 'Próxima Semana' : weekOffset === -1 ? 'Semana Pasada' : `Semana del ${formatDate(monday)}`;

    // ─── Export function ──────────────────
    const exportReport = () => {
        const lines = [];
        lines.push('REPORTE SEMANAL - HUEVOS TO-GO');
        lines.push(`Semana: ${formatDate(monday)} - ${formatDate(sunday)}`);
        lines.push('');
        lines.push('=== RESUMEN ===');
        lines.push(`Total Panales: ${totalPanales}`);
        lines.push(`Inversión: ${formatCurrency(investmentCost)}`);
        lines.push(`Ingresos Esperados: ${formatCurrency(expectedIncome)}`);
        lines.push(`Ganancia Estimada: ${formatCurrency(profit)}`);
        lines.push('');
        lines.push('=== INGRESOS ===');
        lines.push(`Cobrado (entregados): ${formatCurrency(collectedIncome)}`);
        lines.push(`Por cobrar (pendientes): ${formatCurrency(pendingIncome)}`);
        lines.push('');
        lines.push('=== DESGLOSE POR TIPO ===');
        ['A', 'AA', 'AAA'].forEach(t => {
            lines.push(`Tipo ${t}: ${allTotals[t]} panales (${pendingTotals[t]} pendientes, ${deliveredTotals[t]} entregados) | Compra: ${formatCurrency(prices[t].compra)} | Venta: ${formatCurrency(prices[t].venta)}`);
        });
        lines.push('');
        lines.push('=== MÉTODO DE PAGO ===');
        Object.entries(paymentBreakdown).forEach(([m, q]) => lines.push(`${m}: ${q} panales`));
        if (gastos.length > 0) {
            lines.push('');
            lines.push('=== GASTOS ADICIONALES ===');
            gastos.forEach(g => lines.push(`${g.descripcion}: ${formatCurrency(g.monto)}`));
            lines.push(`Total Gastos: ${formatCurrency(totalGastos)}`);
        }
        lines.push('');
        lines.push('=== PEDIDOS ===');
        lines.push('Cliente,Tipo,Cantidad,Estado,Método de Pago,Fecha');
        orders.forEach(o => {
            lines.push(`${o.clientes?.nombre_completo},${o.tipo_huevo},${o.cantidad},${o.estado === 'Delivered' ? 'Entregado' : 'Pendiente'},${o.metodo_pago},${o.fecha_entrega}`);
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${mondayStr}_${sundayStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>📊 Contabilidad</h1>
                <button onClick={exportReport} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '600'
                }}>
                    <Download size={16} /> Exportar
                </button>
            </div>

            {/* ── Inventory ─────────────────────── */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Package size={18} style={{ color: 'var(--primary)' }} /> 📦 Inventario en Almacén
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    {['A', 'AA', 'AAA'].map(tipo => {
                        const qty = inventario[tipo];
                        const color = qty <= 0 ? '#ef4444' : qty < 5 ? '#f59e0b' : '#10b981';
                        const bg = qty <= 0 ? 'rgba(239,68,68,0.1)' : qty < 5 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)';
                        return (
                            <div key={tipo} style={{ background: bg, borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center', border: `1px solid ${color}33` }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Tipo {tipo}</p>
                                <p style={{ fontSize: '1.8rem', fontWeight: '800', color, lineHeight: 1 }}>{qty}</p>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>panales</p>
                                {qty < 5 && <p style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: '2px' }}>⚠️ Stock bajo</p>}
                                {addingStock === tipo ? (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '4px' }}>
                                        <input
                                            type="number" min="1"
                                            value={stockInput}
                                            onChange={e => setStockInput(e.target.value)}
                                            placeholder="+"
                                            style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.8rem', textAlign: 'center' }}
                                            autoFocus
                                        />
                                        <button onClick={() => addStock(tipo)} style={{ background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', padding: '4px 8px', fontSize: '0.75rem' }}>✓</button>
                                        <button onClick={() => { setAddingStock(null); setStockInput(''); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', fontSize: '0.75rem' }}>✕</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setAddingStock(tipo); setStockInput(''); }}
                                        style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600', width: '100%' }}
                                    >
                                        + Agregar
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Alerts ─────────────────────────── */}
            {alerts.length > 0 && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {alerts.map((a, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
                            borderRadius: '0.75rem', backgroundColor: 'rgba(251, 191, 36, 0.15)',
                            color: '#fbbf24', fontSize: '0.85rem'
                        }}>
                            <AlertTriangle size={16} /> {a}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Week Selector ──────────────────── */}
            <div className="glass" style={{
                padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <button onClick={() => setWeekOffset(weekOffset - 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.5rem' }}>
                    <ChevronLeft size={24} />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: '600' }}>{weekLabel}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(monday)} – {formatDate(sunday)}</p>
                </div>
                <button onClick={() => setWeekOffset(weekOffset + 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.5rem' }}>
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* ── Summary Cards ──────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total Panales</p>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{totalPanales}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Inversión</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f87171' }}>{investmentCost > 0 ? formatCurrency(investmentCost) : '—'}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ingresos Esperados</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{expectedIncome > 0 ? formatCurrency(expectedIncome) : '—'}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ganancia Est.</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: profit >= 0 ? '#86efac' : '#f87171' }}>{hasPrices ? formatCurrency(profit) : '—'}</p>
                </div>
            </div>

            {/* ── Income Breakdown ────────────────── */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>💵 Resumen de Ingresos</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cobrado (entregados)</span>
                    <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{collectedIncome > 0 ? formatCurrency(collectedIncome) : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Por cobrar (pendientes)</span>
                    <span style={{ color: '#fbbf24', fontWeight: '600' }}>{pendingIncome > 0 ? formatCurrency(pendingIncome) : '—'}</span>
                </div>
            </div>

            {/* ── Type Breakdown + Chart ──────────── */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📦 Desglose por Tipo</h2>
                {['A', 'AA', 'AAA'].map(tipo => (
                    <div key={tipo} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', backgroundColor: TYPE_COLORS[tipo].bg, color: TYPE_COLORS[tipo].text }}>
                                Tipo {tipo}
                            </span>
                            <span style={{ fontWeight: 'bold' }}>{allTotals[tipo]} panales</span>
                        </div>
                        {/* Bar */}
                        <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(allTotals[tipo] / maxBar) * 100}%`, backgroundColor: TYPE_COLORS[tipo].text, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <span>Pendientes: {pendingTotals[tipo]}</span>
                            <span>Entregados: {deliveredTotals[tipo]}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Payment Method ──────────────────── */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>💳 Por Método de Pago</h2>
                {Object.entries(paymentBreakdown).map(([method, qty]) => (
                    <div key={method} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.85rem' }}>{method}</span>
                        <span style={{ fontWeight: '600' }}>{qty} panales</span>
                    </div>
                ))}
            </div>

            {/* ── Purchase Tracking ──────────────── */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>🛒 Control de Compras</h2>
                {['A', 'AA', 'AAA'].map(tipo => (
                    allTotals[tipo] > 0 && (
                        <div key={tipo} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div>
                                <span style={{ fontWeight: '600' }}>Tipo {tipo}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>— {allTotals[tipo]} panales</span>
                            </div>
                            <button
                                onClick={() => togglePurchased(tipo)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    backgroundColor: purchased[tipo] ? 'rgba(134, 239, 172, 0.2)' : 'rgba(255,255,255,0.1)',
                                    color: purchased[tipo] ? '#86efac' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600'
                                }}
                            >
                                {purchased[tipo] ? <><Check size={14} /> Comprado</> : 'Marcar comprado'}
                            </button>
                        </div>
                    )
                ))}
                {totalPanales === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>No hay panales esta semana</p>}
            </div>

            {/* ── Prices ─────────────────────────── */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1rem' }}>💰 Precios por Panal <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(de esta semana)</span></h2>
                    {!editingPrices ? (
                        <button onClick={() => { setTempPrices(prices); setEditingPrices(true); }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                            <Pencil size={16} />
                        </button>
                    ) : (
                        <button onClick={savePrices} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                            Guardar
                        </button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tipo</span>
                    <span style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Compra</span>
                    <span style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Venta</span>
                    {['A', 'AA', 'AAA'].map(tipo => (
                        <div key={tipo} style={{ display: 'contents' }}>
                            <span style={{ fontWeight: '600', color: TYPE_COLORS[tipo].text }}>{tipo}</span>
                            {editingPrices ? (
                                <>
                                    <input className="input" type="number" value={tempPrices[tipo].compra}
                                        onChange={e => setTempPrices({ ...tempPrices, [tipo]: { ...tempPrices[tipo], compra: e.target.value } })}
                                        style={{ textAlign: 'center', padding: '4px' }} />
                                    <input className="input" type="number" value={tempPrices[tipo].venta}
                                        onChange={e => setTempPrices({ ...tempPrices, [tipo]: { ...tempPrices[tipo], venta: e.target.value } })}
                                        style={{ textAlign: 'center', padding: '4px' }} />
                                </>
                            ) : (
                                <>
                                    <span style={{ textAlign: 'center' }}>{prices[tipo].compra > 0 ? formatCurrency(prices[tipo].compra) : '—'}</span>
                                    <span style={{ textAlign: 'center' }}>{prices[tipo].venta > 0 ? formatCurrency(prices[tipo].venta) : '—'}</span>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Additional Costs ───────────────── */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1rem' }}>⛽ Gastos Adicionales</h2>
                    <button onClick={() => { setShowGastoForm(true); setEditingGasto(false); setGastoData({ descripcion: '', monto: '' }); }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                        <Plus size={20} />
                    </button>
                </div>

                {showGastoForm && (
                    <form onSubmit={handleSaveGasto} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <input className="input" placeholder="Descripción (ej. Gasolina)" value={gastoData.descripcion}
                            onChange={e => setGastoData({ ...gastoData, descripcion: e.target.value })} required />
                        <input className="input" type="number" placeholder="Monto ($)" value={gastoData.monto}
                            onChange={e => setGastoData({ ...gastoData, monto: e.target.value })} required />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary" type="submit" style={{ flex: 1, fontSize: '0.85rem' }}>
                                {editingGasto ? 'Guardar' : 'Agregar'}
                            </button>
                            <button className="btn" type="button" onClick={() => setShowGastoForm(false)}
                                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', fontSize: '0.85rem' }}>Cancelar</button>
                        </div>
                    </form>
                )}

                {gastos.length === 0 && !showGastoForm && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>Sin gastos esta semana</p>
                )}
                {gastos.map(g => (
                    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.85rem' }}>{g.descripcion}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: '600', color: '#f87171' }}>{formatCurrency(g.monto)}</span>
                            <button onClick={() => { setGastoData({ id: g.id, descripcion: g.descripcion, monto: g.monto }); setEditingGasto(true); setShowGastoForm(true); }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Pencil size={14} /></button>
                            <button onClick={() => setDeleteGastoModal({ show: true, id: g.id })}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
                {gastos.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 'bold' }}>
                        <span>Total Gastos</span>
                        <span style={{ color: '#f87171' }}>{formatCurrency(totalGastos)}</span>
                    </div>
                )}
            </div>

            {/* ── Monthly History ─────────────────── */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <button onClick={() => setShowMonthly(!showMonthly)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <h2 style={{ fontSize: '1rem' }}>📅 Histórico Mensual</h2>
                    <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                </button>
                {showMonthly && (
                    <div style={{ marginTop: '0.75rem' }}>
                        {monthlyData.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Sin datos históricos</p>
                        ) : monthlyData.map(([month, d]) => {
                            const ganancia = d.ingresos - d.compra;
                            const monthNames = { '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre' };
                            const [y, m] = month.split('-');
                            const displayMonth = `${monthNames[m] || m} ${y}`;
                            return (
                                <div key={month} style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{displayMonth}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{d.panales} panales</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                                        <div style={{ textAlign: 'center', padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Invertido</p>
                                            <p style={{ fontWeight: '600', color: '#f87171' }}>{d.compra > 0 ? formatCurrency(d.compra) : '—'}</p>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Ganado</p>
                                            <p style={{ fontWeight: '600', color: 'var(--accent)' }}>{d.ingresos > 0 ? formatCurrency(d.ingresos) : '—'}</p>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '6px', borderRadius: '8px', backgroundColor: ganancia >= 0 ? 'rgba(134, 239, 172, 0.1)' : 'rgba(248, 113, 113, 0.1)' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Ganancia</p>
                                            <p style={{ fontWeight: '700', color: ganancia >= 0 ? '#86efac' : '#f87171' }}>{d.compra > 0 || d.ingresos > 0 ? formatCurrency(ganancia) : '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Pending Orders List ────────────── */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📋 Pedidos de la Semana ({orders.length})</h2>
                {orders.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>No hay pedidos esta semana 🎉</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {orders.map(order => (
                            <div key={order.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.6rem', borderRadius: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)'
                            }}>
                                <div>
                                    <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{order.clientes?.nombre_completo}</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{order.fecha_entrega} · {order.metodo_pago}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>{order.cantidad} panales</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{
                                            fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px',
                                            backgroundColor: TYPE_COLORS[order.tipo_huevo]?.bg, color: TYPE_COLORS[order.tipo_huevo]?.text
                                        }}>
                                            {order.tipo_huevo}
                                        </span>
                                        <span style={{
                                            fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px',
                                            backgroundColor: order.estado === 'Delivered' ? 'rgba(134,239,172,0.2)' : 'rgba(251,191,36,0.2)',
                                            color: order.estado === 'Delivered' ? '#86efac' : '#fbbf24'
                                        }}>
                                            {order.estado === 'Delivered' ? '✓' : '⏳'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Delete Gasto Modal ─────────────── */}
            {deleteGastoModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '2rem'
                }}>
                    <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>¿Eliminar este gasto?</h3>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1, backgroundColor: 'var(--accent)' }} onClick={confirmDeleteGasto}>Sí</button>
                            <button className="btn" style={{ flex: 1, backgroundColor: 'var(--danger)' }} onClick={() => setDeleteGastoModal({ show: false, id: null })}>No</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
