import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag, Plus, Calendar, CheckCircle, Clock } from 'lucide-react';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newOrder, setNewOrder] = useState({
        cliente_id: '',
        tipo_huevo: 'A',
        cantidad: 1,
        metodo_pago: 'Efectivo',
        fecha_entrega: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchOrders();
        fetchClientes();
    }, []);

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('pedidos')
            .select('*, clientes(nombre_completo)')
            .order('fecha_entrega', { ascending: false });
        if (data) setOrders(data);
        setLoading(false);
    };

    const fetchClientes = async () => {
        const { data } = await supabase.from('clientes').select('id, nombre_completo');
        if (data) setClientes(data);
    };

    const handleAddOrder = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.from('pedidos').insert([newOrder]).select('*, clientes(nombre_completo)');
        if (data) {
            setOrders([data[0], ...orders]);
            setShowAddForm(false);
            setNewOrder({ cliente_id: '', tipo_huevo: 'A', cantidad: 1, metodo_pago: 'Efectivo', fecha_entrega: new Date().toISOString().split('T')[0] });
        }
    };

    const updateStatus = async (id, status) => {
        const { error } = await supabase.from('pedidos').update({ estado: status }).eq('id', id);
        if (!error) {
            setOrders(orders.map(o => o.id === id ? { ...o, estado: status } : o));
        }
    };

    return (
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Pedidos Semanales</h1>
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                    <Plus size={20} /> Nuevo
                </button>
            </div>

            {showAddForm && (
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Nuevo Pedido</h2>
                    <form onSubmit={handleAddOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <select
                            className="input"
                            value={newOrder.cliente_id}
                            onChange={e => setNewOrder({ ...newOrder, cliente_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccionar Cliente</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                        </select>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <select className="input" value={newOrder.tipo_huevo} onChange={e => setNewOrder({ ...newOrder, tipo_huevo: e.target.value })}>
                                <option value="A">Tipo A</option>
                                <option value="AA">Tipo AA</option>
                                <option value="AAA">Tipo AAA</option>
                            </select>
                            <input
                                className="input"
                                type="number"
                                placeholder="Cant. Panales"
                                value={newOrder.cantidad}
                                onChange={e => setNewOrder({ ...newOrder, cantidad: e.target.value })}
                                required
                            />
                        </div>

                        <input
                            className="input"
                            type="date"
                            value={newOrder.fecha_entrega}
                            onChange={e => setNewOrder({ ...newOrder, fecha_entrega: e.target.value })}
                            required
                        />

                        <select className="input" value={newOrder.metodo_pago} onChange={e => setNewOrder({ ...newOrder, metodo_pago: e.target.value })}>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Otro">Otro</option>
                        </select>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Registrar</button>
                            <button className="btn" type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => (
                    <div key={order.id} className="glass" style={{ padding: '1rem', borderRadius: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ fontWeight: '600' }}>{order.clientes?.nombre_completo}</h3>
                                <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{order.cantidad} panales - Tipo {order.tipo_huevo}</p>
                            </div>
                            <div style={{
                                padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem',
                                backgroundColor: order.estado === 'Delivered' ? 'var(--accent)' : 'var(--primary)',
                                color: 'white'
                            }}>
                                {order.estado === 'Delivered' ? 'Entregado' : 'Pendiente'}
                            </div>
                        </div>

                        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                <Calendar size={14} /> {order.fecha_entrega}
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
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
