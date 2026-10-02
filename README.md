# Brisa · Punto de venta web

Un prototipo funcional y reutilizable de punto de venta para **Brisa · Mercado & Café**, negocio ficticio. Español, moneda MXN, diseño adaptable y datos de demostración coherentes con el inventario.

**[Abrir aplicación](https://ozzy-barbosa.github.io/punto-venta-base/) · [Prompt maestro](docs/PROMPT-MAESTRO.md) · [Investigación](docs/INVESTIGACION-POS.md) · [Guía de adaptación](docs/ARQUITECTURA-Y-ADAPTACION.md)**

## Qué puedes hacer

| Área                   | Funciones                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Resumen                | Ventas netas del día, tickets, promedio, mínimos, gráfica semanal y productos más vendidos                               |
| Venta                  | Catálogo, búsqueda por nombre/SKU/código, categorías, cantidades, descuento, cliente, carrito pendiente y cobro simulado |
| Tickets                | Instantáneas de precio/costo/impuesto, efectivo y cambio, impresión y devolución completa única                          |
| Inventario             | Alta, edición, archivo/restauración, categorías, mínimos, ajustes con motivo y libro de movimientos                      |
| Clientes / proveedores | Crear, leer, editar, eliminar o archivar según relaciones, notas y compras acumuladas                                    |
| Compras                | Orden por referencia, recepción única, actualización de stock/costo y cancelación                                        |
| Caja                   | Apertura, efectivo de ventas/devoluciones, entradas, salidas, cierre y diferencia                                        |
| Reportes               | Rango de fechas, ventas netas, devoluciones por fecha, margen estimado, unidades y métodos de pago                       |
| Configuración          | Marca, sucursal, tema de color, mensaje de ticket, impuesto incluido y categorías                                        |
| Datos                  | Persistencia local, exportación CSV, respaldo JSON validado, restauración y reinicio confirmado                          |

## Pruébalo en dos minutos

1. Abre **Punto de venta** y agrega un café y un croissant.
2. Selecciona un cliente, aplica un descuento si lo deseas y pulsa **Cobrar**.
3. Elige efectivo, registra el importe recibido y confirma. Consulta el cambio y el ticket.
4. Ve a **Inventario → Movimientos** para ver la salida de productos.
5. En **Ventas**, abre el ticket o registra una devolución con motivo.
6. En **Compras**, crea y recibe mercancía. En **Caja**, concilia y cierra el turno.
7. Cambia marca y color en **Configuración**, y descarga un respaldo.

## Desarrollo

Node.js 22.12+ o 24, npm y un navegador moderno.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

Las pruebas de navegador usan Microsoft Edge instalado en este entorno:

```sh
npm run test:e2e
```

Para otros sistemas, instala Chromium de Playwright y cambia `channel` en `playwright.config.ts`. No es necesario para compilar ni para las pruebas del motor.

## Adaptación

El perfil inicial está en `src/config.ts`; los datos ficticios en `src/seed.ts`. El motor y el adaptador de almacenamiento están separados de las pantallas. La [guía de arquitectura](docs/ARQUITECTURA-Y-ADAPTACION.md) explica cambios visuales rápidos y la transición a una operación real.

Se estudiaron patrones documentados por Square, Shopify POS, Lightspeed y Odoo. Se creó una interfaz original y reglas propias; no se copiaron marcas, código ni diseños de esos productos. Las ilustraciones SVG se hicieron para este proyecto. Las tipografías se solicitan a Google Fonts, con alternativas locales.

## Publicación

GitHub Actions prueba el motor, compila y publica `dist/` al actualizar `main`. Pages debe estar configurado con origen **GitHub Actions**. El enrutamiento por hash y las rutas relativas permiten servir desde el subdirectorio del repositorio.

## Alcance de la demo

- Datos ficticios guardados únicamente en el navegador: no se sincronizan entre dispositivos.
- Sin autenticación real, autorización por roles, cobros bancarios ni facturación fiscal.
- Una sucursal y una pestaña operativa; protección de versión ante datos desactualizados, sin garantía multiusuario.
- Unidades enteras, tasa uniforme configurable, precios con impuesto incluido y devoluciones completas con reposición.
- Compras internas de una referencia; no envían pedidos ni pagan al proveedor.
- No promete funcionamiento offline ni compatibilidad validada con escáneres/impresoras físicos.
- No cambiar la moneda sobre operaciones existentes; se necesita un proyecto con datos en la moneda de origen.

La personalización de una demo sí admite ajustes pequeños. Para usar dinero y datos reales se deben añadir base de datos compartida, servidor transaccional, acceso seguro, respaldos y las integraciones correspondientes.

Consulta las comprobaciones realizadas en [VALIDACION.md](docs/VALIDACION.md).
