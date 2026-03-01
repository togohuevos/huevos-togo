import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, ShoppingBag, MessageSquare, Plus, Phone, MapPin, Search, Pencil, Trash2, X } from 'lucide-react';

export default function Clients() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [clienteData, setClienteData] = useState({
        nombre_completo: '',
        celular: '',
        direccion: '',
        unidad_apto: '',
        numero_casa: ''
    });

    // Detail Modal State
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientHistory, setClientHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [stats, setStats] = useState({ totalPanales: 0, totalPaid: 0 });

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .order('nombre_completo');
        if (data) setClientes(data);
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (isEditing) {
            const { data, error } = await supabase
                .from('clientes')
                .update(clienteData)
                .eq('id', clienteData.id)
                .select();

            if (data) {
                setClientes(clientes.map(c => c.id === data[0].id ? data[0] : c).sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)));
                resetForm();
            }
        } else {
            const { data, error } = await supabase
                .from('clientes')
                .insert([clienteData])
                .select();

            if (data) {
                setClientes([...clientes, data[0]].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)));
                resetForm();
            }
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setClienteData({
            nombre_completo: '',
            celular: '',
            direccion: '',
            unidad_apto: '',
            numero_casa: ''
        });
    };

    const startEdit = (cliente) => {
        setClienteData(cliente);
        setIsEditing(true);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const fetchClientHistory = async (clientId) => {
        setHistoryLoading(true);
        const { data: orders, error } = await supabase
            .from('pedidos')
            .select('*')
            .eq('cliente_id', clientId)
            .order('fecha_entrega', { ascending: false });

        if (orders) {
            // Get all prices to calculate total paid
            const { data: prices } = await supabase.from('precios_panales').select('*');
            const priceMap = {};
            if (prices) {
                prices.forEach(p => {
                    const key = `${p.semana_inicio}_${p.tipo_huevo}`;
                    priceMap[key] = p.precio_venta;
                });
            }

            let totalPanales = 0;
            let totalPaid = 0;

            const historyWithPrices = orders.map(o => {
                const monday = new Date(o.fecha_entrega);
                const day = monday.getDay();
                const diff = day === 0 ? -6 : 1 - day;
                monday.setDate(monday.getDate() + diff);
                const mondayStr = monday.toISOString().split('T')[0];

                const unitPrice = priceMap[`${mondayStr}_${o.tipo_huevo}`] || 0;
                const total = Number(o.cantidad) * unitPrice;

                totalPanales += Number(o.cantidad);
                if (o.estado === 'Delivered') totalPaid += total;

                return { ...o, totalPrice: total };
            });

            setClientHistory(historyWithPrices);
            setStats({ totalPanales, totalPaid });
        }
        setHistoryLoading(false);
    };

    const openClientDetail = (cliente) => {
        setSelectedClient(cliente);
        fetchClientHistory(cliente.id);
    };

    const formatCurrency = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

    const confirmDelete = async () => {
        const { error } = await supabase
            .from('clientes')
            .delete()
            .eq('id', deleteModal.id);

        if (!error) {
            setClientes(clientes.filter(c => c.id !== deleteModal.id));
            setDeleteModal({ show: false, id: null, name: '' });
        } else {
            alert('Error al eliminar el cliente');
        }
    };

    const filteredClientes = clientes.filter(c =>
        c.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.celular.includes(searchTerm)
    );

    return (
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Mis Clientes</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={20} /> Nuevo
                </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    className="input"
                    placeholder="Buscar por nombre o celular..."
                    style={{ paddingLeft: '40px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {showForm && (
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                        {isEditing ? 'Editar Cliente' : 'Agregar Cliente'}
                    </h2>
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            className="input"
                            placeholder="Nombre Completo"
                            value={clienteData.nombre_completo}
                            onChange={e => setClienteData({ ...clienteData, nombre_completo: e.target.value })}
                            required
                        />
                        <input
                            className="input"
                            placeholder="Celular"
                            value={clienteData.celular}
                            onChange={e => setClienteData({ ...clienteData, celular: e.target.value })}
                            required
                        />
                        <input
                            className="input"
                            placeholder="Dirección / Barrio"
                            value={clienteData.direccion}
                            onChange={e => setClienteData({ ...clienteData, direccion: e.target.value })}
                            required
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                className="input"
                                placeholder="Nombre de Unidad o Edificio"
                                value={clienteData.unidad_apto || ''}
                                onChange={e => setClienteData({ ...clienteData, unidad_apto: e.target.value })}
                            />
                            <input
                                className="input"
                                placeholder="Número de Casa o Apartamento"
                                value={clienteData.numero_casa || ''}
                                onChange={e => setClienteData({ ...clienteData, numero_casa: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>
                                {isEditing ? 'Guardar Cambios' : 'Guardar'}
                            </button>
                            <button className="btn" type="button" onClick={resetForm} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Client Detail Modal */}
            {selectedClient && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end',
                    zIndex: 1100
                }} onClick={() => setSelectedClient(null)}>
                    <div className="glass"
                        style={{
                            padding: '2rem', borderRadius: '2rem 2rem 0 0', width: '100%',
                            maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.3s ease-out'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{selectedClient.nombre_completo}</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Historial del Cliente</p>
                            </div>
                            <button onClick={() => setSelectedClient(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', padding: '8px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Panales</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.totalPanales}</p>
                            </div>
                            <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Invertido</p>
                                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{formatCurrency(stats.totalPaid)}</p>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Últimos Pedidos</h3>
                        {historyLoading ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando historial...</p> :
                            clientHistory.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay pedidos registrados.</p> :
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {clientHistory.map(order => (
                                        <div key={order.id} style={{
                                            padding: '0.75rem', borderRadius: '0.75rem',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <div>
                                                <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{order.cantidad} Panales Tipo {order.tipo_huevo}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.fecha_entrega}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: order.estado === 'Delivered' ? 'var(--accent)' : '#fbbf24' }}>
                                                    {order.estado === 'Delivered' ? 'Entregado' : 'Pendiente'}
                                                </p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatCurrency(order.totalPrice)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                        }
                    </div>
                </div>
            )}

            {/* Custom Delete Modal */}
            {deleteModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '2rem'
                }}>
                    <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>¿Seguro que deseas eliminar al cliente?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{deleteModal.name}</p>
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
                                onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? <p>Cargando clientes...</p> :
                    filteredClientes.map(cliente => (
                        <div
                            key={cliente.id}
                            className="glass"
                            onClick={() => openClientDetail(cliente)}
                            style={{ padding: '1rem', borderRadius: '1rem', position: 'relative', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{cliente.nombre_completo}</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); startEdit(cliente); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteModal({ show: true, id: cliente.id, name: cliente.nombre_completo }); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Phone size={14} /> {cliente.celular}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MapPin size={14} />
                                    <span>
                                        {cliente.direccion}
                                        {(cliente.unidad_apto || cliente.numero_casa) && ' - '}
                                        {cliente.unidad_apto} {cliente.numero_casa && `(${cliente.numero_casa})`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}
