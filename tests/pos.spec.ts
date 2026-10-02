import { test, expect, type Page } from "@playwright/test";
async function nav(page: Page, label: string) {
  if (
    await page
      .getByRole("button", { name: "Abrir menú", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: label, exact: true })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Todo listo para un buen día." }),
  ).toBeVisible();
});
test("sale, receipt, persistence, refund and inventory cycle", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await nav(page, "Punto de venta");
  await page
    .getByRole("button", { name: "Agregar Café de especialidad", exact: true })
    .click();
  await page.getByLabel("Descuento porcentual").fill("10");
  await page.getByRole("button", { name: /^Cobrar/ }).click();
  await page.getByLabel("Efectivo recibido").fill("500");
  await expect(page.getByText("$279.50", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  await expect(
    page.getByRole("heading", { name: "Detalle del ticket" }),
  ).toBeVisible();
  const receipt = page.locator(".receipt");
  await expect(receipt).toContainText("$220.50");
  await page.emulateMedia({ media: "print" });
  await expect(receipt).toBeVisible();
  await expect(page.locator(".pos-heading")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  const number = (await receipt.locator(".receipt-meta b").innerText()).replace(
    "Ticket #",
    "",
  );
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  await page.reload();
  await nav(page, "Ventas");
  await page.getByLabel("Buscar venta").fill(number);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: `Devolver ticket ${number}` }).click();
  await page.getByLabel("Motivo de devolución").fill("Devolución de prueba");
  await page.getByRole("button", { name: "Confirmar devolución" }).click();
  await expect(page.locator("tbody")).toContainText("Devuelta");
  await expect(
    page.getByRole("button", { name: `Devolver ticket ${number}` }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("product CRUD, stock adjustment and archive restore", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await nav(page, "Inventario");
  await page
    .getByRole("button", { name: "Nuevo producto", exact: true })
    .click();
  await page.getByLabel("Nombre del producto").fill("Producto de prueba");
  await page.getByLabel("SKU único").fill("TEST-001");
  await page.getByLabel("Precio final").fill("59.99");
  await page.getByLabel("Costo unitario").fill("20");
  await page.getByLabel("Existencias iniciales").fill("5");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await page.getByLabel("Buscar en inventario").fill("TEST-001");
  await expect(page.locator("tbody")).toContainText("Producto de prueba");
  await page
    .getByRole("button", { name: "Editar Producto de prueba", exact: true })
    .click();
  await page.getByLabel("Nombre del producto").fill("Producto editado");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await page.getByRole("button", { name: "Ajustar Producto editado" }).click();
  await page.getByLabel("Unidades a agregar").fill("3");
  await page.getByLabel("Motivo del ajuste").fill("Recepción de prueba");
  await page.getByRole("button", { name: "Registrar ajuste" }).click();
  await expect(page.locator("tbody")).toContainText("8");
  await page.getByRole("button", { name: "Archivar Producto editado" }).click();
  await page.getByLabel("Filtrar inventario").selectOption("archived");
  await expect(page.locator("tbody")).toContainText("Archivado");
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(0);
});
test("contacts, purchasing, cash close and new opening", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await nav(page, "Clientes");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Cliente prueba");
  await page.getByLabel("Correo electrónico").fill("prueba@example.com");
  await page.getByRole("button", { name: "Guardar contacto" }).click();
  await expect(
    page.getByRole("heading", { name: "Cliente prueba" }),
  ).toBeVisible();
  await nav(page, "Compras");
  await page.getByRole("button", { name: "Nueva compra" }).click();
  await page
    .getByRole("combobox", { name: "Proveedor", exact: true })
    .selectOption("s1");
  await page
    .getByRole("combobox", { name: "Producto", exact: true })
    .selectOption("p0");
  await page.getByLabel("Cantidad a recibir").fill("4");
  await page.getByLabel("Costo unitario acordado").fill("120");
  await page.getByRole("button", { name: "Crear orden" }).click();
  await page.getByRole("button", { name: "Recibir", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Recibida");
  await expect(
    page.getByRole("button", { name: "Recibir", exact: true }),
  ).toHaveCount(0);
  await nav(page, "Caja");
  await page.getByRole("button", { name: "Entrada", exact: true }).click();
  await page.getByLabel("Importe", { exact: true }).fill("100");
  await page.getByLabel("Motivo", { exact: true }).fill("Fondo extra");
  await page.getByRole("button", { name: "Guardar movimiento" }).click();
  await expect(page.locator("tbody").first()).toContainText("Fondo extra");
  await page.getByRole("button", { name: "Cerrar caja", exact: true }).click();
  await page.getByLabel("Efectivo contado").fill("1000");
  await page.getByRole("button", { name: "Confirmar cierre" }).click();
  await expect(
    page.getByRole("button", { name: "Abrir caja", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir caja", exact: true }).click();
  await page.getByLabel("Fondo inicial").fill("500");
  await page.getByRole("button", { name: "Guardar movimiento" }).click();
  await expect(
    page.getByRole("button", { name: "Cerrar caja", exact: true }),
  ).toBeVisible();
});
test("all screens render, settings persist, backups and CSV download, no overflow", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const label of [
    "Resumen",
    "Punto de venta",
    "Inventario",
    "Ventas",
    "Clientes",
    "Proveedores",
    "Compras",
    "Caja",
    "Reportes",
  ]) {
    await nav(page, label);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    if (label === "Resumen" || label === "Punto de venta")
      await page.screenshot({
        path: `test-results/${testInfo.project.name}-${label === "Resumen" ? "dashboard" : "pos"}.png`,
        fullPage: true,
        animations: "disabled",
      });
  }
  if (
    await page
      .getByRole("button", { name: "Abrir menú", exact: true })
      .isVisible()
  )
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.getByLabel("Nombre comercial").fill("Brisa Prueba");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.reload();
  await expect(page.getByLabel("Nombre comercial")).toHaveValue("Brisa Prueba");
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar respaldo", exact: true })
    .click();
  expect((await dl).suggestedFilename()).toBe("brisa-respaldo.json");
  await nav(page, "Reportes");
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar reporte" }).click();
  expect((await csv).suggestedFilename()).toContain(".csv");
  expect(errors).toEqual([]);
});
