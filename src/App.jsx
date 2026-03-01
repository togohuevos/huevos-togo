import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Clients from './pages/Clients';
import Orders from './pages/Orders';
import Complaints from './pages/Complaints';
import { useState } from 'react';
import { Users, ShoppingBag, MessageSquare, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('clients');

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>;

  if (!user) return <Login />;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      {/* Header */}
      <header style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Huevos To-Go</h2>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main>
        {currentPage === 'clients' && <Clients />}
        {currentPage === 'orders' && <Orders />}
        {currentPage === 'complaints' && <Complaints />}
      </main>

      {/* Mobile-optimized Nav */}
      <nav className="nav glass" style={{ borderRadius: '1.5rem 1.5rem 0 0' }}>
        <button
          onClick={() => setCurrentPage('clients')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: currentPage === 'clients' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <Users size={24} />
          <span style={{ fontSize: '0.75rem' }}>Clientes</span>
        </button>
        <button
          onClick={() => setCurrentPage('orders')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: currentPage === 'orders' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <ShoppingBag size={24} />
          <span style={{ fontSize: '0.75rem' }}>Pedidos</span>
        </button>
        <button
          onClick={() => setCurrentPage('complaints')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: currentPage === 'complaints' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <MessageSquare size={24} />
          <span style={{ fontSize: '0.75rem' }}>Quejas</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
