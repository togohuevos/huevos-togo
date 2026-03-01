import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, ShoppingBag, MessageSquare, Plus, Phone, MapPin, Search } from 'lucide-react';

export default function Clients() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCliente, setNewCliente] = useState({ nombre_completo: '', celular: '', direccion: '' });

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

    const handleAddCliente = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase
            .from('clientes')
            .insert([newCliente])
            .select();

        if (data) {
            setClientes([...clientes, data[0]].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)));
            setShowAddForm(false);
            setNewCliente({ nombre_completo: '', celular: '', direccion: '' });
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
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
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

            {showAddForm && (
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Agregar Cliente</h2>
                    <form onSubmit={handleAddCliente} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            className="input"
                            placeholder="Nombre Completo"
                            value={newCliente.nombre_completo}
                            onChange={e => setNewCliente({ ...newCliente, nombre_completo: e.target.value })}
                            required
                        />
                        <input
                            className="input"
                            placeholder="Celular"
                            value={newCliente.celular}
                            onChange={e => setNewCliente({ ...newCliente, celular: e.target.value })}
                            required
                        />
                        <input
                            className="input"
                            placeholder="Dirección"
                            value={newCliente.direccion}
                            onChange={e => setNewCliente({ ...newCliente, direccion: e.target.value })}
                            required
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Guardar</button>
                            <button className="btn" type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? <p>Cargando clientes...</p> :
                    filteredClientes.map(cliente => (
                        <div key={cliente.id} className="glass" style={{ padding: '1rem', borderRadius: '1rem' }}>
                            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{cliente.nombre_completo}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Phone size={14} /> {cliente.celular}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MapPin size={14} /> {cliente.direccion}
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}
