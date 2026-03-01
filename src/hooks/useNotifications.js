import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const getUserName = (email) => {
    if (!email) return null;
    if (email.includes('juan')) return 'Juan';
    if (email.includes('simon')) return 'Simón';
    return email.split('@')[0];
};

export function useNotifications() {
    const [permission, setPermission] = useState('default');
    const [notifications, setNotifications] = useState([]);
    const currentUserRef = useRef(null);

    useEffect(() => {
        // Get current user
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) currentUserRef.current = getUserName(user.email);
        });

        // Request notification permission
        if ('Notification' in window) {
            setPermission(Notification.permission);
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(p => setPermission(p));
            }
        }

        // Subscribe to pedidos changes (delivered)
        const pedidosChannel = supabase.channel('pedidos-realtime')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'pedidos'
            }, (payload) => {
                const newRecord = payload.new;
                const oldRecord = payload.old;

                // Only notify if status changed to Delivered and it was done by the OTHER user
                if (newRecord.estado === 'Delivered' && oldRecord.estado !== 'Delivered') {
                    if (newRecord.entregado_por && newRecord.entregado_por !== currentUserRef.current) {
                        const msg = `${newRecord.entregado_por} entregó un pedido (${newRecord.cantidad} panales)`;
                        showNotification('📦 Pedido Entregado', msg);
                        addToast(msg, 'delivered');
                    }
                }

                // Notify if status changed back to Pending
                if (newRecord.estado === 'Pending' && oldRecord.estado === 'Delivered') {
                    const msg = `Un pedido fue marcado como pendiente de nuevo`;
                    addToast(msg, 'pending');
                }
            })
            .subscribe();

        // Subscribe to quejas changes (new complaints)
        const quejasChannel = supabase.channel('quejas-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'quejas'
            }, (payload) => {
                const newComplaint = payload.new;
                if (newComplaint.registrada_por && newComplaint.registrada_por !== currentUserRef.current) {
                    const msg = `${newComplaint.registrada_por} registró una nueva queja`;
                    showNotification('⚠️ Nueva Queja', msg);
                    addToast(msg, 'complaint');
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'quejas'
            }, (payload) => {
                const newRecord = payload.new;
                const oldRecord = payload.old;
                if (newRecord.resuelta && !oldRecord.resuelta) {
                    const msg = `Una queja fue marcada como resuelta ✓`;
                    addToast(msg, 'resolved');
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(pedidosChannel);
            supabase.removeChannel(quejasChannel);
        };
    }, []);

    const showNotification = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '🥚',
                tag: Date.now().toString(),
            });
        }
    };

    const addToast = (message, type) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const dismissToast = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return { permission, notifications, dismissToast };
}
