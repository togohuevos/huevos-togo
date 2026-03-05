import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import Login from './pages/Login';
import Clients from './pages/Clients';
import Orders from './pages/Orders';
import Complaints from './pages/Complaints';
import Accounting from './pages/Accounting';
import Dashboard from './pages/Dashboard';
import { useState, useEffect } from 'react';
import { Users, ShoppingBag, MessageSquare, Calculator, LogOut, Home, X, Sun, Moon, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';
import { APP_VERSION, CHANGELOG } from './version';

function App() {
  const { user, loading } = useAuth();
  const { notifications, dismissToast } = useNotifications();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showChangelog, setShowChangelog] = useState(false);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>Huevos To-Go</h2>
          <button
            onClick={() => setShowChangelog(true)}
            title="Ver novedades"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: 'var(--primary)',
              cursor: 'pointer',
              padding: '2px 7px',
              borderRadius: '999px',
              fontSize: '0.65rem',
              fontWeight: '700',
              letterSpacing: '0.03em'
            }}
          >
            v{APP_VERSION}
          </button>
        </div>
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
            onClick={() => window.location.reload()}
            title="Refrescar"
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}
          >
            <RefreshCw size={20} />
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

      {/* Changelog Modal */}
      {showChangelog && (
        <div
          onClick={() => setShowChangelog(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass"
            style={{
              width: '100%', maxWidth: '600px', borderRadius: '1.5rem 1.5rem 0 0',
              padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Historial de Versiones</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Versión actual: {APP_VERSION}</p>
              </div>
              <button onClick={() => setShowChangelog(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {CHANGELOG.map((release, idx) => (
              <div key={release.version} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{
                    background: idx === 0 ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                    color: idx === 0 ? '#000' : 'var(--text-muted)',
                    borderRadius: '999px', padding: '2px 10px',
                    fontSize: '0.75rem', fontWeight: '700'
                  }}>
                    v{release.version}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{release.date}</span>
                  {idx === 0 && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '600', marginLeft: '4px' }}>● Actual</span>
                  )}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {release.changes.map((change, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      <span style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '1px' }}>•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
                {idx < CHANGELOG.length - 1 && (
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginTop: '1.25rem' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
