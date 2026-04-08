import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkfagtcwosxfscjqwzzi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZmFndGN3b3N4ZnNjanF3enppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjg3MjAsImV4cCI6MjA4NzkwNDcyMH0.GzW0EucLEPVTUy29287f7xlh00geD2v1-_o3FKSii4s';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
  console.log('--- Supabase Audit ---');
  
  // Count records in tables
  const { count: pedidosCount, error: err1 } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
  console.log('Pedidos Count:', pedidosCount);
  
  const { count: clientesCount } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
  console.log('Clientes Count:', clientesCount);

  // Check login issue: try getting session or testing email?
  // We can't easily test login without a user/password, but maybe we can query tables
  // Let's get the most recent orders size
  
  const toLocalDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekRange = (offset = 0) => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return { monday };
  };

  const { monday: oldestMonday } = getWeekRange(-3);
  const startDateStr = toLocalDateStr(oldestMonday);

  const { data: recentOrders, error: err2 } = await supabase.from('pedidos').select('id').gte('fecha_entrega', startDateStr);
  console.log(`Recent Orders (>= ${startDateStr}):`, recentOrders?.length);

  if (err1) console.error('Error fetching pedidos:', err1);
  if (err2) console.error('Error fetching recent orders:', err2);
}

runAudit();
