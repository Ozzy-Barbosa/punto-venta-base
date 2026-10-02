import { useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Pencil,
  Archive,
  ArrowDownUp,
  Download,
  Boxes,
  AlertTriangle,
  Package,
  RotateCcw,
} from "lucide-react";
import { useWorkspace } from "./context";
import {
  type Product,
  uid,
  saveProduct,
  removeProduct,
  adjustStock,
  cents,
} from "./model";
import {
  PageHeading,
  Stat,
  Money,
  ProductArt,
  Modal,
  Field,
  Empty,
  formatDate,
} from "./ui";
import { csv, download } from "./storage";
export default function Inventory() {
  const { state: s, mutate, notify } = useWorkspace();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [tab, setTab] = useState("products"),
    [editing, setEditing] = useState<Product | null | undefined>(),
    [adjust, setAdjust] = useState<Product | null>(null);
  const active = s.products.filter((p) => p.active);
  const list = s.products.filter(
    (p) =>
      (filter === "archived" ? !p.active : p.active) &&
      (filter !== "low" || p.stock <= p.minimum) &&
      `${p.name} ${p.sku} ${p.barcode}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      const p: Product = {
        id: editing?.id || uid(),
        name: String(d.get("name")).trim(),
        sku: String(d.get("sku")).trim(),
        barcode: String(d.get("barcode")).trim(),
        category: String(d.get("category")),
        price: cents(d.get("price")),
        cost: cents(d.get("cost")),
        stock: editing?.stock ?? Number(d.get("stock")),
        minimum: Number(d.get("minimum")),
        art: String(d.get("art")) as Product["art"],
        active: true,
      };
      if (mutate((next) => saveProduct(next, p), "Producto guardado"))
        setEditing(undefined);
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ORDEN DETRÁS DE CADA VENTA"
        title="Inventario"
        description="Tu catálogo, tus existencias y cada movimiento en un solo lugar."
      >
        <button
          className="secondary"
          onClick={() =>
            download(
              "inventario.csv",
              csv([
                [
                  "SKU",
                  "Nombre",
                  "Categoría",
                  "Precio",
                  "Costo",
                  "Existencias",
                  "Mínimo",
                ],
                ...list.map((p) => [
                  p.sku,
                  p.name,
                  p.category,
                  p.price / 100,
                  p.cost / 100,
                  p.stock,
                  p.minimum,
                ]),
              ]),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={17} />
          Exportar
        </button>
        <button className="primary" onClick={() => setEditing(null)}>
          <Plus size={18} />
          Nuevo producto
        </button>
      </PageHeading>
      <div className="stats-grid three">
        <Stat
          label="Productos activos"
          value={active.length}
          caption="Referencias en tu catálogo"
          icon={<Package size={18} />}
        />
        <Stat
          label="Valor del inventario"
          value={
            <Money
              state={s}
              value={active.reduce((n, p) => n + p.stock * p.cost, 0)}
            />
          }
          caption="Calculado al costo actual"
          icon={<Boxes size={18} />}
        />
        <Stat
          label="Necesitan atención"
          value={active.filter((p) => p.stock <= p.minimum).length}
          caption="En el mínimo o por debajo"
          icon={<AlertTriangle size={18} />}
        />
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <div className="tabs">
            <button
              className={tab === "products" ? "active" : ""}
              onClick={() => setTab("products")}
            >
              Productos
            </button>
            <button
              className={tab === "moves" ? "active" : ""}
              onClick={() => setTab("moves")}
            >
              Movimientos
            </button>
          </div>
          {tab === "products" ? (
            <div className="toolbar-controls">
              <div className="search-field compact">
                <Search size={17} />
                <input
                  aria-label="Buscar en inventario"
                  placeholder="Buscar producto o SKU"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select
                aria-label="Filtrar inventario"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Todos los activos</option>
                <option value="low">Stock bajo</option>
                <option value="archived">Archivados</option>
              </select>
            </div>
          ) : (
            <span className="subtle">Registro de entradas y salidas</span>
          )}
        </div>
        {tab === "products" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="numeric">Precio / Costo</th>
                  <th>Existencias</th>
                  <th>Estado</th>
                  <th className="numeric">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        <ProductArt product={p} small />
                        <div>
                          <b>{p.name}</b>
                          <small>{p.sku}</small>
                        </div>
                      </div>
                    </td>
                    <td>{p.category}</td>
                    <td className="numeric">
                      <b>
                        <Money value={p.price} state={s} />
                      </b>
                      <small>
                        <Money value={p.cost} state={s} />
                      </small>
                    </td>
                    <td>
                      <b>{p.stock}</b>
                      <span className="subtle"> / mín. {p.minimum}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${!p.active ? "gray" : p.stock === 0 ? "red" : p.stock <= p.minimum ? "amber-bg" : "green"}`}
                      >
                        {!p.active
                          ? "Archivado"
                          : p.stock === 0
                            ? "Agotado"
                            : p.stock <= p.minimum
                              ? "Stock bajo"
                              : "Disponible"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {p.active ? (
                          <>
                            <button
                              className="icon-button"
                              aria-label={`Editar ${p.name}`}
                              onClick={() => setEditing(p)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`Ajustar ${p.name}`}
                              onClick={() => setAdjust(p)}
                            >
                              <ArrowDownUp size={16} />
                            </button>
                            <button
                              className="icon-button danger"
                              aria-label={`Archivar ${p.name}`}
                              onClick={() => {
                                if (
                                  confirm(
                                    `¿Archivar ${p.name}? Se conservará su historial.`,
                                  )
                                )
                                  mutate(
                                    (next) => removeProduct(next, p.id),
                                    "Producto archivado",
                                  );
                              }}
                            >
                              <Archive size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            className="secondary"
                            onClick={() =>
                              mutate((next) => {
                                next.products.find(
                                  (x) => x.id === p.id,
                                )!.active = true;
                              }, "Producto restaurado")
                            }
                          >
                            <RotateCcw size={15} />
                            Restaurar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length ? <Empty /> : null}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Motivo</th>
                  <th>Referencia</th>
                  <th className="numeric">Unidades</th>
                </tr>
              </thead>
              <tbody>
                {s.movements.slice(0, 150).map((m) => (
                  <tr key={m.id}>
                    <td>{formatDate(m.at)}</td>
                    <td>
                      <b>
                        {s.products.find((p) => p.id === m.productId)?.name}
                      </b>
                    </td>
                    <td>{m.reason}</td>
                    <td className="subtle">
                      {m.reference.length > 20 ? "Compra" : m.reference}
                    </td>
                    <td
                      className={`numeric ${m.delta > 0 ? "positive" : "negative"}`}
                    >
                      {m.delta > 0 ? "+" : ""}
                      {m.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="table-note">
              Se muestran los 150 movimientos más recientes. El respaldo incluye
              el historial completo.
            </p>
          </div>
        )}
      </section>
      {editing !== undefined ? (
        <Modal
          title={editing ? "Editar producto" : "Nuevo producto"}
          onClose={() => setEditing(undefined)}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <Field label="Nombre del producto" full>
                <input
                  name="name"
                  defaultValue={editing?.name}
                  required
                  maxLength={100}
                />
              </Field>
              <Field label="SKU único">
                <input
                  name="sku"
                  defaultValue={editing?.sku}
                  required
                  maxLength={40}
                />
              </Field>
              <Field label="Código de barras">
                <input
                  name="barcode"
                  defaultValue={editing?.barcode}
                  maxLength={80}
                />
              </Field>
              <Field label="Categoría">
                <select name="category" defaultValue={editing?.category}>
                  {s.categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ilustración">
                <select name="art" defaultValue={editing?.art || "bag"}>
                  {Object.entries({
                    coffee: "Café",
                    jar: "Frasco",
                    bottle: "Botella",
                    bread: "Pan",
                    bag: "Bolsa",
                    cup: "Taza",
                    box: "Caja",
                    plant: "Planta",
                  }).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Precio final (impuesto incluido)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="price"
                  required
                  defaultValue={editing ? editing.price / 100 : undefined}
                />
              </Field>
              <Field label="Costo unitario">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="cost"
                  required
                  defaultValue={editing ? editing.cost / 100 : undefined}
                />
              </Field>
              {!editing ? (
                <Field label="Existencias iniciales">
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    step="1"
                    defaultValue="0"
                    required
                  />
                </Field>
              ) : null}
              <Field label="Mínimo de existencias">
                <input
                  type="number"
                  name="minimum"
                  min="0"
                  step="1"
                  defaultValue={editing?.minimum ?? 5}
                  required
                />
              </Field>
            </div>
            {editing ? (
              <p className="info-box">
                Cambia las existencias con «Ajustar» para conservar el motivo y
                el historial.
              </p>
            ) : null}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </button>
              <button className="primary" type="submit">
                Guardar producto
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {adjust ? (
        <Modal title="Ajustar existencias" onClose={() => setAdjust(null)}>
          <p>
            {adjust.name} · <b>{adjust.stock} unidades actuales</b>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                mutate(
                  (next) =>
                    adjustStock(
                      next,
                      adjust.id,
                      Number(f.get("delta")),
                      String(f.get("reason")),
                    ),
                  "Inventario actualizado",
                )
              )
                setAdjust(null);
            }}
          >
            <Field label="Unidades a agregar (+) o retirar (−)">
              <input
                name="delta"
                type="number"
                step="1"
                required
                placeholder="Ejemplo: 10 o -2"
              />
            </Field>
            <Field label="Motivo del ajuste">
              <input
                name="reason"
                required
                maxLength={200}
                placeholder="Recepción, merma, conteo físico…"
              />
            </Field>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAdjust(null)}
              >
                Cancelar
              </button>
              <button className="primary">Registrar ajuste</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
