import { useState, useRef } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Pause,
  ScanBarcode,
  ArrowRight,
  UserRound,
  Check,
  Printer,
  Banknote,
  CreditCard,
  ArrowLeftRight,
} from "lucide-react";
import { useWorkspace } from "./context";
import {
  type CartLine,
  type Payment,
  type Sale,
  checkout,
  totals,
  uid,
  cents,
  activeSession,
} from "./model";
import {
  ProductArt,
  Money,
  Modal,
  Field,
  formatMoney,
  formatDate,
  Empty,
} from "./ui";
const DRAFT_KEY = "brisa-cart-v1";
export function Receipt({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
  return (
    <Modal title="Detalle del ticket" onClose={onClose}>
      <div className="receipt">
        <div className="receipt-check">
          <Check />
        </div>
        <h2>{sale.business}</h2>
        <p>{sale.branch}</p>
        <span className="badge green">
          {sale.status === "paid" ? "Venta registrada" : "Venta devuelta"}
        </span>
        <div className="receipt-meta">
          <b>Ticket #{sale.number}</b>
          <span>{formatDate(sale.at)}</span>
          <span>{sale.customerName}</span>
        </div>
        {sale.lines.map((l) => (
          <div className="receipt-line" key={l.productId}>
            <span>
              {l.quantity} × {l.name}
            </span>
            <b>{formatMoney(l.quantity * l.price, sale.currency)}</b>
          </div>
        ))}
        <hr />
        <div className="receipt-line">
          <span>Subtotal</span>
          <span>{formatMoney(sale.subtotal, sale.currency)}</span>
        </div>
        <div className="receipt-line">
          <span>Descuento</span>
          <span>−{formatMoney(sale.discount, sale.currency)}</span>
        </div>
        <div className="receipt-line">
          <span>Impuesto incluido ({sale.taxRate}%)</span>
          <span>{formatMoney(sale.tax, sale.currency)}</span>
        </div>
        <div className="receipt-line receipt-total">
          <span>Total</span>
          <b>{formatMoney(sale.total, sale.currency)}</b>
        </div>
        <div className="receipt-line">
          <span>{sale.method} · Recibido</span>
          <span>{formatMoney(sale.received, sale.currency)}</span>
        </div>
        <div className="receipt-line">
          <span>Cambio</span>
          <span>{formatMoney(sale.change, sale.currency)}</span>
        </div>
        {sale.refundAt ? (
          <p>
            Devuelta: {formatDate(sale.refundAt)}
            <br />
            {sale.refundReason}
          </p>
        ) : null}
        <p>{sale.footer}</p>
        <small>
          Demostración · Sin validez fiscal
          <br />
          No se procesó ningún pago real.
        </small>
      </div>
      <div className="form-actions no-print">
        <button className="secondary" onClick={() => window.print()}>
          <Printer size={17} />
          Imprimir ticket
        </button>
        <button className="primary" onClick={onClose}>
          Listo
        </button>
      </div>
    </Modal>
  );
}
export default function Pos() {
  const { state: s, mutate, notify, navigate } = useWorkspace();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("Todos"),
    [cart, setCart] = useState<CartLine[]>([]),
    [discount, setDiscount] = useState(0),
    [customer, setCustomer] = useState(""),
    [pay, setPay] = useState(false),
    [method, setMethod] = useState<Payment>("Efectivo"),
    [received, setReceived] = useState(""),
    [receipt, setReceipt] = useState<Sale | null>(null),
    [hasDraft, setHasDraft] = useState(() => !!localStorage.getItem(DRAFT_KEY));
  const request = useRef(uid()),
    busy = useRef(false);
  const products = s.products.filter(
    (p) =>
      p.active &&
      (category === "Todos" || category === p.category) &&
      `${p.name} ${p.sku} ${p.barcode}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  let total = 0,
    tax = 0,
    subtotal = 0,
    discountValue = 0,
    error = "";
  try {
    const t = totals(s, cart, discount);
    total = t.total;
    tax = t.tax;
    subtotal = t.subtotal;
    discountValue = t.discount;
  } catch (e) {
    error = (e as Error).message;
  }
  function add(id: string) {
    const p = s.products.find((x) => x.id === id)!;
    const line = cart.find((x) => x.productId === id);
    if ((line?.quantity || 0) >= p.stock) {
      notify("No quedan más unidades disponibles.", true);
      return;
    }
    setCart((prev) =>
      line
        ? prev.map((x) =>
            x.productId === id ? { ...x, quantity: x.quantity + 1 } : x,
          )
        : [...prev, { productId: id, quantity: 1 }],
    );
  }
  function hold() {
    if (!cart.length) return;
    if (hasDraft && !confirm("Ya hay un carrito guardado. ¿Reemplazarlo?"))
      return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ cart, discount, customer }),
      );
      setHasDraft(true);
      setCart([]);
      setDiscount(0);
      setCustomer("");
      notify("Venta guardada para continuar después.");
    } catch {
      notify("No se pudo guardar el carrito.", true);
    }
  }
  function resume() {
    if (
      cart.length &&
      !confirm("¿Reemplazar el carrito actual por el guardado?")
    )
      return;
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (!d || !Array.isArray(d.cart)) throw Error();
      totals(s, d.cart, d.discount);
      setCart(d.cart);
      setDiscount(d.discount);
      setCustomer(
        s.customers.some((c) => c.id === d.customer && c.active)
          ? d.customer
          : "",
      );
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      notify("Venta recuperada.");
    } catch {
      notify(
        "El carrito guardado no es válido o cambió el inventario. Se eliminó el borrador.",
        true,
      );
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    }
  }
  function complete() {
    if (busy.current) return;
    busy.current = true;
    let sale: Sale | undefined;
    try {
      const amount = method === "Efectivo" ? cents(received) : total;
      const ok = mutate((next) => {
        sale = checkout(
          next,
          cart,
          discount,
          method,
          amount,
          customer,
          request.current,
        );
      }, "Venta registrada");
      if (ok && sale) {
        setReceipt(sale);
        setPay(false);
        setCart([]);
        setDiscount(0);
        setCustomer("");
        setReceived("");
        request.current = uid();
      }
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      busy.current = false;
    }
  }
  return (
    <>
      <div className="pos-heading">
        <div>
          <div className="eyebrow">CADA VENTA, UNA NUEVA HISTORIA</div>
          <h1>Punto de venta</h1>
        </div>
        <div className="heading-actions">
          {hasDraft ? (
            <button className="secondary" onClick={resume}>
              <Pause size={16} />
              Recuperar venta
            </button>
          ) : null}
          <span className={`badge ${activeSession(s) ? "green" : "amber-bg"}`}>
            <span className="live-dot" />
            {activeSession(s) ? "Caja abierta" : "Caja cerrada"}
          </span>
        </div>
      </div>
      <div className="pos-layout">
        <section className="catalog">
          <div className="search-field">
            <Search size={19} />
            <input
              aria-label="Buscar producto"
              placeholder="Buscar producto, SKU o escanear código…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const p = s.products.find(
                    (p) =>
                      p.active &&
                      (p.sku.toLowerCase() === search.toLowerCase() ||
                        p.barcode === search),
                  );
                  if (p) {
                    add(p.id);
                    setSearch("");
                  }
                }
              }}
            />
            <ScanBarcode size={20} />
          </div>
          <div className="category-tabs">
            {["Todos", ...s.categories].map((c) => (
              <button
                className={category === c ? "active" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="catalog-label">
            <span>{products.length} productos</span>
            <span>Precios con impuesto incluido</span>
          </div>
          <div className="product-grid">
            {products.map((p) => (
              <button
                className="product-card"
                key={p.id}
                onClick={() => add(p.id)}
                disabled={p.stock === 0}
                aria-label={`Agregar ${p.name}`}
              >
                <ProductArt product={p} />
                <span
                  className={`stock-label ${p.stock <= p.minimum ? "low" : ""}`}
                >
                  {p.stock ? `${p.stock} disponibles` : "Agotado"}
                </span>
                <div className="product-info">
                  <small>{p.category}</small>
                  <h3>{p.name}</h3>
                  <div>
                    <strong>
                      <Money value={p.price} state={s} />
                    </strong>
                    <span className="product-plus">
                      <Plus size={17} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {!products.length ? (
            <Empty
              title="No encontramos ese producto"
              description="Prueba otro nombre, código o categoría."
            />
          ) : null}
        </section>
        <aside className="cart-panel">
          <div className="cart-title">
            <h2>
              Venta actual{" "}
              <span>{cart.reduce((n, x) => n + x.quantity, 0)}</span>
            </h2>
            <button
              className="icon-button"
              aria-label="Vaciar carrito"
              disabled={!cart.length}
              onClick={() => {
                if (confirm("¿Vaciar esta venta?")) {
                  setCart([]);
                  setDiscount(0);
                }
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
          <label className="customer-select">
            <UserRound size={18} />
            <select
              aria-label="Cliente de la venta"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            >
              <option value="">Público general</option>
              {s.customers
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="cart-items">
            {cart.length ? (
              cart.map((l) => {
                const p = s.products.find((p) => p.id === l.productId)!;
                return (
                  <div className="cart-item" key={p.id}>
                    <ProductArt product={p} small />
                    <div className="cart-detail">
                      <b>{p.name}</b>
                      <span>
                        <Money value={p.price} state={s} />
                      </span>
                      <div className="quantity">
                        <button
                          aria-label={`Restar ${p.name}`}
                          onClick={() =>
                            setCart((prev) =>
                              prev
                                .map((x) =>
                                  x.productId === p.id
                                    ? { ...x, quantity: x.quantity - 1 }
                                    : x,
                                )
                                .filter((x) => x.quantity > 0),
                            )
                          }
                        >
                          <Minus size={13} />
                        </button>
                        <span>{l.quantity}</span>
                        <button
                          aria-label={`Sumar ${p.name}`}
                          onClick={() => add(p.id)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <strong>
                      <Money value={p.price * l.quantity} state={s} />
                    </strong>
                  </div>
                );
              })
            ) : (
              <div className="empty-cart">
                <div>
                  <ShoppingBag size={36} strokeWidth={1.3} />
                </div>
                <h3>Una nueva venta empieza aquí</h3>
                <p>
                  Selecciona productos del catálogo
                  <br />
                  para agregarlos al ticket.
                </p>
              </div>
            )}
          </div>
          <div className="cart-bottom">
            <div className="cart-row">
              <span>Subtotal</span>
              <b>
                <Money value={subtotal} state={s} />
              </b>
            </div>
            <div className="cart-row">
              <label htmlFor="discount">
                Descuento{" "}
                <input
                  id="discount"
                  aria-label="Descuento porcentual"
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />{" "}
                %
              </label>
              <b>
                −<Money value={discountValue} state={s} />
              </b>
            </div>
            <div className="cart-row subtle">
              <span>Impuesto incluido ({s.settings.taxRate}%)</span>
              <span>
                <Money value={tax} state={s} />
              </span>
            </div>
            <div className="cart-total">
              <span>Total</span>
              <strong>
                <Money value={total} state={s} />
                <small>{s.settings.currency}</small>
              </strong>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            {!activeSession(s) ? (
              <button
                className="primary full-button"
                onClick={() => navigate("cash")}
              >
                Abrir caja para vender <ArrowRight size={18} />
              </button>
            ) : (
              <button
                className="primary full-button"
                disabled={!cart.length || !!error}
                onClick={() => {
                  setPay(true);
                  setReceived("");
                }}
              >
                Cobrar <Money value={total} state={s} />
                <ArrowRight size={18} />
              </button>
            )}
            <button
              className="hold-button"
              disabled={!cart.length}
              onClick={hold}
            >
              <Pause size={15} />
              Guardar para después
            </button>
          </div>
        </aside>
      </div>
      {pay ? (
        <Modal title="Completar venta" onClose={() => setPay(false)}>
          <p className="modal-description">
            Selecciona cómo se pagó esta venta. Los cobros son simulados.
          </p>
          <div className="payment-total">
            <small>Total a cobrar</small>
            <strong>
              <Money value={total} state={s} />
            </strong>
          </div>
          <div className="payment-methods">
            {(["Efectivo", "Tarjeta", "Transferencia"] as Payment[]).map(
              (m, i) => (
                <button
                  key={m}
                  className={method === m ? "selected" : ""}
                  onClick={() => setMethod(m)}
                >
                  {i === 0 ? (
                    <Banknote />
                  ) : i === 1 ? (
                    <CreditCard />
                  ) : (
                    <ArrowLeftRight />
                  )}
                  {m}
                </button>
              ),
            )}
          </div>
          {method === "Efectivo" ? (
            <>
              <Field label="Efectivo recibido">
                <input
                  autoFocus
                  type="number"
                  min={total / 100}
                  step="0.01"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <div className="quick-cash">
                {[
                  total,
                  ...[10000, 20000, 50000, 100000].filter((n) => n > total),
                ]
                  .slice(0, 4)
                  .map((n) => (
                    <button
                      key={n}
                      className="secondary"
                      onClick={() => setReceived(String(n / 100))}
                    >
                      {n === total
                        ? "Exacto"
                        : formatMoney(n, s.settings.currency)}
                    </button>
                  ))}
              </div>
              <div className="change-row">
                Cambio{" "}
                <b>
                  <Money
                    value={Math.max(
                      0,
                      Math.round(Number(received) * 100) - total,
                    )}
                    state={s}
                  />
                </b>
              </div>
            </>
          ) : (
            <p className="info-box">
              Este prototipo solo registra el método elegido. No solicita datos
              bancarios ni carga una tarjeta.
            </p>
          )}
          <div className="form-actions">
            <button className="secondary" onClick={() => setPay(false)}>
              Volver
            </button>
            <button
              className="primary"
              disabled={
                method === "Efectivo" &&
                (!received || Math.round(Number(received) * 100) < total)
              }
              onClick={complete}
            >
              <Check size={17} />
              Confirmar venta
            </button>
          </div>
        </Modal>
      ) : null}
      {receipt ? (
        <Receipt sale={receipt} onClose={() => setReceipt(null)} />
      ) : null}
    </>
  );
}
