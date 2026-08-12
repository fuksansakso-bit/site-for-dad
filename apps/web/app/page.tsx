import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { IntroLoader } from '../components/intro/intro-loader';
import { ButtonLink, SectionHeading, StatusBadge } from '../components/ui/primitives';
import { isAiVisualizerAvailable } from '../lib/ai-visualization/public-availability';
import {
  getSiteSettings,
  listCategories,
  listFeaturedMaterials,
  listPortfolioItems,
  publicImageUrl,
} from '../lib/phase2a/data';
import { buildWhatsAppHref, formatRubles } from '../lib/presentation';

export const metadata: Metadata = {
  description:
    'Выберите материал для жалюзи, рассчитайте предварительную стоимость и отправьте заявку мастеру.',
  title: 'Жалюзи для вашего интерьера',
};

export default async function HomePage() {
  const [categories, materials, portfolio, settings, aiEnabled] = await Promise.all([
    listCategories(),
    listFeaturedMaterials(6),
    listPortfolioItems(3),
    getSiteSettings(),
    isAiVisualizerAvailable(),
  ]);
  const whatsapp = buildWhatsAppHref(settings?.whatsapp_phone);
  const partnerBadgeUrl = publicImageUrl('branding', settings?.partner_badge_path ?? null);
  const serviceLabels = [
    settings?.free_measurement && 'Бесплатный замер',
    settings?.free_delivery && 'Бесплатная доставка',
    settings?.free_installation && 'Бесплатная установка',
  ].filter((value): value is string => Boolean(value));
  const trustFacts = [
    settings?.lead_time_text && { label: 'Срок изготовления', value: settings.lead_time_text },
    settings?.warranty_text && { label: 'Гарантия', value: settings.warranty_text },
    settings?.region && { label: 'Работаем', value: settings.region },
  ].filter((value): value is { label: string; value: string } => Boolean(value));

  return (
    <>
      <IntroLoader />

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Свет в точной пропорции</p>
            <h1>Жалюзи, которые подходят вашему интерьеру</h1>
            <p className="hero-lead">
              Выберите материал, рассчитайте предварительную стоимость и отправьте готовую заявку
              мастеру.
            </p>
            {aiEnabled && (
              <p className="hero-ai-note">
                <span aria-hidden="true">✦</span>
                Посмотрите выбранный материал на фотографии своего окна.
              </p>
            )}
            <div className="actions hero-actions">
              <ButtonLink href="/calculator">Рассчитать стоимость</ButtonLink>
              <ButtonLink href="/catalog" variant="secondary">
                Открыть каталог
              </ButtonLink>
              {aiEnabled && (
                <ButtonLink href="/visualizer" variant="quiet">
                  AI-примерка
                </ButtonLink>
              )}
            </div>
            {serviceLabels.length > 0 && (
              <ul className="hero-proof" aria-label="Условия обслуживания">
                {serviceLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="hero-room" aria-hidden="true">
            <div className="hero-room-glow" />
            <div className="hero-window">
              <div className="hero-window-view" />
              <div className="hero-blind">
                {Array.from({ length: 12 }, (_, index) => (
                  <span key={index} />
                ))}
              </div>
              <div className="hero-window-frame" />
              <div className="hero-blind-cord" />
            </div>
            <div className="hero-console">
              <span />
              <span />
            </div>
            <div className="hero-vase">
              <i />
              <i />
              <i />
            </div>
            <p>
              Тихий свет
              <br />
              для живого дома
            </p>
          </div>
        </div>
      </section>

      <section className="shell landing-section" id="catalog-categories">
        <SectionHeading
          description="От лаконичных рулонных систем до фактурных деревянных решений — начните с типа конструкции."
          eyebrow="Коллекция"
          title="Найдите свой способ управлять светом"
        />
        {categories.length ? (
          <div className="category-grid">
            {categories.slice(0, 6).map((category, index) => (
              <Link
                className="category-card"
                key={category.slug}
                href={`/catalog?category=${category.slug}`}
              >
                <span className="category-media">
                  {publicImageUrl('catalog', category.image_path) ? (
                    <Image
                      alt={category.name}
                      height={560}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      src={publicImageUrl('catalog', category.image_path)!}
                      width={760}
                    />
                  ) : (
                    <span className={`category-texture category-texture-${(index % 3) + 1}`} />
                  )}
                </span>
                <span className="category-copy">
                  <span className="category-number">0{index + 1}</span>
                  <strong>{category.name}</strong>
                  {category.description && <small>{category.description}</small>}
                  <span className="text-link">
                    Смотреть материалы <span aria-hidden="true">→</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="quiet-panel">
            <h3>Каталог готовится к показу</h3>
            <p>Опубликованные категории появятся здесь после подключения проверенных данных.</p>
          </div>
        )}
        <div className="section-action">
          <ButtonLink href="/catalog" variant="secondary">
            Весь каталог
          </ButtonLink>
        </div>
      </section>

      <section className="process-section">
        <div className="shell landing-section">
          <SectionHeading eyebrow="От идеи до установки" title="Три понятных шага" />
          <ol className="process-grid">
            <li>
              <span>01</span>
              <h3>Выберите материал</h3>
              <p>Сравните цвет, фактуру, наличие и ориентир по стоимости в каталоге.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Укажите размеры</h3>
              <p>Калькулятор соберёт конфигурацию и покажет предварительную стоимость.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Отправьте заявку</h3>
              <p>Мастер свяжется с вами, уточнит детали и согласует замер.</p>
            </li>
          </ol>
        </div>
      </section>

      {materials.length > 0 && (
        <section className="shell landing-section">
          <SectionHeading
            description="Только опубликованные позиции из актуального каталога."
            eyebrow="Популярные материалы"
            title="Фактуры, которые хочется рассмотреть ближе"
          />
          <div className="material-showcase">
            {materials.map((material) => {
              const imageUrl = publicImageUrl('catalog', material.primary_image_path);
              return (
                <Link
                  className="material-tile"
                  href={`/catalog/${material.slug}`}
                  key={material.slug}
                >
                  {imageUrl && (
                    <Image
                      alt={`${material.name}${material.color_name ? `, ${material.color_name}` : ''}`}
                      height={640}
                      sizes="(max-width: 760px) 88vw, (max-width: 1100px) 44vw, 28vw"
                      src={imageUrl}
                      width={820}
                    />
                  )}
                  <span className="material-tile-overlay">
                    <StatusBadge>{material.availability_label}</StatusBadge>
                    <strong>{material.name}</strong>
                    <small>{material.color_name ?? `Артикул ${material.article}`}</small>
                    <b>
                      {formatRubles(material.display_price_kopecks)}{' '}
                      {material.display_price_suffix ?? ''}
                    </b>
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="section-action">
            <ButtonLink href="/catalog" variant="secondary">
              Посмотреть все материалы
            </ButtonLink>
          </div>
        </section>
      )}

      <section className="calculator-teaser">
        <div className="calculator-teaser-inner">
          <div>
            <p className="eyebrow">Предварительный расчёт</p>
            <h2>Стоимость — без загадок и звонка на первом шаге</h2>
            <p>
              Выберите материал, введите ширину и высоту окна. Если для позиции доступна цена,
              калькулятор покажет ориентир до подтверждения мастером.
            </p>
            <ButtonLink href="/calculator">Рассчитать стоимость</ButtonLink>
          </div>
          <div className="measure-card" aria-hidden="true">
            <span className="measure-line measure-line-width">
              <i>ширина</i>
            </span>
            <span className="measure-line measure-line-height">
              <i>высота</i>
            </span>
            <span className="measure-window">
              <i />
              <i />
            </span>
          </div>
        </div>
      </section>

      {aiEnabled && (
        <section className="shell landing-section ai-teaser">
          <div className="ai-teaser-visual" aria-hidden="true">
            <span className="ai-before">до</span>
            <span className="ai-after">после</span>
            <i />
          </div>
          <div>
            <p className="eyebrow">AI-примерка</p>
            <h2>Посмотрите материал прямо на своём окне</h2>
            <p>
              Загрузите фотографию, выберите опубликованный материал и получите наглядный вариант
              для сравнения. Исходник и результат хранятся ограниченное время.
            </p>
            <ButtonLink href="/visualizer">Попробовать AI-примерку</ButtonLink>
          </div>
        </section>
      )}

      {portfolio.some((item) => item.imageUrl) && (
        <section className="portfolio-section">
          <div className="shell landing-section">
            <SectionHeading
              description="Опубликованные примеры реальных работ мастера."
              eyebrow="Наши работы"
              title="Сделано для конкретных окон и интерьеров"
            />
            <div className="portfolio-strip">
              {portfolio
                .filter((item) => item.imageUrl)
                .map((item, index) => (
                  <article
                    className={`portfolio-tile portfolio-tile-${index + 1}`}
                    key={item.cover_image_path}
                  >
                    <Image
                      alt={item.title}
                      fill
                      sizes="(max-width: 760px) 92vw, (max-width: 1100px) 50vw, 38vw"
                      src={item.imageUrl!}
                    />
                    <div>
                      <h3>{item.title}</h3>
                      {item.description && <p>{item.description}</p>}
                    </div>
                  </article>
                ))}
            </div>
            <div className="section-action">
              <ButtonLink href="/portfolio" variant="secondary">
                Все работы
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      <section className="shell landing-section trust-section" id="about">
        <div className="trust-intro">
          <p className="eyebrow">Мастерская рядом</p>
          <h2>Точный подбор, аккуратный замер, понятный следующий шаг</h2>
          <p>
            Сайт помогает заранее выбрать решение и собрать заявку. Финальные размеры, стоимость и
            условия мастер подтверждает лично.
          </p>
        </div>
        {(trustFacts.length > 0 || serviceLabels.length > 0) && (
          <dl className="trust-facts">
            {trustFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
            {serviceLabels.length > 0 && (
              <div>
                <dt>Бесплатно</dt>
                <dd>{serviceLabels.join(', ')}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <section className="partner-band">
        <div className="partner-band-inner">
          <div className="partner-mark">
            {partnerBadgeUrl ? (
              <Image
                alt="Официальный партнёр AMIGO"
                height={80}
                src={partnerBadgeUrl}
                width={220}
              />
            ) : (
              <strong>AMIGO</strong>
            )}
          </div>
          <div>
            <p className="eyebrow">Подтверждённое партнёрство</p>
            <h2>Официальный партнёр AMIGO</h2>
            <p>Каталог и материалы публикуются с сохранением источника и статуса прав.</p>
          </div>
        </div>
      </section>

      <section className="shell landing-section faq-section">
        <SectionHeading eyebrow="Вопросы" title="Что важно знать до заявки" />
        <div className="faq-list">
          {settings?.lead_time_text && (
            <details>
              <summary>Сколько занимает изготовление?</summary>
              <p>
                {settings.lead_time_text}. Точный срок зависит от выбранной системы и подтверждается
                мастером.
              </p>
            </details>
          )}
          {settings?.warranty_text && (
            <details>
              <summary>Какая гарантия действует?</summary>
              <p>{settings.warranty_text}. Детали фиксируются при согласовании заказа.</p>
            </details>
          )}
          {serviceLabels.length > 0 && (
            <details>
              <summary>Какие услуги бесплатны?</summary>
              <p>{serviceLabels.join(', ')}.</p>
            </details>
          )}
          <details>
            <summary>Цена в калькуляторе окончательная?</summary>
            <p>
              Нет. Это предварительный расчёт, который мастер проверит после уточнения размеров и
              комплектации.
            </p>
          </details>
          {aiEnabled && (
            <details>
              <summary>Что происходит с фотографией для AI-примерки?</summary>
              <p>
                Она остаётся приватной, используется только для выбранной обработки и удаляется по
                установленному сроку хранения.
              </p>
            </details>
          )}
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-inner">
          <p className="eyebrow">Начните с размеров</p>
          <h2>Рассчитайте стоимость жалюзи для вашего окна</h2>
          <div className="actions">
            <ButtonLink href="/calculator">Рассчитать стоимость</ButtonLink>
            {whatsapp && (
              <a
                className="button button-secondary"
                href={whatsapp}
                rel="noreferrer"
                target="_blank"
              >
                Написать в WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
