import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Plus, CheckCircle, Clock, Send, Pencil, Trash2 } from 'lucide-react';

// User color mapping (same as Orders)
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

export default function Complaints() {
    const [quejas, setQuejas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [quejaData, setQuejaData] = useState({ cliente_id: '', descripcion: '' });

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, clientName: '' });

    // Reverse Modal State (for unresolving)
    const [reverseModal, setReverseModal] = useState({ show: false, id: null });

    useEffect(() => {
        fetchQuejas();
        fetchClientes();
        getCurrentUser();
    }, []);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(getUserName(user.email));
    };

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

    const handleSave = async (e) => {
        e.preventDefault();

        if (isEditing) {
            const updatePayload = {
                cliente_id: quejaData.cliente_id,
                descripcion: quejaData.descripcion
            };
            const { data, error } = await supabase
                .from('quejas')
                .update(updatePayload)
                .eq('id', quejaData.id)
                .select('*, clientes(nombre_completo)');

            if (data) {
                setQuejas(quejas.map(q => q.id === data[0].id ? data[0] : q));
                resetForm();
            }
        } else {
            const insertData = {
                ...quejaData,
                registrada_por: currentUser,
                registrada_at: new Date().toISOString()
            };
            const { data } = await supabase
                .from('quejas')
                .insert([insertData])
                .select('*, clientes(nombre_completo)');
            if (data) {
                setQuejas([data[0], ...quejas]);
                resetForm();
            }
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setQuejaData({ cliente_id: '', descripcion: '' });
    };

    const startEdit = (queja) => {
        setQuejaData({
            id: queja.id,
            cliente_id: queja.cliente_id,
            descripcion: queja.descripcion
        });
        setIsEditing(true);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = async () => {
        const { error } = await supabase
            .from('quejas')
            .delete()
            .eq('id', deleteModal.id);

        if (!error) {
            setQuejas(quejas.filter(q => q.id !== deleteModal.id));
            setDeleteModal({ show: false, id: null, clientName: '' });
        } else {
            alert('Error al eliminar la queja');
        }
    };

    const markResolved = async (id) => {
        const { error } = await supabase.from('quejas').update({ resuelta: true }).eq('id', id);
        if (!error) {
            setQuejas(quejas.map(q => q.id === id ? { ...q, resuelta: true } : q));
        }
    };

    const confirmUnresolve = async () => {
        const { error } = await supabase.from('quejas').update({ resuelta: false }).eq('id', reverseModal.id);
        if (!error) {
            setQuejas(quejas.map(q => q.id === reverseModal.id ? { ...q, resuelta: false } : q));
            setReverseModal({ show: false, id: null });
        }
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Quejas y Reclamos</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={20} /> Nueva
                </button>
            </div>

            {showForm && (
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                        {isEditing ? 'Editar Queja' : 'Registrar Queja'}
                    </h2>
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <select
                            className="input"
                            value={quejaData.cliente_id}
                            onChange={e => setQuejaData({ ...quejaData, cliente_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccionar Cliente</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                        </select>

                        <textarea
                            className="input"
                            placeholder="Descripción de la queja..."
                            style={{ minHeight: '100px', resize: 'none' }}
                            value={quejaData.descripcion}
                            onChange={e => setQuejaData({ ...quejaData, descripcion: e.target.value })}
                            required
                        />

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>
                                {isEditing ? 'Guardar Cambios' : 'Enviar'}
                            </button>
                            <button className="btn" type="button" onClick={resetForm} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                Cancelar
                            </button>
                        </div>
                    </form>
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
                        <h3 style={{ marginBottom: '1rem' }}>¿Seguro que deseas eliminar esta queja?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Queja de: {deleteModal.clientName}</p>
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
                                onClick={() => setDeleteModal({ show: false, id: null, clientName: '' })}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reverse Resolve Modal */}
            {reverseModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '2rem'
                }}>
                    <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>¿Seguro que quieres marcar como pendiente?</h3>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className="btn"
                                style={{ flex: 1, backgroundColor: 'var(--accent)' }}
                                onClick={confirmUnresolve}
                            >
                                Sí
                            </button>
                            <button
                                className="btn"
                                style={{ flex: 1, backgroundColor: 'var(--danger)' }}
                                onClick={() => setReverseModal({ show: false, id: null })}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {quejas.map(queja => (
                    <div key={queja.id} className="glass" style={{ padding: '1rem', borderRadius: '1rem', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ fontWeight: '600' }}>{queja.clientes?.nombre_completo}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    onClick={() => startEdit(queja)}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ show: true, id: queja.id, clientName: queja.clientes?.nombre_completo })}
                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                                <div
                                    onClick={() => {
                                        if (queja.resuelta) {
                                            setReverseModal({ show: true, id: queja.id });
                                        }
                                    }}
                                    style={{
                                        color: queja.resuelta ? 'var(--accent)' : 'var(--danger)',
                                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem',
                                        cursor: queja.resuelta ? 'pointer' : 'default'
                                    }}
                                >
                                    {queja.resuelta ? <CheckCircle size={14} /> : <Clock size={14} />}
                                    {queja.resuelta ? 'Resuelta' : 'Pendiente'}
                                </div>
                            </div>
                        </div>

                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '0.5rem 0' }}>{queja.descripcion}</p>

                        {/* User tracking info */}
                        {queja.registrada_por && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.2)',
                                fontSize: '0.8rem', marginBottom: '0.5rem'
                            }}>
                                <span>
                                    Registrada por{' '}
                                    <strong style={{ color: USER_COLORS[queja.registrada_por] || '#ccc' }}>
                                        {queja.registrada_por}
                                    </strong>
                                </span>
                                {queja.registrada_at && (
                                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                                        · {formatDateTime(queja.registrada_at)}
                                    </span>
                                )}
                            </div>
                        )}

                        {!queja.resuelta && (
                            <button
                                className="btn"
                                style={{ width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', fontSize: '0.8rem', marginTop: '0.5rem' }}
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
