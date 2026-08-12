import { listMaterials } from '../../lib/phase2a/data';
import { CalculatorClient } from './calculator-client';
export default async function CalculatorPage() {
  const materials = await listMaterials();
  return (
    <section className="shell">
      <p className="eyebrow">Предварительный расчёт</p>
      <h1>Простой калькулятор</h1>
      {materials.length ? (
        <CalculatorClient materials={materials} />
      ) : (
        <p className="notice">Калькулятор станет доступен после подключения каталога.</p>
      )}
    </section>
  );
}
