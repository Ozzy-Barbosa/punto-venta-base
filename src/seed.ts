import { businessProfile, defaultCategories } from "./config";
import { checkout, type State, type Product } from "./model";
export function makeSeed(): State {
  const catalog: [string, string, number, number, number, Product["art"]][] = [
    ["Café de especialidad", "Café y té", 245, 145, 24, "coffee"],
    ["Croissant de mantequilla", "Panadería", 48, 22, 18, "bread"],
    ["Matcha ceremonial", "Café y té", 320, 180, 12, "jar"],
    ["Miel de la sierra", "Despensa", 185, 95, 8, "jar"],
    ["Cold brew original", "Bebidas", 65, 28, 30, "bottle"],
    ["Granola artesanal", "Despensa", 135, 62, 4, "bag"],
    ["Taza de cerámica", "Hogar", 280, 150, 10, "cup"],
    ["Pan de masa madre", "Panadería", 95, 42, 6, "bread"],
    ["Té de manzanilla", "Café y té", 110, 48, 16, "box"],
    ["Aceite de oliva", "Despensa", 225, 135, 9, "bottle"],
    ["Kombucha de jamaica", "Bebidas", 75, 34, 3, "bottle"],
    ["Bolsa de algodón", "Hogar", 160, 75, 15, "bag"],
    ["Galletas de avena", "Panadería", 55, 22, 20, "box"],
    ["Chocolate 70% cacao", "Despensa", 85, 40, 22, "box"],
    ["Planta suculenta", "Hogar", 145, 65, 0, "plant"],
    ["Agua mineral", "Bebidas", 35, 14, 36, "bottle"],
  ];
  const at = new Date();
  at.setHours(8, 0, 0, 0);
  const s: State = {
    version: 1,
    revision: 0,
    settings: { ...businessProfile },
    categories: [...defaultCategories],
    products: catalog.map((p, i) => ({
      id: `p${i}`,
      name: p[0],
      sku: `BR-${String(i + 1).padStart(3, "0")}`,
      barcode: `7501234${String(i).padStart(6, "0")}`,
      category: p[1],
      price: p[2] * 100,
      cost: p[3] * 100,
      stock: p[4],
      minimum: 5,
      art: p[5],
      active: true,
    })),
    customers: [
      {
        id: "c1",
        name: "Mariana López",
        email: "mariana@example.com",
        phone: "",
        note: "Cliente ficticio · prefiere café en grano",
        active: true,
      },
      {
        id: "c2",
        name: "Diego Castro",
        email: "diego@example.com",
        phone: "",
        note: "Cliente ficticio",
        active: true,
      },
      {
        id: "c3",
        name: "Ana Méndez",
        email: "ana@example.com",
        phone: "",
        note: "Cliente ficticio",
        active: true,
      },
    ],
    suppliers: [
      {
        id: "s1",
        name: "Origen del Sur",
        email: "origen@example.com",
        phone: "",
        note: "Proveedor ficticio de café y té",
        active: true,
      },
      {
        id: "s2",
        name: "Taller del Pan",
        email: "pan@example.com",
        phone: "",
        note: "Proveedor ficticio de panadería",
        active: true,
      },
      {
        id: "s3",
        name: "Productores de Baja",
        email: "baja@example.com",
        phone: "",
        note: "Proveedor ficticio de despensa",
        active: true,
      },
    ],
    sales: [],
    movements: [],
    sessions: [
      {
        id: "seed-session",
        openedAt: at.toISOString(),
        opening: 100000,
        entries: [],
      },
    ],
    purchases: [],
  };
  s.products.forEach((p) =>
    s.movements.push({
      id: `initial-${p.id}`,
      at: new Date(at.getTime() - 8 * 86400000).toISOString(),
      productId: p.id,
      delta: p.stock,
      reason: "Inventario inicial ficticio",
      reference: "Demo",
    }),
  );
  for (let day = 6; day >= 0; day--)
    for (let j = 0; j < (day === 0 ? 5 : 3 + (day % 3)); j++) {
      const p = s.products[(day * 3 + j) % s.products.length];
      if (p.stock < 1) continue;
      const sale = checkout(
        s,
        [{ productId: p.id, quantity: 1 }],
        j === 2 ? 5 : 0,
        j % 2 ? "Tarjeta" : "Efectivo",
        50000,
        j % 2 ? "c1" : "c2",
        `seed-sale-${day}-${j}`,
      );
      const time = new Date(at);
      time.setDate(time.getDate() - day);
      time.setHours(day === 0 ? 8 : 10 + j, 10 + j * 7, 0, 0);
      sale.at = time.toISOString();
      s.movements
        .filter((m) => m.reference === `#${sale.number}`)
        .forEach((m) => (m.at = sale.at));
      const entry = s.sessions[0].entries.find(
        (e) => e.reference === `#${sale.number}`,
      );
      if (entry) entry.at = sale.at;
    }
  // Historical demo sales belong to a closed historical register.
  const today = at.toISOString().slice(0, 10);
  const old = s.sales.filter((x) => x.at.slice(0, 10) !== today);
  old.forEach((x) => (x.sessionId = "seed-history"));
  const entries = s.sessions[0].entries.filter((e) =>
    old.some((x) => e.reference === `#${x.number}`),
  );
  s.sessions[0].entries = s.sessions[0].entries.filter(
    (e) => !entries.includes(e),
  );
  s.sessions.push({
    id: "seed-history",
    openedAt: new Date(at.getTime() - 7 * 86400000).toISOString(),
    closedAt: new Date(at.getTime() - 86400000).toISOString(),
    opening: 0,
    entries,
    expected: entries.reduce((n, e) => n + e.amount, 0),
    counted: entries.reduce((n, e) => n + e.amount, 0),
  });
  return s;
}
