// App version and changelog
// Update this file with every new release

export const APP_VERSION = '1.2';

export const CHANGELOG = [
    {
        version: '1.2',
        date: '10 de marzo de 2025',
        changes: [
            'Se agregó pantalla de bienvenida animada con el personaje de huevo y su bigote al abrir la app.',
            'Se agregó botón de estado de pago (Pagado / Pago Pendiente) en cada tarjeta de pedido.',
        ]
    },
    {
        version: '1.1',
        date: '5 de marzo de 2025',
        changes: [
            'Se implementó búsqueda de clientes por nombre al crear nuevos pedidos.',
            'Se corrigió el comportamiento del interruptor de WhatsApp Automático; ahora respeta correctamente el estado configurado en la pestaña de Inicio.',
            'Se agregó botón de actualización de página en el encabezado de la aplicación.',
            'Se optimizó la velocidad de carga de la pestaña de Inicio mediante carga paralela de datos.',
            'Se mejoró la estabilidad general del formulario de pedidos.',
        ]
    },
    {
        version: '1.0',
        date: 'Lanzamiento inicial',
        changes: [
            'Lanzamiento inicial de la aplicación Huevos To-Go.',
            'Gestión de clientes, pedidos y quejas.',
            'Panel de control con resumen semanal de finanzas y actividad.',
            'Integración con WhatsApp para envío de recibos.',
            'Módulo de contabilidad y registro de precios por semana.',
        ]
    }
];
