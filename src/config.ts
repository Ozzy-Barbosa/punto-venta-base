import type { State } from "./model";
/** Customize this profile to start a new business. Existing local data changes in Settings. */
export const businessProfile: State["settings"] = {
  name: "Brisa",
  tagline: "Mercado & Café",
  branch: "La Paz · Centro",
  currency: "MXN",
  taxRate: 16,
  accent: "forest",
  footer: "Gracias por comprar local. ¡Vuelve pronto!",
};
export const defaultCategories = [
  "Café y té",
  "Panadería",
  "Despensa",
  "Bebidas",
  "Hogar",
];
