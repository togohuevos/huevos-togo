import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag, Plus, Calendar, CheckCircle, Clock, MapPin, Pencil, Trash2, ChevronLeft, ChevronRight, Navigation, Check, MessageSquare, DollarSign, ArrowUpDown } from 'lucide-react';

// User color mapping
const USER_COLORS = {
    'Juan': '#60a5fa',   // azul claro
    'Simón': '#86efac',  // verde claro
};

const getUserName = (email) => {
    if (!email) return null;
    if (email.includes('juan')) return 'Juan';
    if (email.includes('simon')) return 'Simón';
    return email.split('@')[0];
};

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

const formatWeekDate = (d) => d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [orderData, setOrderData] = useState({
        cliente_id: '',
        tipo_huevo: 'A',
        cantidad: 1,
        metodo_pago: 'Efectivo',
        fecha_entrega: toLocalDateStr(new Date()),
        pago_estado: 'Pendiente'
    });

    // Week filter state
    const [viewMode, setViewMode] = useState('week'); // 'week' is now default, also 'all' or 'route'
    const [weekOffset, setWeekOffset] = useState(0);

    // Sort order state: 'desc' = más reciente primero, 'asc' = más viejo primero
    const [sortOrder, setSortOrder] = useState('desc');

    // GPS location state for route
    const [userLocation, setUserLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('idle'); // idle, loading, granted, denied
    const DEFAULT_ORIGIN = 'Calle 15 #106-79, Ciudad Jardín, Cali, Colombia';

    // WhatsApp settings reactivity
    const [autoWhatsApp, setAutoWhatsApp] = useState(localStorage.getItem('auto_whatsapp') === 'true');

    // Customer search state
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isClientListOpen, setIsClientListOpen] = useState(false);

    // Reverse Modal State
    const [reverseModal, setReverseModal] = useState({ show: false, id: null, clientName: '' });

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, clientName: '' });

    const [prices, setPrices] = useState({});

    // Request geolocation when route mode is activated
    useEffect(() => {
        if (viewMode !== 'route') return;
        if (!navigator.geolocation) {
            setLocationStatus('denied');
            return;
        }
        setLocationStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationStatus('granted');
            },
            () => {
                setLocationStatus('denied');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [viewMode]);

    useEffect(() => {
        fetchOrders();
        fetchClientes();
        getCurrentUser();
        fetchPrices();

        // Listen for WhatsApp setting changes from Dashboard
        const handleWachange = () => {
            setAutoWhatsApp(localStorage.getItem('auto_whatsapp') === 'true');
        };
        window.addEventListener('auto_whatsapp_changed', handleWachange);

        // Subscribe to real-time changes
        const channel = supabase.channel('orders-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('auto_whatsapp_changed', handleWachange);
        };
    }, []);

    const fetchPrices = async () => {
        const { data } = await supabase.from('precios_panales').select('*');
        if (data) {
            const priceMap = {};
            data.forEach(p => {
                const key = `${p.semana_inicio}_${p.tipo_huevo}`;
                priceMap[key] = p.precio_venta;
            });
            setPrices(priceMap);
        }
    };

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(getUserName(user.email));
    };

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('pedidos')
            .select('*, clientes(*)')
            .order('created_at', { ascending: false });
        if (data) {
            const pending = data.filter(o => o.estado !== 'Delivered')
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            const delivered = data.filter(o => o.estado === 'Delivered')
                .sort((a, b) => new Date(b.entregado_at || b.created_at || 0) - new Date(a.entregado_at || a.created_at || 0));
            setOrders([...pending, ...delivered]);
        }
        setLoading(false);
    };

    const fetchClientes = async () => {
        const { data } = await supabase.from('clientes').select('id, nombre_completo');
        if (data) setClientes(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (isEditing) {
            const updatePayload = {
                cliente_id: orderData.cliente_id,
                tipo_huevo: orderData.tipo_huevo,
                cantidad: orderData.cantidad,
                metodo_pago: orderData.metodo_pago,
                fecha_entrega: orderData.fecha_entrega,
                pago_estado: orderData.pago_estado
            };
            const { data, error } = await supabase
                .from('pedidos')
                .update(updatePayload)
                .eq('id', orderData.id)
                .select('*, clientes(*)');

            if (data) {
                setOrders(orders.map(o => o.id === data[0].id ? data[0] : o));
                resetForm();
            }
        } else {
            const { data, error } = await supabase
                .from('pedidos')
                .insert([orderData])
                .select('*, clientes(*)');
            if (data) {
                setOrders([data[0], ...orders]);
                resetForm();
            }
        }
    };

    const updatePaymentStatus = async (id, nuevoEstado) => {
        const { error } = await supabase
            .from('pedidos')
            .update({ pago_estado: nuevoEstado })
            .eq('id', id);
        if (!error) {
            setOrders(orders.map(o => o.id === id ? { ...o, pago_estado: nuevoEstado } : o));
        }
    };

    const togglePayment = (order) => {
        const nuevoEstado = order.pago_estado === 'Pagado' ? 'Pendiente' : 'Pagado';
        updatePaymentStatus(order.id, nuevoEstado);
    };

    const resetForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setOrderData({
            cliente_id: '',
            tipo_huevo: 'A',
            cantidad: 1,
            metodo_pago: 'Efectivo',
            fecha_entrega: toLocalDateStr(new Date()),
            pago_estado: 'Pendiente'
        });
        setClientSearchTerm('');
    };

    const startEdit = (order) => {
        setOrderData({
            id: order.id,
            cliente_id: order.cliente_id,
            tipo_huevo: order.tipo_huevo,
            cantidad: order.cantidad,
            metodo_pago: order.metodo_pago,
            fecha_entrega: order.fecha_entrega,
            pago_estado: order.pago_estado || 'Pendiente'
        });
        setClientSearchTerm(order.clientes?.nombre_completo || '');
        setIsEditing(true);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = async () => {
        const { error } = await supabase
            .from('pedidos')
            .delete()
            .eq('id', deleteModal.id);

        if (!error) {
            setOrders(orders.filter(o => o.id !== deleteModal.id));
            setDeleteModal({ show: false, id: null, clientName: '' });
        } else {
            alert('Error al eliminar el pedido');
        }
    };

    const sendWhatsAppReceipt = (order) => {
        const monday = new Date(order.fecha_entrega);
        const day = monday.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        monday.setDate(monday.getDate() + diff);
        const mondayStr = monday.toISOString().split('T')[0];

        const unitPrice = prices[`${mondayStr}_${order.tipo_huevo}`] || 0;
        const total = Number(order.cantidad) * unitPrice;
        const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

        const message = `*Huevos To-Go 🥚*\n\nHola ${order.clientes?.nombre_completo}! 👋\nConfirmamos la entrega de tu pedido:\n\n📦 *${order.cantidad} panales Tipo ${order.tipo_huevo}*\n💰 *Total: ${formatCurrency(total)}*\n💳 *Método: ${order.metodo_pago}*\n\n¡Gracias por tu compra! ✨`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/57${order.clientes?.celular}?text=${encoded}`, '_blank');
    };

    const sortOrders = (list) => {
        const pending = list
            .filter(o => o.estado !== 'Delivered')
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        const delivered = list
            .filter(o => o.estado === 'Delivered')
            .sort((a, b) => new Date(b.entregado_at || b.created_at || 0) - new Date(a.entregado_at || a.created_at || 0));
        return [...pending, ...delivered];
    };

    const updateStatus = async (id, status) => {
        const updateData = { estado: status };

        if (status === 'Delivered') {
            updateData.entregado_por = currentUser;
            updateData.entregado_at = new Date().toISOString();
        } else {
            updateData.entregado_por = null;
            updateData.entregado_at = null;
        }

        const { error } = await supabase.from('pedidos').update(updateData).eq('id', id);
        if (!error) {
            const updated = orders.map(o => o.id === id ? { ...o, ...updateData } : o);
            setOrders(sortOrders(updated));

            // Get the freshest value of autoWhatsApp because the state might be stale in this closure
            const isAutoWa = localStorage.getItem('auto_whatsapp') === 'true';

            if (status === 'Delivered' && isAutoWa) {
                const order = orders.find(o => o.id === id);
                if (order) {
                    sendWhatsAppReceipt({ ...order, ...updateData });
                }
            }
        }
    };

    const formatDeliveryTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Filter orders by view mode
    const { monday, sunday } = getWeekRange(weekOffset);
    const mondayStr = toLocalDateStr(monday);
    const sundayStr = toLocalDateStr(sunday);
    const baseFiltered = viewMode === 'week'
        ? orders.filter(o => o.fecha_entrega >= mondayStr && o.fecha_entrega <= sundayStr)
        : orders;

    // Grouping Logic for "Semana" and "Todos" Views
    const todayStr = toLocalDateStr(new Date());

    // Group 1: Deudores (Delivered but Pending Payment) - Sort by most recent delivery
    const deudores = baseFiltered
        .filter(o => o.estado === 'Delivered' && o.pago_estado === 'Pendiente')
        .sort((a, b) => new Date(b.entregado_at || b.created_at || 0) - new Date(a.entregado_at || a.created_at || 0));

    // Group 2: Por Entregar (Pending Delivery) - Priority to 'Hoy', then by creation date
    const porEntregar = baseFiltered
        .filter(o => o.estado !== 'Delivered')
        .sort((a, b) => {
            // Priority 1: HOY
            const isTodayA = a.fecha_entrega === todayStr;
            const isTodayB = b.fecha_entrega === todayStr;
            if (isTodayA && !isTodayB) return -1;
            if (!isTodayA && isTodayB) return 1;

            // Priority 2: Dirección (Alfabético para agrupar barrios/zonas)
            const dirA = (a.clientes?.direccion || '').trim();
            const dirB = (b.clientes?.direccion || '').trim();
            
            if (dirA !== dirB) {
                if (!dirA) return 1; // Sin dirección al final
                if (!dirB) return -1;
                return dirA.localeCompare(dirB, 'es', { sensitivity: 'base' });
            }

            // Priority 3: Fecha (Tie-break en misma ubicación)
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

    // Group 3: Completados (Delivered and Paid) - Sort by most recent delivery
    const completados = baseFiltered
        .filter(o => o.estado === 'Delivered' && o.pago_estado === 'Pagado')
        .sort((a, b) => new Date(b.entregado_at || b.created_at || 0) - new Date(a.entregado_at || a.created_at || 0));

    // For backward compatibility in parts of code that might still depend on a single list
    const filteredOrders = [...deudores, ...porEntregar, ...completados];

    const weekLabel = weekOffset === 0 ? 'Esta Semana' : weekOffset === 1 ? 'Próxima Semana' : weekOffset === -1 ? 'Semana Pasada' : `Semana del ${formatWeekDate(monday)}`;

    // Helper function to render a single order card
    const renderOrderCard = (order) => (
                    <div key={order.id} className="glass" style={{
                        padding: '1rem', borderRadius: '1rem', marginBottom: '1rem',
                        transition: 'background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
                        position: 'relative',
                        backgroundColor: order.estado === 'Delivered' 
                            ? (order.pago_estado === 'Pagado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)') 
                            : (order.pago_estado === 'Pagado' ? 'rgba(16, 185, 129, 0.05)' : undefined),
                        border: order.estado === 'Delivered' 
                            ? `1px solid ${order.pago_estado === 'Pagado' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}` 
                            : (order.fecha_entrega === todayStr && order.estado !== 'Delivered')
                                ? '2px solid #ff0000'
                                : (order.pago_estado === 'Pagado' ? '1px solid rgba(16, 185, 129, 0.3)' : undefined),
                        boxShadow: order.estado === 'Delivered' 
                            ? `0 0 12px ${order.pago_estado === 'Pagado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}` 
                            : (order.fecha_entrega === todayStr && order.estado !== 'Delivered')
                                ? '0 0 15px rgba(255, 0, 0, 0.3)'
                                : undefined,
                    }}>
                        {order.fecha_entrega === todayStr && order.estado !== 'Delivered' && (
                            <>
                                <style>{`
                                    @keyframes pulse-red {
                                        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
                                        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
                                        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
                                    }
                                `}</style>
                                <div style={{
                                    position: 'absolute', top: '-12px', left: '1rem',
                                    backgroundColor: '#ff0000', color: 'white',
                                    padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem',
                                    fontWeight: '900', letterSpacing: '1px',
                                    boxShadow: '0 2px 10px rgba(255, 0, 0, 0.5)',
                                    animation: 'pulse-red 2s infinite',
                                    zIndex: 10
                                }}>
                                    ¡ENTREGAR HOY!
                                </div>
                            </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ fontWeight: '600' }}>{order.clientes?.nombre_completo}</h3>
                                <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{order.cantidad} panales - Tipo {order.tipo_huevo}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    onClick={() => startEdit(order)}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ show: true, id: order.id, clientName: order.clientes?.nombre_completo, tipo_huevo: order.tipo_huevo, cantidad: order.cantidad })}
                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                                
                                <button
                                    onClick={() => togglePayment(order)}
                                    style={{
                                        background: 'none', 
                                        border: order.pago_estado === 'Pagado' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                        color: order.pago_estado === 'Pagado' ? 'var(--accent)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: order.pago_estado === 'Pagado' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                        transition: 'all 0.3s ease'
                                    }}
                                    title={order.pago_estado === 'Pagado' ? 'Pagado' : 'Marcar como Pagado'}
                                >
                                    <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>$</span>
                                </button>

                                <div
                                    onClick={() => {
                                        if (order.estado === 'Delivered') {
                                            setReverseModal({ show: true, id: order.id, clientName: order.clientes?.nombre_completo });
                                        } else {
                                            updateStatus(order.id, 'Delivered');
                                        }
                                    }}
                                    style={{
                                        padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem',
                                        backgroundColor: order.estado === 'Delivered' ? 'var(--accent)' : 'var(--primary)',
                                        color: 'white', cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    {order.estado === 'Delivered' ? 'Entregado' : 'Pendiente'}
                                </div>
                            </div>
                        </div>

                        {/* Delivery Info */}
                        {order.estado === 'Delivered' && order.entregado_por && (
                            <div style={{
                                marginTop: '0.5rem', padding: '4px 10px', borderRadius: '8px',
                                backgroundColor: 'rgba(0,0,0,0.2)', display: 'inline-flex',
                                alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem'
                            }}>
                                <CheckCircle size={14} style={{ color: USER_COLORS[order.entregado_por] || '#ccc' }} />
                                <span>
                                    Entregado por{' '}
                                    <strong style={{ color: USER_COLORS[order.entregado_por] || '#ccc' }}>
                                        {order.entregado_por}
                                    </strong>
                                </span>
                                {order.entregado_at && (
                                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                                        · {formatDeliveryTime(order.entregado_at)}
                                    </span>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <MapPin size={14} />
                            <span>
                                {order.clientes?.direccion}
                                {(order.clientes?.unidad_apto || order.clientes?.numero_casa) && ' - '}
                                {order.clientes?.unidad_apto} {order.clientes?.numero_casa && `(${order.clientes?.numero_casa})`}
                            </span>
                        </div>

                        {/* Payment Status Toggle */}
                        {order.estado === 'Delivered' && (
                            <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    💰 Estado de Pago:
                                </span>
                                <button
                                    onClick={() => updatePaymentStatus(order.id, order.pago_estado === 'Pagado' ? 'Pendiente' : 'Pagado')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                        fontSize: '0.75rem', fontWeight: 'bold',
                                        backgroundColor: order.pago_estado === 'Pagado' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                        color: order.pago_estado === 'Pagado' ? '#10b981' : '#f59e0b',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    {order.pago_estado === 'Pagado' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                    {order.pago_estado === 'Pagado' ? 'Pagado' : 'Pendiente Pago'}
                                </button>
                            </div>
                        )}

                        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                <Calendar size={14} />
                                <span>
                                    {order.fecha_entrega}
                                    {order.fecha_entrega && (
                                        <span style={{ marginLeft: '0.35rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'capitalize' }}>
                                            · {new Date(order.fecha_entrega + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long' })}
                                        </span>
                                    )}
                                </span>
                            </div>
                            {order.estado === 'Pending' && (
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                    onClick={() => updateStatus(order.id, 'Delivered')}
                                >
                                    Marcar Entregado
                                </button>
                            )}
                            {order.estado === 'Delivered' && (localStorage.getItem('auto_whatsapp') === 'true') && (
                                <button
                                    onClick={() => sendWhatsAppReceipt(order)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        backgroundColor: '#25D366', color: 'white', border: 'none',
                                        padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem',
                                        fontWeight: '600', cursor: 'pointer'
                                    }}
                                >
                                    <MessageSquare size={14} /> Enviar Recibo
                                </button>
                            )}
                        </div>
                    </div>
    );

    return (
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Pedidos</h1>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {viewMode !== 'route' && (
                        <button
                            onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
                            title={sortOrder === 'desc' ? 'Más reciente primero' : 'Más viejo primero'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '8px 10px', borderRadius: '8px', border: 'none',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: 'var(--text-muted)', cursor: 'pointer',
                                fontSize: '0.75rem', fontWeight: '600'
                            }}
                        >
                            <ArrowUpDown size={15} />
                            {sortOrder === 'desc' ? 'Reciente' : 'Antiguo'}
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={20} /> Nuevo
                    </button>
                </div>
            </div>

            {/* View Mode Toggle - Reordered: Week | All | Route */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    onClick={() => setViewMode('week')}
                    style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: '600', fontSize: '0.8rem',
                        backgroundColor: viewMode === 'week' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        color: viewMode === 'week' ? 'white' : 'var(--text-muted)'
                    }}
                >
                    Semana
                </button>
                <button
                    onClick={() => setViewMode('all')}
                    style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: '600', fontSize: '0.8rem',
                        backgroundColor: viewMode === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        color: viewMode === 'all' ? 'white' : 'var(--text-muted)'
                    }}
                >
                    Todos
                </button>
                <button
                    onClick={() => setViewMode('route')}
                    style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: '600', fontSize: '0.8rem',
                        backgroundColor: viewMode === 'route' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        color: viewMode === 'route' ? 'white' : 'var(--text-muted)'
                    }}
                >
                    🗺️ Ruta
                </button>
            </div>

            {/* Week Selector (only when in week mode) */}
            {viewMode === 'week' && (
                <div className="glass" style={{
                    padding: '0.75rem', borderRadius: '1rem', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <button onClick={() => setWeekOffset(weekOffset - 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.5rem' }}>
                        <ChevronLeft size={24} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{weekLabel}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {formatWeekDate(monday)} – {formatWeekDate(sunday)}
                        </p>
                    </div>
                    <button onClick={() => setWeekOffset(weekOffset + 1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.5rem' }}>
                        <ChevronRight size={24} />
                    </button>
                </div>
            )}

            {/* Route View */}
            {viewMode === 'route' && (() => {
                const pendingOrders = orders.filter(o => o.estado === 'Pending');
                const addresses = pendingOrders
                    .map(o => {
                        const addr = o.clientes?.direccion || '';
                        const unit = o.clientes?.unidad_apto || '';
                        const num = o.clientes?.numero_casa || '';
                        return { order: o, full: `${addr}${unit ? ' ' + unit : ''}${num ? ' (' + num + ')' : ''}`.trim() };
                    })
                    .filter(a => a.full);

                const origin = userLocation
                    ? `${userLocation.lat},${userLocation.lng}`
                    : DEFAULT_ORIGIN;

                const mapsUrl = addresses.length > 0
                    ? `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${addresses.map(a => encodeURIComponent(a.full)).join('/')}`
                    : null;

                return (
                    <div style={{ marginBottom: '1rem' }}>
                        <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '0.75rem' }}>
                            <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Navigation size={18} style={{ color: 'var(--primary)' }} /> Ruta de Entregas
                            </h2>

                            {/* Origin indicator */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem', borderRadius: '0.5rem', marginBottom: '0.75rem',
                                backgroundColor: 'rgba(96, 165, 250, 0.1)', fontSize: '0.75rem'
                            }}>
                                <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    backgroundColor: locationStatus === 'granted' ? 'var(--accent)' : '#fbbf24',
                                    flexShrink: 0
                                }} />
                                <span style={{ color: 'var(--text-muted)' }}>
                                    {locationStatus === 'loading' ? '📡 Obteniendo ubicación...' :
                                        locationStatus === 'granted' ? '📍 Usando tu ubicación actual' :
                                            `📍 Desde: ${DEFAULT_ORIGIN}`}
                                </span>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                {pendingOrders.length} entregas pendientes
                            </p>

                            {pendingOrders.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                                    ¡Todas las entregas completadas! 🎉
                                </p>
                            ) : (
                                <>
                                    {addresses.map((a, i) => (
                                        <div key={a.order.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.6rem', borderRadius: '0.75rem',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '50%',
                                                backgroundColor: 'var(--primary)', color: 'white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0
                                            }}>
                                                {i + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: '600', fontSize: '0.85rem' }}>{a.order.clientes?.nombre_completo}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {a.full}
                                                </p>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {a.order.cantidad} panales Tipo {a.order.tipo_huevo} · {a.order.metodo_pago}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => updateStatus(a.order.id, 'Delivered')}
                                                style={{
                                                    padding: '6px 10px', borderRadius: '8px', border: 'none',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent)',
                                                    cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600',
                                                    display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0
                                                }}
                                            >
                                                <Check size={14} /> Entregado
                                            </button>
                                        </div>
                                    ))}

                                    {mapsUrl && (
                                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                padding: '0.75rem', borderRadius: '0.75rem', marginTop: '0.75rem',
                                                backgroundColor: 'var(--primary)', color: 'white', textDecoration: 'none',
                                                fontWeight: '600', fontSize: '0.9rem'
                                            }}>
                                            <Navigation size={18} /> Iniciar Ruta en Google Maps
                                        </a>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}

            {showForm && (
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                        {isEditing ? 'Editar Pedido' : 'Nuevo Pedido'}
                    </h2>
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Searchable datalist for client */}
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="input"
                                list="clientes-list"
                                placeholder="🔍 Buscar cliente..."
                                value={clientSearchTerm}
                                onChange={e => {
                                    const val = e.target.value;
                                    setClientSearchTerm(val);
                                    const match = clientes.find(c =>
                                        (c.nombre_completo || '').toLowerCase() === val.toLowerCase()
                                    );
                                    setOrderData({ ...orderData, cliente_id: match ? match.id : '' });
                                }}
                                required
                                style={{ width: '100%' }}
                            />
                            <datalist id="clientes-list">
                                {clientes.map(c => (
                                    <option key={c.id} value={c.nombre_completo || ''} />
                                ))}
                            </datalist>
                            {orderData.cliente_id && (
                                <span style={{
                                    position: 'absolute', right: '12px', top: '50%',
                                    transform: 'translateY(-50%)', color: 'var(--primary)',
                                    fontSize: '0.75rem', fontWeight: '600', pointerEvents: 'none'
                                }}>✓</span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <select className="input" value={orderData.tipo_huevo} onChange={e => setOrderData({ ...orderData, tipo_huevo: e.target.value })}>
                                <option value="A">Tipo A</option>
                                <option value="AA">Tipo AA</option>
                                <option value="AAA">Tipo AAA</option>
                            </select>
                            <input
                                className="input"
                                type="number"
                                placeholder="Cant. Panales"
                                value={orderData.cantidad}
                                onChange={e => setOrderData({ ...orderData, cantidad: e.target.value })}
                                required
                            />
                        </div>

                        <input
                            className="input"
                            type="date"
                            value={orderData.fecha_entrega}
                            onChange={e => setOrderData({ ...orderData, fecha_entrega: e.target.value })}
                            required
                        />

                        <select className="input" value={orderData.metodo_pago} onChange={e => setOrderData({ ...orderData, metodo_pago: e.target.value })}>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Otro">Otro</option>
                        </select>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>
                                {isEditing ? 'Guardar Cambios' : 'Registrar'}
                            </button>
                            <button className="btn" type="button" onClick={resetForm} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Orders List by Groups (Only if NOT in Route Mode) */}
            {viewMode !== 'route' && (
                <div style={{ marginTop: '1rem' }}>
                    {/* Group 1: Por Entregar */}
                    {porEntregar.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
                                borderBottom: '2px solid rgba(96, 165, 250, 0.3)', paddingBottom: '0.5rem'
                            }}>
                                <Clock size={20} style={{ color: 'var(--primary)' }} />
                                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Por Entregar
                                </h2>
                                <span style={{
                                    marginLeft: 'auto', backgroundColor: 'var(--primary)', color: 'white',
                                    padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'
                                }}>
                                    {porEntregar.length}
                                </span>
                            </div>
                            {porEntregar.map(order => renderOrderCard(order))}
                        </div>
                    )}

                    {/* Group 2: Por Cobrar (Deudores) */}
                    {deudores.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
                                borderBottom: '2px solid rgba(245, 158, 11, 0.3)', paddingBottom: '0.5rem'
                            }}>
                                <DollarSign size={20} style={{ color: '#f59e0b' }} />
                                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: '#f59e0b' }}>
                                    ⚠️ Por Cobrar
                                </h2>
                                <span style={{
                                    marginLeft: 'auto', backgroundColor: '#f59e0b', color: 'white',
                                    padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'
                                }}>
                                    {deudores.length}
                                </span>
                            </div>
                            {deudores.map(order => renderOrderCard(order))}
                        </div>
                    )}

                    {/* Group 3: Completados */}
                    {completados.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
                                borderBottom: '2px solid rgba(16, 185, 129, 0.3)', paddingBottom: '0.5rem'
                            }}>
                                <CheckCircle size={20} style={{ color: '#10b981' }} />
                                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: '#10b981' }}>
                                    ✅ Completados
                                </h2>
                                <span style={{
                                    marginLeft: 'auto', backgroundColor: '#10b981', color: 'white',
                                    padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'
                                }}>
                                    {completados.length}
                                </span>
                            </div>
                            {completados.map(order => renderOrderCard(order))}
                        </div>
                    )}

                    {porEntregar.length === 0 && deudores.length === 0 && completados.length === 0 && (
                        <div className="glass" style={{ padding: '3rem 1rem', textAlign: 'center', borderRadius: '1rem' }}>
                            <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.3 }} />
                            <p style={{ color: 'var(--text-muted)' }}>No hay pedidos en esta vista</p>
                            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowForm(true)}>
                                Crear Primer Pedido
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Reverse Confirmation Modal */}
            {reverseModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '2rem'
                }}>
                    <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>¿Seguro que quieres marcar como pendiente?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Pedido de: {reverseModal.clientName}</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className="btn"
                                style={{ flex: 1, backgroundColor: 'var(--accent)' }}
                                onClick={() => {
                                    updateStatus(reverseModal.id, 'Pending');
                                    setReverseModal({ show: false, id: null, clientName: '' });
                                }}
                            >
                                Sí
                            </button>
                            <button
                                className="btn"
                                style={{ flex: 1, backgroundColor: 'var(--danger)' }}
                                onClick={() => setReverseModal({ show: false, id: null, clientName: '' })}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '2rem'
                }}>
                    <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>¿Seguro que deseas eliminar este pedido?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Pedido de: {deleteModal.clientName}</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className="btn"
                                style={{ flex: 1, backgroundColor: 'var(--accent)' }}
                                onClick={confirmDelete}
                            >
                                Sí
                            </button>
                            <button
                                className="btn"
                                style={{ flex: 1, backgroundColor: 'var(--danger)' }}
                                onClick={() => setDeleteModal({ show: false, id: null, clientName: '', tipo_huevo: '', cantidad: 0 })}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
