import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Plus, CheckCircle, Clock, Send } from 'lucide-react';

export default function Complaints() {
    const [quejas, setQuejas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newQueja, setNewQueja] = useState({ cliente_id: '', descripcion: '' });

    useEffect(() => {
        fetchQuejas();
        fetchClientes();
    }, []);

    const fetchQuejas = async () => {
        const { data } = await supabase
            .from('quejas')
            .select('*, clientes(nombre_completo)')
            .order('fecha', { ascending: false });
        if (data) setQuejas(data);
        setLoading(false);
    };

    const fetchClientes = async () => {
        const { data } = await supabase.from('clientes').select('id, nombre_completo');
        if (data) setClientes(data);
    };

    const handleAddQueja = async (e) => {
        e.preventDefault();
        const { data } = await supabase.from('quejas').insert([newQueja]).select('*, clientes(nombre_completo)');
        if (data) {
            setQuejas([data[0], ...quejas]);
            setShowAddForm(false);
            setNewQueja({ cliente_id: '', descripcion: '' });
        }
    };

    const markResolved = async (id) => {
        const { error } = await supabase.from('quejas').update({ resuelta: true }).eq('id', id);
        if (!error) {
            setQuejas(quejas.map(q => q.id === id ? { ...q, resuelta: true } : q));
        }
    };

    return (
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Quejas y Reclamos</h1>
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                    <Plus size={20} /> Nueva
                </button>
            </div>

            {showAddForm && (
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Registrar Queja</h2>
                    <form onSubmit={handleAddQueja} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <select
                            className="input"
                            value={newQueja.cliente_id}
                            onChange={e => setNewQueja({ ...newQueja, cliente_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccionar Cliente</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                        </select>

                        <textarea
                            className="input"
                            placeholder="Descripción de la queja..."
                            style={{ minHeight: '100px', resize: 'none' }}
                            value={newQueja.descripcion}
                            onChange={e => setNewQueja({ ...newQueja, descripcion: e.target.value })}
                            required
                        />

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Enviar</button>
                            <button className="btn" type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {quejas.map(queja => (
                    <div key={queja.id} className="glass" style={{ padding: '1rem', borderRadius: '1rem', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontWeight: '600' }}>{queja.clientes?.nombre_completo}</h3>
                            <div style={{
                                color: queja.resuelta ? 'var(--accent)' : 'var(--danger)',
                                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem'
                            }}>
                                {queja.resuelta ? <CheckCircle size={14} /> : <Clock size={14} />}
                                {queja.resuelta ? 'Resuelta' : 'Pendiente'}
                            </div>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '1rem' }}>{queja.descripcion}</p>

                        {!queja.resuelta && (
                            <button
                                className="btn"
                                style={{ width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', fontSize: '0.8rem' }}
                                onClick={() => markResolved(queja.id)}
                            >
                                Marcar como resuelta
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
