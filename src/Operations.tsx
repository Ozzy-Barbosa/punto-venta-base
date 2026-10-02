import { useState } from "react";
import {
  Plus,
  Download,
  ReceiptText,
  RotateCcw,
  Eye,
  Check,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  LockKeyhole,
  X,
} from "lucide-react";
import { useWorkspace } from "./context";
import {
  refund,
  type Sale,
  createPurchase,
  receivePurchase,
  cents,
  activeSession,
  expectedCash,
  openCash,
  closeCash,
  cashMovement,
} from "./model";
import {
  PageHeading,
  Money,
  Modal,
  Field,
  formatDate,
  Empty,
  Stat,
  SectionTitle,
} from "./ui";
import { Receipt } from "./Pos";
import { csv, download } from "./storage";
export function Sales() {
  const { state: s, mutate } = useWorkspace();
  const [view, setView] = useState<Sale | null>(null),
    [returning, setReturning] = useState<Sale | null>(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const list = s.sales.filter(
    (x) =>
      `${x.number} ${x.customerName}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" || x.status === filter),
  );
  return (
    <>
      <PageHeading
        eyebrow="CADA OPERACIÓN, EN ORDEN"
        title="Ventas"
        description="Consulta tickets, revisa pagos y registra devoluciones con trazabilidad."
      >
        <button
          className="secondary"
          onClick={() =>
            download(
              "ventas.csv",
              csv([
                [
                  "Ticket",
                  "Fecha",
                  "Cliente",
                  "Método",
                  "Total",
                  "Estado",
                  "Devolución",
                ],
                ...list.map((x) => [
                  x.number,
                  x.at,
                  x.customerName,
                  x.method,
                  x.total / 100,
                  x.status,
                  x.refundAt || "",
                ]),
              ]),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={17} />
          Exportar ventas
        </button>
      </PageHeading>
      <section className="panel">
        <div className="panel-toolbar">
          <h2>Historial de ventas</h2>
          <div className="toolbar-controls">
            <input
              aria-label="Buscar venta"
              placeholder="Buscar ticket o cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Estado de venta"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Completadas</option>
              <option value="refunded">Devueltas</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Pago</th>
                <th>Estado</th>
                <th className="numeric">Total</th>
                <th className="numeric">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id}>
                  <td>
                    <b>#{x.number}</b>
                  </td>
                  <td>{formatDate(x.at)}</td>
                  <td>{x.customerName}</td>
                  <td>{x.method}</td>
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
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Ver ticket ${x.number}`}
                        onClick={() => setView(x)}
                      >
                        <Eye size={17} />
                      </button>
                      {x.status === "paid" ? (
                        <button
                          className="icon-button"
                          aria-label={`Devolver ticket ${x.number}`}
                          onClick={() => setReturning(x)}
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length ? <Empty /> : null}
        </div>
      </section>
      {view ? <Receipt sale={view} onClose={() => setView(null)} /> : null}
      {returning ? (
        <Modal
          title={`Devolver ticket #${returning.number}`}
          onClose={() => setReturning(null)}
        >
          <p className="info-box">
            Se devolverá la venta completa por{" "}
            <Money value={returning.total} state={s} />. Los productos
            regresarán al inventario; si se pagó en efectivo, se descontará de
            la caja abierta. Solo devuelve mercancía apta para reponer. El
            reembolso es simulado.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                mutate(
                  (next) => refund(next, returning.id, String(f.get("reason"))),
                  "Devolución registrada",
                )
              )
                setReturning(null);
            }}
          >
            <Field label="Motivo de devolución">
              <textarea name="reason" required maxLength={300} rows={3} />
            </Field>
            <div className="form-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => setReturning(null)}
              >
                Cancelar
              </button>
              <button className="danger-button">
                <RotateCcw size={16} />
                Confirmar devolución
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
export function Purchases() {
  const { state: s, mutate, notify } = useWorkspace();
  const [create, setCreate] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="UN NEGOCIO BIEN ABASTECIDO"
        title="Compras"
        description="Prepara pedidos a proveedores y recibe mercancía en tu inventario."
      >
        <button className="primary" onClick={() => setCreate(true)}>
          <Plus size={18} />
          Nueva compra
        </button>
      </PageHeading>
      <div className="info-box inline-info">
        Las órdenes son registros internos. No se envían al proveedor ni
        registran un pago en caja.
      </div>
      <section className="panel">
        <SectionTitle title="Órdenes de compra">
          <span className="subtle">
            {s.purchases.filter((x) => x.status === "pending").length}{" "}
            pendientes de recibir
          </span>
        </SectionTitle>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha / Proveedor</th>
                <th>Producto</th>
                <th>Unidades</th>
                <th className="numeric">Costo total</th>
                <th>Estado</th>
                <th className="numeric">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {s.purchases.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.supplierName}</b>
                    <small>{formatDate(p.at)}</small>
                  </td>
                  <td>{p.productName}</td>
                  <td>{p.quantity}</td>
                  <td className="numeric">
                    <Money value={p.cost * p.quantity} state={s} />
                  </td>
                  <td>
                    <span
                      className={`badge ${p.status === "received" ? "green" : p.status === "cancelled" ? "gray" : "amber-bg"}`}
                    >
                      {p.status === "received"
                        ? "Recibida"
                        : p.status === "pending"
                          ? "Pendiente"
                          : "Cancelada"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {p.status === "pending" ? (
                        <>
                          <button
                            className="secondary small-button"
                            onClick={() => {
                              if (
                                confirm(
                                  `¿Confirmar recepción de ${p.quantity} unidades de ${p.productName}?`,
                                )
                              )
                                mutate(
                                  (next) => receivePurchase(next, p.id),
                                  "Compra recibida e inventario actualizado",
                                );
                            }}
                          >
                            <Check size={15} />
                            Recibir
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={`Cancelar compra de ${p.productName}`}
                            onClick={() => {
                              if (confirm("¿Cancelar esta orden de compra?"))
                                mutate((next) => {
                                  next.purchases.find(
                                    (x) => x.id === p.id,
                                  )!.status = "cancelled";
                                }, "Compra cancelada");
                            }}
                          >
                            <X size={17} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!s.purchases.length ? (
            <Empty
              title="Tu próxima reposición empieza aquí"
              description="Crea una orden y recíbela cuando llegue la mercancía."
            />
          ) : null}
        </div>
      </section>
      {create ? (
        <Modal title="Nueva orden de compra" onClose={() => setCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const cost = cents(f.get("cost"));
                if (
                  mutate(
                    (next) =>
                      createPurchase(
                        next,
                        String(f.get("supplier")),
                        String(f.get("product")),
                        Number(f.get("quantity")),
                        cost,
                      ),
                    "Orden creada",
                  )
                )
                  setCreate(false);
              } catch (e) {
                notify((e as Error).message, true);
              }
            }}
          >
            <Field label="Proveedor">
              <select name="supplier" required defaultValue="">
                <option value="" disabled>
                  Selecciona un proveedor
                </option>
                {s.suppliers
                  .filter((x) => x.active)
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Producto">
              <select name="product" required defaultValue="">
                <option value="" disabled>
                  Selecciona un producto
                </option>
                {s.products
                  .filter((x) => x.active)
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Cantidad a recibir">
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                />
              </Field>
              <Field label="Costo unitario acordado">
                <input name="cost" type="number" min="0" step="0.01" required />
              </Field>
            </div>
            <p className="subtle">
              Cada orden contiene una referencia. Al recibirla, se actualiza el
              costo unitario del producto.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setCreate(false)}
              >
                Cancelar
              </button>
              <button className="primary">Crear orden</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
export function Cash() {
  const { state: s, mutate, notify } = useWorkspace();
  const session = activeSession(s);
  const [modal, setModal] = useState<"open" | "close" | "in" | "out" | null>(
    null,
  );
  return (
    <>
      <PageHeading
        eyebrow="CLARIDAD DE APERTURA A CIERRE"
        title="Caja"
        description="Controla el efectivo de tu turno y termina el día con cuentas claras."
      >
        {session ? (
          <button className="secondary" onClick={() => setModal("close")}>
            <LockKeyhole size={17} />
            Cerrar caja
          </button>
        ) : (
          <button className="primary" onClick={() => setModal("open")}>
            <Wallet size={17} />
            Abrir caja
          </button>
        )}
      </PageHeading>
      <div className="stats-grid three">
        <Stat
          label="Estado del turno"
          value={session ? "Caja abierta" : "Caja cerrada"}
          caption={
            session
              ? `Desde ${formatDate(session.openedAt)}`
              : "Abre un turno para registrar ventas"
          }
          icon={<Wallet size={18} />}
        />
        <Stat
          label="Fondo de apertura"
          value={<Money value={session?.opening || 0} state={s} />}
          caption="Efectivo al comenzar el turno"
          icon={<ArrowDownLeft size={18} />}
        />
        <Stat
          label="Efectivo esperado"
          value={
            <Money value={session ? expectedCash(session) : 0} state={s} />
          }
          caption="Fondo + entradas − salidas"
          icon={<ReceiptText size={18} />}
        />
      </div>
      <section className="panel">
        <SectionTitle title="Movimientos del turno">
          <div className="heading-actions">
            <button
              className="secondary small-button"
              disabled={!session}
              onClick={() => setModal("in")}
            >
              <Plus size={16} />
              Entrada
            </button>
            <button
              className="secondary small-button"
              disabled={!session}
              onClick={() => setModal("out")}
            >
              <ArrowUpRight size={16} />
              Salida
            </button>
          </div>
        </SectionTitle>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Referencia</th>
                <th className="numeric">Importe</th>
              </tr>
            </thead>
            <tbody>
              {session?.entries
                .slice()
                .reverse()
                .map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.at)}</td>
                    <td>
                      <b>{e.reason}</b>
                    </td>
                    <td>{e.reference}</td>
                    <td
                      className={`numeric ${e.amount > 0 ? "positive" : "negative"}`}
                    >
                      {e.amount > 0 ? "+" : ""}
                      <Money value={e.amount} state={s} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!session?.entries.length ? (
            <Empty
              title="Sin movimientos en este turno"
              description="Las ventas en efectivo, entradas y salidas aparecerán aquí."
            />
          ) : null}
        </div>
      </section>
      <section className="panel spaced">
        <SectionTitle title="Cierres anteriores" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Apertura</th>
                <th>Cierre</th>
                <th className="numeric">Esperado</th>
                <th className="numeric">Contado</th>
                <th className="numeric">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {s.sessions
                .filter((x) => x.closedAt)
                .map((x) => (
                  <tr key={x.id}>
                    <td>{formatDate(x.openedAt)}</td>
                    <td>{formatDate(x.closedAt!)}</td>
                    <td className="numeric">
                      <Money value={x.expected || 0} state={s} />
                    </td>
                    <td className="numeric">
                      <Money value={x.counted || 0} state={s} />
                    </td>
                    <td className="numeric">
                      <span
                        className={`badge ${x.counted === x.expected ? "green" : "amber-bg"}`}
                      >
                        <Money
                          value={(x.counted || 0) - (x.expected || 0)}
                          state={s}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      {modal ? (
        <Modal
          title={
            {
              open: "Abrir caja",
              close: "Cerrar y conciliar caja",
              in: "Entrada de efectivo",
              out: "Salida de efectivo",
            }[modal]
          }
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const amount = cents(f.get("amount"));
                if (
                  mutate((next) => {
                    if (modal === "open") openCash(next, amount);
                    else if (modal === "close") closeCash(next, amount);
                    else
                      cashMovement(
                        next,
                        modal === "out" ? -amount : amount,
                        String(f.get("reason")),
                      );
                  }, "Caja actualizada")
                )
                  setModal(null);
              } catch (e) {
                notify((e as Error).message, true);
              }
            }}
          >
            {modal === "close" ? (
              <p className="info-box">
                Efectivo esperado:{" "}
                <b>
                  <Money
                    value={session ? expectedCash(session) : 0}
                    state={s}
                  />
                </b>
                . Cuenta el efectivo físico e ingresa el total. La diferencia
                quedará registrada.
              </p>
            ) : null}
            <Field
              label={
                modal === "open"
                  ? "Fondo inicial"
                  : modal === "close"
                    ? "Efectivo contado"
                    : "Importe"
              }
            >
              <input
                name="amount"
                type="number"
                step="0.01"
                min={modal === "in" || modal === "out" ? "0.01" : "0"}
                required
              />
            </Field>
            {modal === "in" || modal === "out" ? (
              <Field label="Motivo">
                <input name="reason" required maxLength={200} />
              </Field>
            ) : null}
            <div className="form-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="primary">
                {modal === "close" ? "Confirmar cierre" : "Guardar movimiento"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
