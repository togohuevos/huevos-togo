import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Home, Package, AlertCircle, TrendingUp, Clock, CheckCircle, MapPin, Activity, ArrowUp, ArrowDown, BarChart2, Settings, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const toLocalDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekRange = (offset = 0) => {
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

const formatCurrency = (v) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const USER_COLORS = {
    'Juan': '#60a5fa',
    'Simón': '#86efac',
};

const getUserName = (email) => {
    if (!email) return null;
    if (email.includes('juan')) return 'Juan';
    if (email.includes('simon')) return 'Simón';
    return email.split('@')[0];
};

export default function Dashboard() {
    const [stats, setStats] = useState({
        pendingOrders: 0,
        deliveredOrders: 0,
        totalPanales: 0,
        unresolvedComplaints: 0,
        weeklyIncome: 0,
        weeklyInvestment: 0,
        weeklyProfit: 0,
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [comparison, setComparison] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [currentUser, setCurrentUser] = useState('');
    const [greeting, setGreeting] = useState('');
    const [loading, setLoading] = useState(true);
    const [autoWhatsApp, setAutoWhatsApp] = useState(localStorage.getItem('auto_whatsapp') === 'true');

    useEffect(() => {
        localStorage.setItem('auto_whatsapp', autoWhatsApp);
        // Dispatch custom event to notify other components (like Orders)
        window.dispatchEvent(new Event('auto_whatsapp_changed'));
    }, [autoWhatsApp]);

    useEffect(() => {
        loadDashboard();

        // Subscribe to real-time changes
        const channel = supabase.channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
                loadDashboard();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadDashboard = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const name = user ? getUserName(user.email) : '';
            setCurrentUser(name);

            const hour = new Date().getHours();
            if (hour < 12) setGreeting('Buenos días');
            else if (hour < 18) setGreeting('Buenas tardes');
            else setGreeting('Buenas noches');

            // Define the global range (last 4 weeks)
            const { monday: currentMonday } = getWeekRange(0);
            const { monday: oldestMonday } = getWeekRange(-3);
            const startDateStr = toLocalDateStr(oldestMonday);

            // PARALLEL FETCH: Fetch all necessary data at once
            const [
                { data: allOrders },
                { data: allPrices },
                { data: complaints }
            ] = await Promise.all([
                supabase.from('pedidos').select('*, clientes(nombre_completo)').gte('fecha_entrega', startDateStr),
                supabase.from('precios_panales').select('*').gte('semana_inicio', startDateStr),
                supabase.from('quejas').select('*, clientes(nombre_completo)').eq('resuelta', false)
            ]);

            if (!allOrders || !allPrices) {
                setLoading(false);
                return;
            }

            // Organize data in memory
            const currentWeekRange = getWeekRange(0);
            const cMonStr = toLocalDateStr(currentWeekRange.monday);
            const cSunStr = toLocalDateStr(currentWeekRange.sunday);

            const activeWeekOrders = allOrders.filter(o => o.fecha_entrega >= cMonStr && o.fecha_entrega <= cSunStr);
            const activePrices = { A: { c: 0, v: 0 }, AA: { c: 0, v: 0 }, AAA: { c: 0, v: 0 } };
            allPrices.filter(p => p.semana_inicio === cMonStr).forEach(r => {
                activePrices[r.tipo_huevo] = { c: r.precio_compra || 0, v: r.precio_venta || 0 };
            });

            const pending = activeWeekOrders.filter(o => o.estado === 'Pending');
            const delivered = activeWeekOrders.filter(o => o.estado === 'Delivered');
            const totalPanales = activeWeekOrders.reduce((s, o) => s + Number(o.cantidad), 0);

            let income = 0, investment = 0;
            activeWeekOrders.forEach(o => {
                income += Number(o.cantidad) * (activePrices[o.tipo_huevo]?.v || 0);
                investment += Number(o.cantidad) * (activePrices[o.tipo_huevo]?.c || 0);
            });

            setStats({
                pendingOrders: pending.length,
                deliveredOrders: delivered.length,
                totalPanales,
                unresolvedComplaints: complaints ? complaints.length : 0,
                weeklyIncome: income,
                weeklyInvestment: investment,
                weeklyProfit: income - investment,
            });

            // Comparison data
            const lastWeekRange = getWeekRange(-1);
            const lMonStr = toLocalDateStr(lastWeekRange.monday);
            const lSunStr = toLocalDateStr(lastWeekRange.sunday);
            const lastWeekOrders = allOrders.filter(o => o.fecha_entrega >= lMonStr && o.fecha_entrega <= lSunStr);
            const lastPrices = { A: { c: 0, v: 0 }, AA: { c: 0, v: 0 }, AAA: { c: 0, v: 0 } };
            allPrices.filter(p => p.semana_inicio === lMonStr).forEach(r => {
                lastPrices[r.tipo_huevo] = { c: r.precio_compra || 0, v: r.precio_venta || 0 };
            });

            if (lastWeekOrders.length > 0) {
                const lastPanales = lastWeekOrders.reduce((s, o) => s + Number(o.cantidad), 0);
                let lastIncome = 0;
                lastWeekOrders.forEach(o => { lastIncome += Number(o.cantidad) * (lastPrices[o.tipo_huevo]?.v || 0); });
                const panalesDiff = lastPanales > 0 ? Math.round(((totalPanales - lastPanales) / lastPanales) * 100) : 0;
                const incomeDiff = lastIncome > 0 ? Math.round(((income - lastIncome) / lastIncome) * 100) : 0;
                setComparison({ panalesDiff, incomeDiff, lastPanales, lastIncome });
            }

            // Chart history (4 weeks)
            const history = [];
            for (let i = 0; i < 4; i++) {
                const { monday: m, sunday: s } = getWeekRange(-i);
                const mStr = toLocalDateStr(m);
                const sStr = toLocalDateStr(s);

                const weekOrders = allOrders.filter(o => o.fecha_entrega >= mStr && o.fecha_entrega <= sStr);
                const weekPrices = { A: { c: 0, v: 0 }, AA: { c: 0, v: 0 }, AAA: { c: 0, v: 0 } };
                allPrices.filter(p => p.semana_inicio === mStr).forEach(r => {
                    weekPrices[r.tipo_huevo] = { c: r.precio_compra || 0, v: r.precio_venta || 0 };
                });

                let win = 0, wco = 0;
                weekOrders.forEach(o => {
                    win += Number(o.cantidad) * (weekPrices[o.tipo_huevo]?.v || 0);
                    wco += Number(o.cantidad) * (weekPrices[o.tipo_huevo]?.c || 0);
                });

                history.unshift({
                    name: `S-${4 - i}`,
                    ingresos: win,
                    costos: wco,
                    label: `${m.getDate()}/${m.getMonth() + 1}`
                });
            }
            setHistoryData(history);

            // Activity activity build
            const activities = [];
            if (delivered.length > 0) {
                delivered.slice(0, 3).forEach(o => {
                    activities.push({
                        type: 'delivered',
                        text: `Pedido entregado a ${o.clientes?.nombre_completo}`,
                        detail: `${o.cantidad} panales Tipo ${o.tipo_huevo}`,
                        user: o.entregado_por,
                        time: o.entregado_at
                    });
                });
            }
            if (pending.length > 0) {
                pending.slice(0, 3).forEach(o => {
                    activities.push({
                        type: 'pending',
                        text: `Pedido pendiente de ${o.clientes?.nombre_completo}`,
                        detail: `${o.cantidad} panales Tipo ${o.tipo_huevo} — ${o.fecha_entrega}`,
                    });
                });
            }
            if (complaints && complaints.length > 0) {
                complaints.slice(0, 2).forEach(q => {
                    activities.push({
                        type: 'complaint',
                        text: `Queja de ${q.clientes?.nombre_completo}`,
                        detail: q.descripcion?.substring(0, 60) + (q.descripcion?.length > 60 ? '...' : ''),
                    });
                });
            }
            setRecentActivity(activities);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Cargando...</div>;

    return (
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
            {/* Logo + Greeting */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <img src="/logo.jpg" alt="Huevos To-Go" style={{
                    width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover',
                    border: '2px solid var(--primary)', boxShadow: '0 2px 12px rgba(245, 158, 11, 0.3)'
                }} />
                <div>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
                        {greeting}, <span style={{ color: USER_COLORS[currentUser] || 'var(--primary)' }}>{currentUser}</span> 👋
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Resumen de esta semana
                    </p>
                </div>
            </div>

            {/* Configuration Card */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ backgroundColor: 'rgba(37, 211, 102, 0.1)', padding: '8px', borderRadius: '0.75rem' }}>
                        <MessageSquare size={18} style={{ color: '#25D366' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '700' }}>WhatsApp Automático</h3>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Abrir chat al marcar entregado</p>
                    </div>
                </div>
                <div
                    onClick={() => setAutoWhatsApp(!autoWhatsApp)}
                    style={{
                        width: '44px', height: '22px', borderRadius: '11px',
                        backgroundColor: autoWhatsApp ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                        position: 'relative', cursor: 'pointer', transition: 'background-color 0.3s ease'
                    }}
                >
                    <div style={{
                        width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white',
                        position: 'absolute', top: '2px', left: autoWhatsApp ? '24px' : '2px',
                        transition: 'left 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <Clock size={16} style={{ color: '#fbbf24' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pendientes</span>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>{stats.pendingOrders}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <CheckCircle size={16} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entregados</span>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.deliveredOrders}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <Package size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Panales</span>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.totalPanales}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quejas</span>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.unresolvedComplaints > 0 ? 'var(--danger)' : 'var(--accent)' }}>{stats.unresolvedComplaints}</p>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Finanzas de la Semana
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Invertido</p>
                        <p style={{ fontWeight: '700', color: '#f87171', fontSize: '0.9rem' }}>{stats.weeklyInvestment > 0 ? formatCurrency(stats.weeklyInvestment) : '—'}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Ingresos</p>
                        <p style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '0.9rem' }}>{stats.weeklyIncome > 0 ? formatCurrency(stats.weeklyIncome) : '—'}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', backgroundColor: stats.weeklyProfit >= 0 ? 'rgba(134, 239, 172, 0.1)' : 'rgba(248, 113, 113, 0.1)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Ganancia</p>
                        <p style={{ fontWeight: '700', color: stats.weeklyProfit >= 0 ? '#86efac' : '#f87171', fontSize: '0.9rem' }}>
                            {stats.weeklyInvestment > 0 || stats.weeklyIncome > 0 ? formatCurrency(stats.weeklyProfit) : '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            {(stats.pendingOrders + stats.deliveredOrders) > 0 && (
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>Progreso de entregas</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent)' }}>
                            {Math.round((stats.deliveredOrders / (stats.pendingOrders + stats.deliveredOrders)) * 100)}%
                        </span>
                    </div>
                    <div style={{ height: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${(stats.deliveredOrders / (stats.pendingOrders + stats.deliveredOrders)) * 100}%`,
                            backgroundColor: 'var(--accent)',
                            borderRadius: '5px',
                            transition: 'width 0.8s ease'
                        }} />
                    </div>
                </div>
            )}

            {/* Week Comparison */}
            {comparison && (
                <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📈 vs. Semana Pasada</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                backgroundColor: comparison.panalesDiff >= 0 ? 'rgba(134,239,172,0.15)' : 'rgba(248,113,113,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {comparison.panalesDiff >= 0 ? <ArrowUp size={16} style={{ color: '#86efac' }} /> : <ArrowDown size={16} style={{ color: '#f87171' }} />}
                            </div>
                            <div>
                                <p style={{ fontSize: '0.95rem', fontWeight: '700', color: comparison.panalesDiff >= 0 ? '#86efac' : '#f87171' }}>
                                    {comparison.panalesDiff >= 0 ? '+' : ''}{comparison.panalesDiff}%
                                </p>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Panales</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                backgroundColor: comparison.incomeDiff >= 0 ? 'rgba(134,239,172,0.15)' : 'rgba(248,113,113,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {comparison.incomeDiff >= 0 ? <ArrowUp size={16} style={{ color: '#86efac' }} /> : <ArrowDown size={16} style={{ color: '#f87171' }} />}
                            </div>
                            <div>
                                <p style={{ fontSize: '0.95rem', fontWeight: '700', color: comparison.incomeDiff >= 0 ? '#86efac' : '#f87171' }}>
                                    {comparison.incomeDiff >= 0 ? '+' : ''}{comparison.incomeDiff}%
                                </p>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ingresos</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Chart */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BarChart2 size={18} style={{ color: 'var(--primary)' }} /> Ventas (Últimas 4 Semanas)
                </h2>
                <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData}>
                            <defs>
                                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem'
                                }}
                            />
                            <Area type="monotone" dataKey="ingresos" stroke="var(--accent)" fillOpacity={1} fill="url(#colorInc)" strokeWidth={2} />
                            <Area type="monotone" dataKey="costos" stroke="#f87171" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ingresos</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f87171' }} />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Inversión</span>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Activity size={18} style={{ color: 'var(--primary)' }} /> Actividad Reciente
                </h2>
                {recentActivity.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Sin actividad esta semana 🎉</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {recentActivity.map((act, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                padding: '0.6rem', borderRadius: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)'
                            }}>
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', flexShrink: 0,
                                    backgroundColor: act.type === 'delivered' ? 'var(--accent)' :
                                        act.type === 'pending' ? '#fbbf24' : 'var(--danger)'
                                }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: '500' }}>{act.text}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{act.detail}</p>
                                    {act.user && (
                                        <span style={{ fontSize: '0.7rem', color: USER_COLORS[act.user] || '#ccc' }}>
                                            por {act.user} {act.time ? `· ${formatTime(act.time)}` : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
