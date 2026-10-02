import { z } from "zod";

const id = z.string().min(1).max(120);
const text = z.string().max(500);
const money = z.number().int().min(0).max(100_000_000);
const qty = z.number().int().min(0).max(1_000_000);
const date = z.string().datetime();
export const productSchema = z.object({
  id,
  name: text.min(1),
  sku: text.min(1),
  barcode: text,
  category: text.min(1),
  price: money,
  cost: money,
  stock: qty,
  minimum: qty,
  art: z.enum([
    "coffee",
    "jar",
    "bottle",
    "bread",
    "bag",
    "cup",
    "box",
    "plant",
  ]),
  active: z.boolean(),
});
const contactSchema = z.object({
  id,
  name: text.min(1),
  email: z.union([z.literal(""), z.string().email().max(254)]),
  phone: text,
  note: text,
  active: z.boolean(),
});
const lineSchema = z.object({
  productId: id,
  name: text,
  sku: text,
  quantity: qty.min(1),
  price: money,
  cost: money,
});
const saleSchema = z.object({
  id,
  number: qty,
  at: date,
  customerId: text,
  customerName: text,
  lines: z.array(lineSchema).min(1),
  subtotal: money,
  discount: money,
  tax: money,
  total: money,
  taxRate: z.number().min(0).max(100),
  method: z.enum(["Efectivo", "Tarjeta", "Transferencia"]),
  received: money,
  change: money,
  sessionId: id,
  status: z.enum(["paid", "refunded"]),
  refundAt: date.optional(),
  refundReason: text.optional(),
  business: text,
  branch: text,
  currency: z.enum(["MXN", "USD", "EUR"]),
  footer: text,
});
const movementSchema = z.object({
  id,
  at: date,
  productId: id,
  delta: z.number().int(),
  reason: text,
  reference: text,
});
const cashEntrySchema = z.object({
  id,
  at: date,
  amount: z.number().int(),
  reason: text,
  reference: text,
});
const sessionSchema = z.object({
  id,
  openedAt: date,
  closedAt: date.optional(),
  opening: money,
  counted: money.optional(),
  expected: z.number().int().optional(),
  entries: z.array(cashEntrySchema),
});
const purchaseSchema = z.object({
  id,
  at: date,
  supplierId: id,
  supplierName: text,
  productId: id,
  productName: text,
  quantity: qty.min(1),
  cost: money,
  status: z.enum(["pending", "received", "cancelled"]),
  receivedAt: date.optional(),
});
export const stateSchema = z.object({
  version: z.literal(1),
  revision: qty,
  settings: z.object({
    name: text.min(1),
    tagline: text,
    branch: text.min(1),
    currency: z.enum(["MXN", "USD", "EUR"]),
    taxRate: z.number().min(0).max(100),
    accent: z.enum(["forest", "ocean", "plum"]),
    footer: text,
  }),
  categories: z.array(text.min(1)).min(1),
  products: z.array(productSchema),
  customers: z.array(contactSchema),
  suppliers: z.array(contactSchema),
  sales: z.array(saleSchema),
  movements: z.array(movementSchema),
  sessions: z.array(sessionSchema),
  purchases: z.array(purchaseSchema),
});
export type State = z.infer<typeof stateSchema>;
export type Product = z.infer<typeof productSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Sale = z.infer<typeof saleSchema>;
export type CartLine = { productId: string; quantity: number };
export type Payment = Sale["method"];
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function cents(value: FormDataEntryValue | null | string | number) {
  const n = Number(value);
  check(
    Number.isFinite(n) && n >= 0 && n <= 1_000_000,
    "Introduce un importe válido.",
  );
  return Math.round(n * 100);
}
export const activeSession = (s: State) => s.sessions.find((x) => !x.closedAt);
export const expectedCash = (
  s: NonNullable<ReturnType<typeof activeSession>>,
) => s.opening + s.entries.reduce((n, x) => n + x.amount, 0);
export function totals(s: State, cart: CartLine[], discountPercent: number) {
  check(
    Number.isFinite(discountPercent) &&
      discountPercent >= 0 &&
      discountPercent <= 100,
    "El descuento debe estar entre 0 y 100%.",
  );
  const lines = cart.map((l) => {
    const p = s.products.find((p) => p.id === l.productId);
    check(p?.active, "Un producto ya no está disponible.");
    check(
      Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= p.stock,
      `Existencias insuficientes de ${p.name}.`,
    );
    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: l.quantity,
      price: p.price,
      cost: p.cost,
    };
  });
  check(
    new Set(cart.map((l) => l.productId)).size === cart.length,
    "Hay productos duplicados en el carrito.",
  );
  const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const discount = Math.round((subtotal * discountPercent) / 100),
    total = subtotal - discount;
  return {
    lines,
    subtotal,
    discount,
    total,
    tax: total - Math.round(total / (1 + s.settings.taxRate / 100)),
  };
}
function move(
  s: State,
  p: Product,
  delta: number,
  reason: string,
  reference: string,
  at = now(),
) {
  p.stock += delta;
  check(p.stock >= 0, "No puedes dejar existencias negativas.");
  s.movements.unshift({
    id: uid(),
    at,
    productId: p.id,
    delta,
    reason,
    reference,
  });
}
export function checkout(
  s: State,
  cart: CartLine[],
  discount: number,
  method: Payment,
  received: number,
  customerId = "",
  requestId: string = uid(),
): Sale {
  check(
    !s.sales.some((x) => x.id === requestId),
    "Esta venta ya fue registrada.",
  );
  const session = activeSession(s);
  check(session, "Abre la caja antes de cobrar.");
  check(cart.length, "Agrega al menos un producto.");
  const calculation = totals(s, cart, discount);
  check(
    method !== "Efectivo" ||
      (Number.isSafeInteger(received) && received >= calculation.total),
    "El efectivo recibido es insuficiente.",
  );
  const customer = s.customers.find((c) => c.id === customerId && c.active);
  check(!customerId || customer, "Selecciona un cliente activo.");
  const sale: Sale = {
    id: requestId,
    number: Math.max(1000, ...s.sales.map((x) => x.number)) + 1,
    at: now(),
    customerId,
    customerName: customer?.name || "Público general",
    ...calculation,
    taxRate: s.settings.taxRate,
    method,
    received: method === "Efectivo" ? received : calculation.total,
    change: method === "Efectivo" ? received - calculation.total : 0,
    sessionId: session.id,
    status: "paid",
    business: s.settings.name,
    branch: s.settings.branch,
    currency: s.settings.currency,
    footer: s.settings.footer,
  };
  calculation.lines.forEach((l) =>
    move(
      s,
      s.products.find((p) => p.id === l.productId)!,
      -l.quantity,
      "Venta",
      `#${sale.number}`,
      sale.at,
    ),
  );
  if (method === "Efectivo")
    session.entries.push({
      id: uid(),
      at: sale.at,
      amount: sale.total,
      reason: "Venta en efectivo",
      reference: `#${sale.number}`,
    });
  s.sales.unshift(sale);
  return sale;
}
export function refund(s: State, saleId: string, reason: string) {
  const sale = s.sales.find((x) => x.id === saleId);
  check(
    sale && sale.status === "paid",
    "La venta ya fue devuelta o no existe.",
  );
  check(reason.trim(), "Escribe el motivo de devolución.");
  const session = activeSession(s);
  check(session, "Abre la caja para registrar la devolución.");
  if (sale.method === "Efectivo")
    check(
      expectedCash(session) >= sale.total,
      "No hay suficiente efectivo en caja para devolver esta venta.",
    );
  sale.lines.forEach((l) =>
    check(
      s.products.some((p) => p.id === l.productId),
      "Falta un producto de la venta.",
    ),
  );
  sale.status = "refunded";
  sale.refundAt = now();
  sale.refundReason = reason.trim();
  sale.lines.forEach((l) =>
    move(
      s,
      s.products.find((p) => p.id === l.productId)!,
      l.quantity,
      "Devolución",
      `#${sale.number}`,
      sale.refundAt,
    ),
  );
  if (sale.method === "Efectivo")
    session.entries.push({
      id: uid(),
      at: sale.refundAt,
      amount: -sale.total,
      reason: "Devolución",
      reference: `#${sale.number}`,
    });
}
export function saveProduct(s: State, p: Product) {
  productSchema.parse(p);
  check(
    !s.products.some(
      (x) => x.id !== p.id && x.sku.toLowerCase() === p.sku.toLowerCase(),
    ),
    "Este SKU ya existe.",
  );
  check(
    !p.barcode ||
      !s.products.some((x) => x.id !== p.id && x.barcode === p.barcode),
    "Este código de barras ya existe.",
  );
  const old = s.products.find((x) => x.id === p.id);
  if (old) {
    const stock = old.stock;
    Object.assign(old, p, { stock });
  } else {
    s.products.push({ ...p, stock: 0 });
    move(
      s,
      s.products.at(-1)!,
      p.stock,
      "Inventario inicial",
      "Alta de producto",
    );
  }
  if (!s.categories.includes(p.category)) s.categories.push(p.category);
}
export function adjustStock(
  s: State,
  id: string,
  delta: number,
  reason: string,
) {
  const p = s.products.find((p) => p.id === id);
  check(p && p.active, "Producto no disponible.");
  check(
    Number.isInteger(delta) && delta !== 0,
    "Introduce un ajuste entero distinto de cero.",
  );
  check(reason.trim(), "Escribe un motivo para el ajuste.");
  check(p.stock + delta >= 0, "El ajuste excede las existencias.");
  move(s, p, delta, reason.trim(), "Ajuste manual");
}
export function removeProduct(s: State, id: string) {
  check(
    !s.purchases.some((x) => x.productId === id && x.status === "pending"),
    "Este producto tiene una compra pendiente.",
  );
  const p = s.products.find((p) => p.id === id);
  check(p, "Producto no encontrado.");
  if (
    s.sales.some((x) => x.lines.some((l) => l.productId === id)) ||
    s.purchases.some((x) => x.productId === id) ||
    s.movements.some((x) => x.productId === id)
  )
    p.active = false;
  else s.products = s.products.filter((x) => x.id !== id);
}
export function saveContact(
  s: State,
  key: "customers" | "suppliers",
  contact: Contact,
) {
  contactSchema.parse(contact);
  const found = s[key].find((x) => x.id === contact.id);
  if (found) Object.assign(found, contact);
  else s[key].push(contact);
}
export function removeContact(
  s: State,
  key: "customers" | "suppliers",
  id: string,
) {
  check(
    key !== "suppliers" ||
      !s.purchases.some((x) => x.supplierId === id && x.status === "pending"),
    "El proveedor tiene compras pendientes.",
  );
  const used =
    key === "customers"
      ? s.sales.some((x) => x.customerId === id)
      : s.purchases.some((x) => x.supplierId === id);
  if (used) s[key].find((x) => x.id === id)!.active = false;
  else s[key] = s[key].filter((x) => x.id !== id);
}
export function createPurchase(
  s: State,
  supplierId: string,
  productId: string,
  quantity: number,
  cost: number,
) {
  const supplier = s.suppliers.find((x) => x.id === supplierId && x.active),
    product = s.products.find((x) => x.id === productId && x.active);
  check(supplier && product, "Selecciona producto y proveedor activos.");
  check(
    Number.isInteger(quantity) && quantity > 0,
    "La cantidad debe ser un entero positivo.",
  );
  check(Number.isSafeInteger(cost) && cost >= 0, "El costo no es válido.");
  s.purchases.unshift({
    id: uid(),
    at: now(),
    supplierId,
    supplierName: supplier.name,
    productId,
    productName: product.name,
    quantity,
    cost,
    status: "pending",
  });
}
export function receivePurchase(s: State, id: string) {
  const p = s.purchases.find((x) => x.id === id);
  check(p?.status === "pending", "La compra ya fue recibida o cancelada.");
  const product = s.products.find((x) => x.id === p.productId);
  check(product, "Producto inexistente.");
  p.status = "received";
  p.receivedAt = now();
  move(s, product, p.quantity, "Recepción de compra", p.id);
  product.cost = p.cost;
}
export function openCash(s: State, opening: number) {
  check(!activeSession(s), "Ya hay una caja abierta.");
  check(
    Number.isSafeInteger(opening) && opening >= 0,
    "Fondo inicial inválido.",
  );
  s.sessions.unshift({ id: uid(), openedAt: now(), opening, entries: [] });
}
export function cashMovement(s: State, amount: number, reason: string) {
  const session = activeSession(s);
  check(session, "Abre una caja primero.");
  check(
    Number.isSafeInteger(amount) && amount !== 0 && reason.trim(),
    "Indica un importe y motivo válidos.",
  );
  check(
    expectedCash(session) + amount >= 0,
    "La salida supera el efectivo disponible.",
  );
  session.entries.push({
    id: uid(),
    at: now(),
    amount,
    reason: reason.trim(),
    reference: "Movimiento manual",
  });
}
export function closeCash(s: State, counted: number) {
  const session = activeSession(s);
  check(session, "No hay una caja abierta.");
  check(
    Number.isSafeInteger(counted) && counted >= 0,
    "El conteo no es válido.",
  );
  session.closedAt = now();
  session.counted = counted;
  session.expected = expectedCash(session);
}
export function validateState(value: unknown): State {
  const s = stateSchema.parse(value);
  check(
    new Set(s.categories.map((c) => c.toLowerCase())).size ===
      s.categories.length,
    "Hay categorías duplicadas.",
  );
  for (const p of s.products)
    check(s.categories.includes(p.category), "Producto sin categoría válida.");
  for (const session of s.sessions) {
    check(
      new Set(session.entries.map((e) => e.id)).size === session.entries.length,
      "Hay movimientos de caja duplicados.",
    );
    check(expectedCash(session) >= 0, "El efectivo de una caja es negativo.");
    if (session.closedAt)
      check(
        session.expected === expectedCash(session) &&
          session.counted !== undefined,
        "El cierre de caja no coincide con sus movimientos.",
      );
  }
  for (const list of [
    s.products,
    s.customers,
    s.suppliers,
    s.sales,
    s.sessions,
    s.movements,
    s.purchases,
  ])
    check(
      new Set(list.map((x) => x.id)).size === list.length,
      "El respaldo contiene identificadores duplicados.",
    );
  check(
    new Set(s.products.map((p) => p.sku.toLowerCase())).size ===
      s.products.length,
    "Hay SKU duplicados.",
  );
  const codes = s.products.filter((p) => p.barcode).map((p) => p.barcode);
  check(new Set(codes).size === codes.length, "Hay códigos duplicados.");
  check(
    s.sessions.filter((x) => !x.closedAt).length <= 1,
    "Hay más de una caja abierta.",
  );
  check(
    new Set(s.sales.map((x) => x.number)).size === s.sales.length,
    "Hay folios duplicados.",
  );
  for (const sale of s.sales) {
    check(
      sale.currency === s.settings.currency,
      "Las ventas deben usar la moneda del negocio.",
    );
    check(
      s.sessions.some((x) => x.id === sale.sessionId),
      "Falta la sesión de una venta.",
    );
    check(
      !sale.customerId || s.customers.some((x) => x.id === sale.customerId),
      "Falta un cliente.",
    );
    check(
      sale.lines.every((l) => s.products.some((p) => p.id === l.productId)),
      "Falta un producto de una venta.",
    );
    check(
      sale.subtotal ===
        sale.lines.reduce((n, l) => n + l.price * l.quantity, 0) &&
        sale.total === sale.subtotal - sale.discount &&
        sale.tax ===
          sale.total - Math.round(sale.total / (1 + sale.taxRate / 100)),
      "Los importes de una venta no cuadran.",
    );
    check(
      sale.received - sale.change === sale.total,
      "El pago no coincide con la venta.",
    );
    check(
      sale.status !== "refunded" || !!sale.refundAt,
      "Falta la fecha de devolución.",
    );
  }
  for (const p of s.purchases)
    check(
      s.products.some((x) => x.id === p.productId) &&
        s.suppliers.some((x) => x.id === p.supplierId),
      "Compra sin producto o proveedor.",
    );
  for (const m of s.movements)
    check(
      s.products.some((x) => x.id === m.productId),
      "Movimiento sin producto.",
    );
  for (const p of s.products)
    check(
      p.stock ===
        s.movements
          .filter((m) => m.productId === p.id)
          .reduce((n, m) => n + m.delta, 0),
      "El inventario no coincide con sus movimientos.",
    );
  return s;
}
export function metrics(s: State, start: string, end: string) {
  const sales = s.sales.filter((x) => x.at >= start && x.at <= end),
    refunds = s.sales.filter(
      (x) => x.refundAt && x.refundAt >= start && x.refundAt <= end,
    );
  const gross = sales.reduce((n, x) => n + x.total, 0),
    returns = refunds.reduce((n, x) => n + x.total, 0);
  const costs = (xs: Sale[]) =>
    xs.reduce(
      (n, x) => n + x.lines.reduce((n, l) => n + l.cost * l.quantity, 0),
      0,
    );
  const tax =
    sales.reduce((n, x) => n + x.tax, 0) -
    refunds.reduce((n, x) => n + x.tax, 0);
  return {
    sales,
    refunds,
    gross,
    returns,
    net: gross - returns,
    tax,
    margin: gross - returns - tax - costs(sales) + costs(refunds),
    count: sales.length,
  };
}
