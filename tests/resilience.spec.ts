import { test, expect, type Page } from "@playwright/test";
async function settings(page: Page) {
  await page.goto("./#settings");
  await expect(
    page.getByRole("heading", { name: "Configuración", exact: true }),
  ).toBeVisible();
}
test("backup restore validates files and preserves original on invalid import", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await settings(page);
  const original = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("brisa-pos-v1")!),
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText("Respaldo inválido");
  await expect(page.getByLabel("Nombre comercial")).toHaveValue("Brisa");
  original.settings.name = "Negocio restaurado";
  await page.locator("input[type=file]").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await expect(page.getByLabel("Nombre comercial")).toHaveValue(
    "Negocio restaurado",
  );
  await page.reload();
  await expect(page.getByLabel("Nombre comercial")).toHaveValue(
    "Negocio restaurado",
  );
});
test("barcode entry, parked cart, keyboard modal and double-click payment", async ({
  page,
}) => {
  await page.goto("./#pos");
  await page.getByLabel("Buscar producto", { exact: true }).fill("BR-001");
  await page.getByLabel("Buscar producto", { exact: true }).press("Enter");
  await expect(page.locator(".cart-items")).toContainText(
    "Café de especialidad",
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Guardar para después" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Recuperar venta" }).click();
  await expect(page.locator(".cart-items")).toContainText(
    "Café de especialidad",
  );
  await page.getByRole("button", { name: /^Cobrar/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /^Cobrar/ }).click();
  await page.getByRole("button", { name: "Tarjeta", exact: true }).click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("brisa-pos-v1")!).sales.length,
  );
  await page.getByRole("button", { name: "Confirmar venta" }).dblclick();
  await expect(
    page.getByRole("heading", { name: "Detalle del ticket" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("brisa-pos-v1")!).sales.length,
    ),
  ).toBe(before + 1);
});
