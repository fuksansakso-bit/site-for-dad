import { StatusBadge } from '../../../components/ui/primitives';
import { PremiumSelect } from '../../../components/ui/premium-select';
import { formatMoney } from '../../../lib/phase2a/pricing';
import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import { presentRequestStatus } from '../../../lib/presentation';
import { AdminEmptyState, AdminMetric, AdminPageHeader } from '../admin-components';
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
  const orders = data ?? [];
  const newCount = orders.filter((order) => order.status === 'NEW').length;
  const inProgressCount = orders.filter((order) =>
    ['IN_REVIEW', 'CONTACTED'].includes(order.status),
  ).length;
  return (
    <AdminFrame staff={staff}>
      <AdminPageHeader
        description="Контакты, состав заявки и внутренний рабочий статус. Сохранённые суммы не пересчитываются задним числом."
        eyebrow="Работа с клиентами"
        title="Заявки"
      />
      <div className="admin-metric-grid admin-metric-grid-compact">
        <AdminMetric label="Всего в списке" value={orders.length} />
        <AdminMetric label="Новые" tone="warning" value={newCount} />
        <AdminMetric label="В работе" value={inProgressCount} />
      </div>
      {orders.length === 0 ? (
        <AdminEmptyState
          description="Новые обращения появятся здесь после отправки формы на сайте."
          title="Заявок пока нет"
        />
      ) : (
        <div className="admin-table-scroll admin-orders-table">
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
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong className="admin-table-title">{order.request_number}</strong>
                    <small>{new Date(order.created_at).toLocaleString('ru-RU')}</small>
                  </td>
                  <td>
                    <strong className="admin-table-title">{order.customer_name}</strong>
                    <span>{order.locality}</span>
                    <div className="admin-contact-links">
                      <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
                      <a
                        href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp ↗
                      </a>
                    </div>
                  </td>
                  <td>
                    <ul className="admin-order-items">
                      {order.order_items.map((item) => (
                        <li key={`${item.article_snapshot}-${item.width_mm}-${item.height_mm}`}>
                          {item.material_name_snapshot} ({item.article_snapshot}), {item.width_mm}×
                          {item.height_mm} мм, {item.quantity} шт.
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <strong className="admin-table-title">
                      {order.known_total_kopecks === null
                        ? 'Цена не была сохранена'
                        : formatMoney(order.known_total_kopecks)}
                    </strong>
                    <small>
                      {order.pricing_status === 'KNOWN'
                        ? 'Сохранённая сумма'
                        : 'Есть позиции без цены'}
                    </small>
                  </td>
                  <td>
                    <StatusBadge
                      tone={
                        order.status === 'COMPLETED'
                          ? 'success'
                          : order.status === 'CANCELLED'
                            ? 'error'
                            : order.status === 'NEW'
                              ? 'warning'
                              : 'neutral'
                      }
                    >
                      {presentRequestStatus(order.status)}
                    </StatusBadge>
                    <form action={updateOrder} className="admin-order-editor">
                      <input type="hidden" name="id" value={order.id} />
                      <PremiumSelect
                        ariaLabel={`Рабочий статус заявки ${order.request_number}`}
                        name="status"
                        defaultValue={order.status}
                        options={[
                          { label: 'Новая', value: 'NEW' },
                          { label: 'В обработке', value: 'IN_REVIEW' },
                          { label: 'Связались', value: 'CONTACTED' },
                          { label: 'Завершена', value: 'COMPLETED' },
                          { label: 'Отменена', value: 'CANCELLED' },
                        ]}
                      />
                      <textarea
                        aria-label={`Внутренняя заметка к заявке ${order.request_number}`}
                        name="note"
                        defaultValue={order.internal_note ?? ''}
                        placeholder="Внутренняя заметка"
                      />
                      <button className="button-compact">Сохранить</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminFrame>
  );
}
