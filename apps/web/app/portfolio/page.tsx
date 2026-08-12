import { createSupabaseAdminClient, createSupabaseServerClient } from '../../lib/phase2a/supabase';

export default async function PortfolioPage() {
  const publicClient = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data } = publicClient
    ? await publicClient
        .from('public_portfolio_items')
        .select('title,description,cover_image_path')
        .order('sort_order')
    : { data: [] };
  const items = await Promise.all(
    (data ?? []).map(async (item) => {
      if (!admin) return { ...item, imageUrl: null };
      const { data: signed } = await admin.storage
        .from('portfolio')
        .createSignedUrl(item.cover_image_path, 3600);
      return { ...item, imageUrl: signed?.signedUrl ?? null };
    }),
  );
  return (
    <section className="shell">
      <p className="eyebrow">Портфолио</p>
      <h1>Наши работы</h1>
      {items.length ? (
        <div className="grid">
          {items.map((item) => (
            <article className="card" key={item.cover_image_path}>
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived private URL
                <img loading="lazy" src={item.imageUrl} alt={item.title} />
              )}
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="notice">Опубликованные работы скоро появятся.</p>
      )}
    </section>
  );
}
