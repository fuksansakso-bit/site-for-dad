'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="shell">
      <h1>Что-то пошло не так</h1>
      <p>Технические подробности скрыты. Попробуйте ещё раз.</p>
      <button onClick={reset}>Повторить</button>
    </section>
  );
}
