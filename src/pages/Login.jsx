import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            if (error.message && (error.message.includes('fetch') || error.message.includes('Network'))) {
                setError('Error de conexión. El servidor de base de datos no está disponible.');
            } else {
                setError('Credenciales incorrectas o usuario no existe');
            }
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundImage: 'url("/fondo-granja.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
        }}>
            <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <img src="/personaje.png" alt="Logo" style={{ width: '80px', height: '80px', marginBottom: '1rem', borderRadius: '50%', objectFit: 'cover' }} />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Huevos To-Go</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Panel Administrativo</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            className="input"
                            type="email"
                            placeholder="Email"
                            style={{ paddingLeft: '40px' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            className="input"
                            type="password"
                            placeholder="Contraseña"
                            style={{ paddingLeft: '40px' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>}

                    <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? 'Entrando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
