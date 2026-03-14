// App version and changelog
// Update this file with every new release

export const APP_VERSION = '1.3';

export const CHANGELOG = [
    {
        version: '1.3',
        date: '14 de marzo de 2025',
        changes: [
            'Priorización de pedidos: los pedidos programados para "Hoy" aparecen arriba del todo de los pendientes.',
            'Resaltado visual: los pedidos del día actual incluyen un badge de "HOY" y un borde destacado.',
            'Vista semanal por defecto: la pestaña de "Semana" es ahora la principal al abrir Pedidos.',
            'Selector de vistas reordenado: Semana | Todos | Ruta.',
            'Al marcar un pedido como entregado, se mueve automáticamente al final de la lista.',
            'Diferenciación de pago: Amarillo (Pago Pendiente) y Verde (Pagado) para pedidos entregados.',
            'Transición animada al cambiar entre estados de entrega y pago.',
            'Historial del cliente: pedidos pendientes primero y entregados al final.',
        ]
    },
    {
        changes: [
            'Se agregó pantalla de bienvenida animada con el personaje de huevo y su bigote al abrir la app.',
            'Se agregó botón de estado de pago (Pagado / Pago Pendiente) en cada tarjeta de pedido.',
            'Los pedidos ahora se ordenan por fecha de registro (más reciente primero) con botón para invertir el orden.',
            'Los pedidos muestran el día de la semana junto a la fecha de entrega (ej. lunes, martes).',
            'Se agregó módulo de Inventario en Almacén en la pestaña Contable (stock por tipo, agregar panales, alerta de stock bajo).',
            'El inventario se descuenta automáticamente al crear un pedido y se restaura al borrarlo.',
            'Alerta roja en el Dashboard cuando algún tipo tiene menos de 5 panales en almacén.',
            'Se agregó botón "– Quitar" en el inventario para descontar panales manualmente.',
            'Se agregó opción "Fijar valor" en el inventario para establecer el stock real en cualquier momento.',
            'Inventario rediseñado: ahora descuenta automáticamente los pedidos de la semana actual (incluidos los ya existentes). Permite negativos si los pedidos superan el stock.',
            'UI del inventario mejorada con filas horizontales para mejor visualización en móvil.',
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
