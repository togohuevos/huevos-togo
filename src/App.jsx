import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import Login from './pages/Login';
import Clients from './pages/Clients';
import Orders from './pages/Orders';
import Complaints from './pages/Complaints';
import Accounting from './pages/Accounting';
import Dashboard from './pages/Dashboard';
import { useState, useEffect } from 'react';
import { Users, ShoppingBag, MessageSquare, Calculator, LogOut, Home, X, Sun, Moon } from 'lucide-react';
import { supabase } from './lib/supabase';

function App() {
  const { user, loading } = useAuth();
  const { notifications, dismissToast } = useNotifications();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>;

  if (!user) return <Login />;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      {/* Toast Notifications */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '0.5rem',
          maxWidth: '500px', width: 'calc(100% - 2rem)'
        }}>
          {notifications.map(n => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: '0.75rem',
              backgroundColor: n.type === 'delivered' ? 'rgba(16, 185, 129, 0.95)' :
                n.type === 'complaint' ? 'rgba(239, 68, 68, 0.95)' :
                  n.type === 'resolved' ? 'rgba(96, 165, 250, 0.95)' : 'rgba(251, 191, 36, 0.95)',
              color: 'white', fontSize: '0.85rem', fontWeight: '500',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              animation: 'slideDown 0.3s ease'
            }}>
              <span style={{ flex: 1 }}>{n.message}</span>
              <button onClick={() => dismissToast(n.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '2px' }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Header */}
      <header style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>Huevos To-Go</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main>
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'clients' && <Clients />}
        {currentPage === 'orders' && <Orders />}
        {currentPage === 'complaints' && <Complaints />}
        {currentPage === 'accounting' && <Accounting />}
      </main>

      {/* Mobile-optimized Nav */}
      <nav className="nav glass" style={{ borderRadius: '1.5rem 1.5rem 0 0' }}>
        <button
          onClick={() => setCurrentPage('dashboard')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: currentPage === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <Home size={22} />
          <span style={{ fontSize: '0.65rem' }}>Inicio</span>
        </button>
        <button
          onClick={() => setCurrentPage('clients')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: currentPage === 'clients' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <Users size={22} />
          <span style={{ fontSize: '0.65rem' }}>Clientes</span>
        </button>
        <button
          onClick={() => setCurrentPage('orders')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: currentPage === 'orders' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <ShoppingBag size={22} />
          <span style={{ fontSize: '0.65rem' }}>Pedidos</span>
        </button>
        <button
          onClick={() => setCurrentPage('complaints')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: currentPage === 'complaints' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <MessageSquare size={22} />
          <span style={{ fontSize: '0.65rem' }}>Quejas</span>
        </button>
        <button
          onClick={() => setCurrentPage('accounting')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            background: 'none', border: 'none', color: currentPage === 'accounting' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          <Calculator size={22} />
          <span style={{ fontSize: '0.65rem' }}>Contable</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
