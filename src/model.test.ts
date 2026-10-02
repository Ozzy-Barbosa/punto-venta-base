import { describe, it, expect } from "vitest";
import { makeSeed } from "./seed";
import {
  checkout,
  totals,
  refund,
  activeSession,
  expectedCash,
  adjustStock,
  saveProduct,
  removeProduct,
  saveContact,
  removeContact,
  createPurchase,
  receivePurchase,
  openCash,
  closeCash,
  cashMovement,
  validateState,
  metrics,
  cents,
} from "./model";
describe("transaction and inventory invariants", () => {
  it("seed ledger reconciles and validates", () => {
    expect(validateState(makeSeed()).products).toHaveLength(16);
  });
  it("cash sale decrements stock, records cash net of change and keeps snapshots", () => {
    const s = makeSeed(),
      p = s.products[0],
      before = p.stock,
      cash = expectedCash(activeSession(s)!);
    const sale = checkout(
      s,
      [{ productId: p.id, quantity: 2 }],
      10,
      "Efectivo",
      100000,
    );
    expect(sale.total).toBe(44100);
    expect(sale.change).toBe(55900);
    expect(sale.tax).toBe(6083);
    expect(p.stock).toBe(before - 2);
    expect(expectedCash(activeSession(s)!)).toBe(cash + 44100);
    p.name = "Nuevo nombre";
    p.price = 99900;
    expect(sale.lines[0].name).toBe("Café de especialidad");
    expect(sale.lines[0].price).toBe(24500);
    expect(validateState(s)).toBeTruthy();
  });
  it("rejects overselling and invalid quantities", () => {
    const s = makeSeed();
    for (const quantity of [0, -1, 0.5, 99999])
      expect(() =>
        checkout(s, [{ productId: "p0", quantity }], 0, "Tarjeta", 0),
      ).toThrow();
  });
  it("rejects duplicate cart rows and duplicate payment ids", () => {
    const s = makeSeed();
    expect(() =>
      totals(
        s,
        [
          { productId: "p0", quantity: 1 },
          { productId: "p0", quantity: 1 },
        ],
        0,
      ),
    ).toThrow();
    checkout(
      s,
      [{ productId: "p0", quantity: 1 }],
      0,
      "Tarjeta",
      0,
      "",
      "same-id",
    );
    expect(() =>
      checkout(
        s,
        [{ productId: "p0", quantity: 1 }],
        0,
        "Tarjeta",
        0,
        "",
        "same-id",
      ),
    ).toThrow();
  });
  it("rejects insufficient cash and closed register", () => {
    const s = makeSeed();
    expect(() =>
      checkout(s, [{ productId: "p0", quantity: 1 }], 0, "Efectivo", 1),
    ).toThrow();
    closeCash(s, 0);
    expect(() =>
      checkout(s, [{ productId: "p0", quantity: 1 }], 0, "Tarjeta", 0),
    ).toThrow();
  });
  it("does not add card payments to cash", () => {
    const s = makeSeed(),
      before = expectedCash(activeSession(s)!);
    checkout(s, [{ productId: "p0", quantity: 1 }], 0, "Tarjeta", 0);
    expect(expectedCash(activeSession(s)!)).toBe(before);
  });
  it("validates discounts and rounds money consistently", () => {
    const s = makeSeed();
    expect(() => totals(s, [{ productId: "p0", quantity: 1 }], 101)).toThrow();
    expect(() => totals(s, [], NaN)).toThrow();
    expect(cents("19.99")).toBe(1999);
    const t = totals(s, [{ productId: "p0", quantity: 1 }], 12.5);
    expect(t.total).toBe(21437);
    expect(t.discount + t.total).toBe(t.subtotal);
  });
  it("refund restores stock and cash exactly once", () => {
    const s = makeSeed(),
      stock = s.products[0].stock,
      cash = expectedCash(activeSession(s)!);
    const sale = checkout(
      s,
      [{ productId: "p0", quantity: 1 }],
      5,
      "Efectivo",
      50000,
    );
    refund(s, sale.id, "Cliente cambió de opinión");
    expect(s.products[0].stock).toBe(stock);
    expect(expectedCash(activeSession(s)!)).toBe(cash);
    expect(() => refund(s, sale.id, "Duplicada")).toThrow();
    expect(validateState(s)).toBeTruthy();
  });
  it("refuses refunds without funds and preserves sale", () => {
    const s = makeSeed();
    const sale = checkout(
      s,
      [{ productId: "p0", quantity: 1 }],
      0,
      "Efectivo",
      50000,
    );
    cashMovement(s, -expectedCash(activeSession(s)!), "Retiro");
    expect(() => refund(s, sale.id, "Prueba")).toThrow();
    expect(sale.status).toBe("paid");
  });
  it("can refund archived products into a later register", () => {
    const s = makeSeed();
    const sale = checkout(
      s,
      [{ productId: "p0", quantity: 1 }],
      0,
      "Efectivo",
      50000,
    );
    removeProduct(s, "p0");
    closeCash(s, 0);
    openCash(s, 100000);
    refund(s, sale.id, "Devuelto");
    expect(activeSession(s)!.entries.at(-1)!.amount).toBe(-24500);
    expect(validateState(s)).toBeTruthy();
  });
  it("records refunds on refund date rather than sale date", () => {
    const s = makeSeed();
    const sale = checkout(
      s,
      [{ productId: "p0", quantity: 1 }],
      0,
      "Tarjeta",
      0,
    );
    sale.at = "2020-01-01T00:00:00.000Z";
    refund(s, sale.id, "Devuelto");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const m = metrics(s, today.toISOString(), "9999");
    expect(m.refunds.some((x) => x.id === sale.id)).toBe(true);
    expect(m.sales.some((x) => x.id === sale.id)).toBe(false);
  });
});
describe("administration rules", () => {
  it("product CRUD protects unique SKUs and historic stock", () => {
    const s = makeSeed();
    const p = {
      ...s.products[0],
      id: "new",
      sku: "NEW",
      barcode: "",
      stock: 3,
    };
    saveProduct(s, p);
    expect(s.products.at(-1)!.stock).toBe(3);
    saveProduct(s, { ...p, name: "Updated", stock: 999 });
    expect(s.products.at(-1)!.stock).toBe(3);
    expect(() => saveProduct(s, { ...p, id: "another" })).toThrow();
    expect(() =>
      saveProduct(s, { ...p, id: "another", sku: "br-001" }),
    ).toThrow();
    removeProduct(s, "new");
    expect(s.products.at(-1)!.active).toBe(false);
    expect(validateState(s)).toBeTruthy();
  });
  it("stock adjustments require reason, integers, and available stock", () => {
    const s = makeSeed(),
      stock = s.products[0].stock;
    adjustStock(s, "p0", 4, "Conteo");
    expect(s.products[0].stock).toBe(stock + 4);
    expect(() => adjustStock(s, "p0", -999, "Merma")).toThrow();
    expect(() => adjustStock(s, "p0", 1, "")).toThrow();
    expect(() => adjustStock(s, "p0", 0.5, "Conteo")).toThrow();
    expect(validateState(s)).toBeTruthy();
  });
  it("customer create, edit, delete and archive retain sale names", () => {
    const s = makeSeed();
    saveContact(s, "customers", {
      id: "test",
      name: "Test",
      email: "",
      phone: "",
      note: "",
      active: true,
    });
    removeContact(s, "customers", "test");
    expect(s.customers.some((x) => x.id === "test")).toBe(false);
    const sale = checkout(
      s,
      [{ productId: "p0", quantity: 1 }],
      0,
      "Tarjeta",
      0,
      "c1",
    );
    saveContact(s, "customers", { ...s.customers[0], name: "New" });
    removeContact(s, "customers", "c1");
    expect(sale.customerName).toBe("Mariana López");
    expect(s.customers[0].active).toBe(false);
  });
  it("receives each purchase once and prevents removing pending relationships", () => {
    const s = makeSeed(),
      stock = s.products[0].stock;
    createPurchase(s, "s1", "p0", 5, 12000);
    const p = s.purchases[0];
    expect(() => removeProduct(s, "p0")).toThrow();
    expect(() => removeContact(s, "suppliers", "s1")).toThrow();
    receivePurchase(s, p.id);
    expect(s.products[0].stock).toBe(stock + 5);
    expect(s.products[0].cost).toBe(12000);
    expect(() => receivePurchase(s, p.id)).toThrow();
    expect(validateState(s)).toBeTruthy();
  });
  it("cash movements cannot overdraw and close stores variance", () => {
    const s = makeSeed();
    expect(() => openCash(s, 0)).toThrow();
    expect(() => cashMovement(s, -9999999, "Retiro")).toThrow();
    cashMovement(s, 10000, "Fondo");
    const expected = expectedCash(activeSession(s)!);
    closeCash(s, expected - 100);
    expect(s.sessions[0].counted! - s.sessions[0].expected!).toBe(-100);
    openCash(s, 0);
    expect(activeSession(s)!.opening).toBe(0);
  });
});
describe("backup validation", () => {
  it("rejects invalid structure without applying changes", () => {
    expect(() => validateState({ version: 2 })).toThrow();
  });
  it("rejects broken references and ledger mismatches", () => {
    const s = makeSeed();
    s.products[0].stock += 1;
    expect(() => validateState(s)).toThrow();
    const t = makeSeed();
    t.sales[0].lines[0].productId = "absent";
    expect(() => validateState(t)).toThrow();
  });
  it("rejects tampered totals and duplicate records", () => {
    const s = makeSeed();
    s.sales[0].total++;
    expect(() => validateState(s)).toThrow();
    const t = makeSeed();
    t.customers.push(t.customers[0]);
    expect(() => validateState(t)).toThrow();
  });
  it("round trips all demo data", () => {
    const s = makeSeed();
    expect(validateState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
