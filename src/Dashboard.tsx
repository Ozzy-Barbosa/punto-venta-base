import {
  ArrowUpRight,
  ShoppingBag,
  Wallet,
  ReceiptText,
  Package,
  Plus,
  ArrowRight,
  Sun,
  TrendingUp,
} from "lucide-react";
import { useWorkspace } from "./context";
import { metrics } from "./model";
import {
  PageHeading,
  Stat,
  Money,
  SectionTitle,
  TextLink,
  ProductArt,
  formatDate,
  Empty,
} from "./ui";
export default function Dashboard() {
  const { state: s, navigate } = useWorkspace();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const m = metrics(s, start.toISOString(), end.toISOString());
  const low = s.products.filter((p) => p.active && p.stock <= p.minimum);
  const days = Array.from({ length: 7 }, (_, i) => {
    const a = new Date(start);
    a.setDate(a.getDate() - 6 + i);
    const b = new Date(a);
    b.setHours(23, 59, 59, 999);
    return {
      label: a
        .toLocaleDateString("es-MX", { weekday: "short" })
        .replace(".", ""),
      ...metrics(s, a.toISOString(), b.toISOString()),
    };
  });
  const max = Math.max(100, ...days.map((d) => d.net));
  const min = Math.min(0, ...days.map((d) => d.net));
  const range = max - min;
  const top = s.products
    .map((p) => ({
      ...p,
      sold: s.sales
        .filter((x) => x.status === "paid")
        .reduce(
          (n, x) =>
            n +
            x.lines
              .filter((l) => l.productId === p.id)
              .reduce((n, l) => n + l.quantity, 0),
          0,
        ),
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 4);
  return (
    <>
      <PageHeading
        eyebrow="TU NEGOCIO, EN UN VISTAZO"
        title="Todo listo para un buen día."
        description="Cada venta cuenta. Aquí tienes el pulso de tu negocio."
      >
        <span className="date-chip">
          <Sun size={16} />
          {start.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
        </span>
        <button className="primary" onClick={() => navigate("pos")}>
          <Plus size={18} />
          Nueva venta
        </button>
      </PageHeading>
      <div className="stats-grid">
        <Stat
          label="Ventas de hoy"
          value={<Money value={m.net} state={s} />}
          caption={
            <>
              <span className="live-dot" /> Ventas menos devoluciones
            </>
          }
          icon={<Wallet size={18} />}
        />
        <Stat
          label="Tickets registrados"
          value={m.count.toString().padStart(2, "0")}
          caption="Operaciones de hoy"
          icon={<ReceiptText size={18} />}
        />
        <Stat
          label="Ticket promedio"
          value={
            <Money
              value={m.count ? Math.round(m.gross / m.count) : 0}
              state={s}
            />
          }
          caption="Antes de devoluciones"
          icon={<TrendingUp size={18} />}
        />
        <Stat
          label="Productos por reponer"
          value={low.length.toString().padStart(2, "0")}
          caption={
            <button
              className="text-link amber"
              onClick={() => navigate("inventory")}
            >
              Revisar inventario <ArrowUpRight size={14} />
            </button>
          }
          icon={<Package size={18} />}
        />
      </div>
      <div className="dashboard-main">
        <section className="panel sales-chart">
          <SectionTitle title="Así van tus ventas">
            <span className="subtle-chip">Últimos 7 días</span>
          </SectionTitle>
          <div className="chart-summary">
            <strong>
              <Money value={days.reduce((n, d) => n + d.net, 0)} state={s} />
            </strong>
            <span>ventas netas del periodo</span>
          </div>
          <div
            className="chart"
            role="img"
            aria-label={days
              .map((d) => `${d.label}: ${d.net / 100}`)
              .join(", ")}
          >
            <div className="chart-grid">
              <span>{Math.ceil(max / 100)}</span>
              <span>{Math.round((max + min) / 200)}</span>
              <span>{Math.floor(min / 100)}</span>
            </div>
            <div className="bars">
              {days.map((d, i) => (
                <div className="bar-group" key={i}>
                  <div
                    className={`bar ${i === 6 ? "today" : ""}`}
                    style={{
                      height: `${(Math.abs(d.net) / range) * 100}%`,
                      minHeight: d.net === 0 ? 0 : 3,
                      position: "absolute",
                      bottom: `${((Math.min(0, d.net) - min) / range) * 100}%`,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: d.net < 0 ? "#b36e5e" : undefined,
                    }}
                    title={`${d.label}: ${d.net / 100}`}
                  >
                    <span>
                      <Money value={d.net} state={s} />
                    </span>
                  </div>
                  <small>{d.label}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-foot">
            <span>
              <i />
              Ventas netas · {s.settings.currency}
            </span>
            <TextLink onClick={() => navigate("reports")}>
              Ver reportes
            </TextLink>
          </div>
        </section>
        <section className="welcome-card">
          <div className="welcome-orb">
            <ShoppingBag size={48} strokeWidth={1} />
            <span>local se vive mejor</span>
          </div>
          <span className="eyebrow">HECHO PARA TU DÍA A DÍA</span>
          <h2>
            Menos pendientes.
            <br />
            Más posibilidades.
          </h2>
          <p>
            Un solo lugar para vender, organizar tu inventario y cuidar de tus
            clientes.
          </p>
          <button onClick={() => navigate("pos")}>
            Ir al punto de venta <ArrowRight size={17} />
          </button>
          <div className="welcome-tag">BRISA / NEGOCIO FICTICIO</div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <SectionTitle title="Actividad reciente">
            <TextLink onClick={() => navigate("sales")}>
              Todas las ventas
            </TextLink>
          </SectionTitle>
          {s.sales.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket / Cliente</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th className="numeric">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {s.sales.slice(0, 5).map((x) => (
                    <tr key={x.id}>
                      <td>
                        <b>#{x.number}</b>
                        <small>{x.customerName}</small>
                      </td>
                      <td>{formatDate(x.at)}</td>
                      <td>
                        <span
                          className={`badge ${x.status === "paid" ? "green" : "gray"}`}
                        >
                          {x.status === "paid" ? "Completada" : "Devuelta"}
                        </span>
                      </td>
                      <td className="numeric">
                        <b>
                          <Money value={x.total} state={s} />
                        </b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </section>
        <section className="panel">
          <SectionTitle title="Los favoritos">
            <span className="subtle">Histórico neto</span>
          </SectionTitle>
          <div className="top-products">
            {top.map((p, i) => (
              <div className="top-product" key={p.id}>
                <span className="rank">0{i + 1}</span>
                <ProductArt product={p} small />
                <div>
                  <b>{p.name}</b>
                  <small>{p.category}</small>
                </div>
                <strong>
                  {p.sold}
                  <small>vendidos</small>
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
