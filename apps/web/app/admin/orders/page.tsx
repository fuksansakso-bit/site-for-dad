import { formatMoney } from '../../../lib/phase2a/pricing';
import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import { AdminFrame } from '../admin-frame';
import { updateOrder } from '../actions';
export default async function OrdersAdmin() {
  const staff = await requireStaff();
  const client = await createSupabaseServerClient();
  const { data } = client
    ? await client
        .from('orders')
        .select(
          'id,request_number,customer_name,customer_phone,locality,known_total_kopecks,pricing_status,status,internal_note,created_at,order_items(material_name_snapshot,article_snapshot,width_mm,height_mm,quantity,total_price_kopecks)',
        )
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [] };
  return (
    <AdminFrame staff={staff}>
      <h1>Заявки</h1>
      <div style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Клиент</th>
              <th>Состав</th>
              <th>Сумма</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((order) => (
              <tr key={order.id}>
                <td>
                  {order.request_number}
                  <br />
                  <small>{new Date(order.created_at).toLocaleString('ru-RU')}</small>
                </td>
                <td>
                  {order.customer_name}
                  <br />
                  <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
                  <br />
                  {order.locality}
                  <br />
                  <a
                    href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </td>
                <td>
                  <ul>
                    {order.order_items.map((item) => (
                      <li key={`${item.article_snapshot}-${item.width_mm}-${item.height_mm}`}>
                        {item.material_name_snapshot} ({item.article_snapshot}), {item.width_mm}×
                        {item.height_mm} мм, {item.quantity} шт.
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  {order.known_total_kopecks === null
                    ? 'Уточнить'
                    : formatMoney(order.known_total_kopecks)}
                </td>
                <td>
                  <form action={updateOrder} className="form">
                    <input type="hidden" name="id" value={order.id} />
                    <select name="status" defaultValue={order.status}>
                      <option value="NEW">Новая</option>
                      <option value="IN_REVIEW">В обработке</option>
                      <option value="CONTACTED">Связались</option>
                      <option value="COMPLETED">Завершена</option>
                      <option value="CANCELLED">Отменена</option>
                    </select>
                    <textarea
                      name="note"
                      defaultValue={order.internal_note ?? ''}
                      placeholder="Внутренняя заметка"
                    />
                    <button>Сохранить</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminFrame>
  );
}
