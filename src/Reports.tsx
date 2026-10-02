import { useState } from "react";
import {
  Download,
  TrendingUp,
  Wallet,
  RotateCcw,
  ReceiptText,
} from "lucide-react";
import { useWorkspace } from "./context";
import { metrics } from "./model";
import {
  PageHeading,
  Stat,
  Money,
  SectionTitle,
  ProductArt,
  Empty,
} from "./ui";
import { csv, download } from "./storage";
const dayString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export default function Reports() {
  const { state: s } = useWorkspace();
  const today = new Date();
  const week = new Date();
  week.setDate(week.getDate() - 6);
  const [from, setFrom] = useState(dayString(week)),
    [to, setTo] = useState(dayString(today));
  const valid = !!from && !!to && from <= to;
  const m = metrics(
    s,
    valid ? new Date(from + "T00:00:00").toISOString() : "9999",
    valid ? new Date(to + "T23:59:59.999").toISOString() : "0000",
  );
  const ranked = s.products
    .map((p) => {
      const units = (xs: typeof s.sales) =>
        xs.reduce(
          (n, x) =>
            n +
            x.lines
              .filter((l) => l.productId === p.id)
              .reduce((n, l) => n + l.quantity, 0),
          0,
        );
      return { ...p, units: units(m.sales) - units(m.refunds) };
    })
    .filter((p) => p.units !== 0)
    .sort((a, b) => b.units - a.units);
  const methods = ["Efectivo", "Tarjeta", "Transferencia"].map((method) => ({
    method,
    amount:
      m.sales
        .filter((x) => x.method === method)
        .reduce((n, x) => n + x.total, 0) -
      m.refunds
        .filter((x) => x.method === method)
        .reduce((n, x) => n + x.total, 0),
  }));
  return (
    <>
      <PageHeading
        eyebrow="DECISIONES CON MÁS CLARIDAD"
        title="Reportes"
        description="Convierte los movimientos de tu negocio en información útil."
      >
        <button
          className="secondary"
          disabled={!valid}
          onClick={() =>
            download(
              `reporte-${from}-${to}.csv`,
              csv([
                ["Indicador", "Valor", "Moneda"],
                ["Ventas brutas", m.gross / 100, s.settings.currency],
                ["Devoluciones", m.returns / 100, s.settings.currency],
                ["Ventas netas", m.net / 100, s.settings.currency],
                ["Impuesto incluido neto", m.tax / 100, s.settings.currency],
                ["Margen estimado", m.margin / 100, s.settings.currency],
                ["Tickets", m.count, ""],
              ]),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={17} />
          Exportar reporte
        </button>
      </PageHeading>
      <div className="report-range">
        <FieldDate label="Desde" value={from} change={setFrom} />
        <span>—</span>
        <FieldDate label="Hasta" value={to} change={setTo} />
        <span className="subtle">
          Las devoluciones se contabilizan el día en que se registran.
        </span>
      </div>
      {!valid ? (
        <p className="error-text">
          Selecciona un rango válido: la fecha inicial debe ser anterior o igual
          a la final.
        </p>
      ) : null}
      <div className="stats-grid">
        <Stat
          label="Ventas netas"
          value={<Money value={m.net} state={s} />}
          caption={`${m.count} tickets en el periodo`}
          icon={<Wallet size={18} />}
        />
        <Stat
          label="Devoluciones"
          value={<Money value={m.returns} state={s} />}
          caption={`${m.refunds.length} operaciones revertidas`}
          icon={<RotateCcw size={18} />}
        />
        <Stat
          label="Margen estimado"
          value={<Money value={m.margin} state={s} />}
          caption="Venta neta sin impuesto menos costo"
          icon={<TrendingUp size={18} />}
        />
        <Stat
          label="Ticket promedio"
          value={
            <Money
              value={m.count ? Math.round(m.gross / m.count) : 0}
              state={s}
            />
          }
          caption="Venta bruta entre tickets"
          icon={<ReceiptText size={18} />}
        />
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <SectionTitle title="Productos por unidades netas" />
          {ranked.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th className="numeric">Unidades</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="product-cell">
                          <ProductArt product={p} small />
                          <b>{p.name}</b>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td className="numeric">
                        <b>{p.units}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Sin ventas en este periodo"
              description="Prueba con otro rango de fechas."
            />
          )}
        </section>
        <section className="panel">
          <SectionTitle title="Métodos de pago" />
          <div className="payment-report">
            {methods.map((x, i) => (
              <div key={x.method}>
                <div>
                  <span>
                    <i
                      style={{
                        background: ["var(--accent)", "#a2b6a0", "#dcc496"][i],
                      }}
                    />
                    {x.method}
                  </span>
                  <b>
                    <Money value={x.amount} state={s} />
                  </b>
                </div>
                <div className="progress-track">
                  <div
                    style={{
                      width: `${Math.max(0, (x.amount / Math.max(1, m.net)) * 100)}%`,
                      background: ["var(--accent)", "#a2b6a0", "#dcc496"][i],
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="report-callout">
              <ReceiptText size={22} />
              <div>
                <b>Una lectura de tu operación</b>
                <p>
                  El margen no descuenta gastos, comisiones ni impuestos sobre
                  utilidades. El costo se conserva al momento de cada venta.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
function FieldDate({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
}
