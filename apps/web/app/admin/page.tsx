import { requireStaff } from '../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../lib/phase2a/supabase';
import { AdminFrame } from './admin-frame';
export default async function AdminPage() {
  const staff = await requireStaff();
  const client = await createSupabaseServerClient();
  const [newOrders, review, available, out, inquiry] = client
    ? await Promise.all([
        client.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'NEW'),
        client.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'IN_REVIEW'),
        client
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .eq('availability', 'AVAILABLE'),
        client
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .eq('availability', 'OUT_OF_STOCK'),
        client
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .eq('availability', 'INQUIRY_ONLY'),
      ])
    : [];
  const cards = [
    ['Новые заявки', newOrders?.count],
    ['В обработке', review?.count],
    ['В наличии', available?.count],
    ['Нет в наличии', out?.count],
    ['Уточнить наличие', inquiry?.count],
  ];
  return (
    <AdminFrame staff={staff}>
      <h1>Обзор</h1>
      <div className="grid">
        {cards.map(([label, count]) => (
          <div className="card" key={label}>
            <h2>{count ?? '—'}</h2>
            <p>{label}</p>
          </div>
        ))}
      </div>
    </AdminFrame>
  );
}
