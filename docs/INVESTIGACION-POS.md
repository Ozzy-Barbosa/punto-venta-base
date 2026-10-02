# Investigación de puntos de venta y decisiones de producto

Fecha de consulta: 1 de octubre de 2026. Fuentes oficiales públicas; análisis documental, no pruebas contratadas de los cuatro productos. No existe un «mejor POS» universal: depende del giro, país, hardware, conectividad y canales. Se seleccionaron cuatro referentes con enfoques distintos para estudiar patrones transferibles. No se evaluaron precios ni disponibilidad contractual en México. Las marcas y sus interfaces no se reproducen.

## Referentes

### Square: venta y operación conectadas

Su propuesta une el registro de la compra con catálogo, inventario, clientes y pagos. Una orden conserva líneas e importes; al completarse o reembolsarse puede actualizar las existencias. La API separa la orden comercial de la confirmación del pago. Esto evita confundir un pedido creado con dinero efectivamente cobrado. [Square Retail](https://squareup.com/us/en/point-of-sale/retail), [Square Orders API](https://developer.squareup.com/docs/orders-api/what-it-does).

**Decisión propia:** catálogo visual y carrito siempre visible en escritorio; finalizar una venta es una operación del motor que guarda ticket, inventario y efectivo juntos. La demo registra métodos de pago explícitamente simulados. El folio y los importes históricos se conservan aunque cambie el producto.

### Shopify POS: continuidad de catálogo, cliente y devolución

Shopify documenta búsqueda, escaneo, descuentos, carritos guardados, perfiles de clientes y gestión de inventario. Sus devoluciones seleccionan la orden y las unidades e incluyen controles de permisos, método de reembolso y reposición. Varias prestaciones dependen del plan. [Funciones de Shopify POS](https://www.shopify.com/pos/features), [Flujo oficial de devoluciones](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management/complete-refund-orders).

**Decisión propia:** identificar productos por nombre/SKU/código, asociar clientes, conservar un carrito pendiente y devolver desde el ticket. La primera versión implementa devolución completa con reposición y motivo; la devolución parcial y la reposición opcional quedan como extensiones. El proceso no modifica arbitrariamente una venta cerrada.

### Lightspeed Retail: profundidad de inventario y abastecimiento

Su catálogo funcional cubre variantes, pedidos a proveedores, recepción, puntos de reposición, múltiples ubicaciones y reportes operativos. Su documentación de reportes distingue análisis básico y avanzado, con capacidades de previsión y pedidos a partir del inventario según configuración y producto. [Funciones de Lightspeed Retail](https://www.lightspeedhq.com/pos/retail/features/), [Reportes Retail X-Series](https://x-series-support.lightspeedhq.com/hc/en-us/articles/25534093525915-Basic-and-advanced-reporting-in-Retail-POS-X-Series).

**Decisión propia:** alertas por umbral, libro de movimientos, costos separados del precio y compras que pasan de pendiente a recibida una sola vez. Un pedido no modifica existencias hasta recibirlo. Se usa una referencia por orden para mantener verificable el prototipo; una compra con varias líneas se puede añadir sin cambiar el principio.

### Odoo: ciclo diario de caja

La guía oficial describe la apertura de sesión, control del fondo inicial, atención de pedidos, reembolsos y cierre. Su documentación de POS también describe funcionamiento temporal sin conexión. La página de flujo de la versión 19 fue localizable mediante búsqueda oficial, pero su lectura completa devolvió timeout; la referencia de versión 17 sí se usa como contexto estable del ciclo de sesión. [Odoo 19: flujo](https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/use.html), [Odoo 17: POS](https://www.odoo.com/documentation/17.0/applications/sales/point_of_sale.html).

**Decisión propia:** abrir caja antes de vender, separar efectivo de tarjeta/transferencia y conciliar contado contra esperado. El prototipo persiste localmente, pero no promete arrancar sin Internet: no incorpora caché de aplicación ni sincronización offline.

## Comparación orientada a esta base

Las columnas «fortaleza» son interpretación de las fuentes consultadas; no una clasificación comercial ni una afirmación de exclusividad.

| Referente   | Fortaleza para estudiar          | Patrón adoptado                                         | Complejidad postergada                                     |
| ----------- | -------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Square      | Compra vinculada a catálogo/pago | Operación coherente de venta + ticket + stock           | Integración con terminal, webhooks y conciliación bancaria |
| Shopify POS | Continuidad de cliente y compra  | Búsqueda, cliente, carrito pendiente, retorno al ticket | Comercio electrónico, omnicanal y devoluciones parciales   |
| Lightspeed  | Inventario y aprovisionamiento   | Mínimos, movimientos, compra y recepción                | Sucursales, variantes y pronósticos                        |
| Odoo        | Sesiones y caja                  | Apertura, entradas/salidas, cierre y diferencia         | ERP, contabilidad y sincronización desconectada            |

## Análisis de flujos y estados

1. **Catálogo → carrito:** filtrar y agregar con un clic. Mostrar precio final y existencias antes de agregar. Prohibir cantidades por encima del stock. Una lectura de código que termina en Enter busca coincidencia exacta en SKU/código; no se ha probado hardware físico.
2. **Carrito → venta:** elegir cliente opcional, descuento y método; validar fondos si es efectivo. Guardar precios, costos, nombre del comercio y tasa dentro del ticket. Se mantiene un identificador de solicitud para rechazar una repetición.
3. **Venta → inventario/caja:** un cambio coherente en memoria se valida y persiste en un único documento. Solo el neto cobrado incrementa efectivo, no el billete recibido. Tarjeta y transferencia se muestran como registros, sin procesador.
4. **Venta → devolución:** conservar ticket y marcar reversión; restaurar unidades y registrar salida si corresponde. Una segunda devolución se rechaza. No se permite devolver efectivo superior al disponible. La mercadería dañada se gestiona después con un ajuste de merma con motivo.
5. **Compra pendiente → recibida/cancelada:** la recepción aumenta stock y actualiza costo actual. El costo histórico de ventas anteriores permanece fijo. La compra no paga al proveedor automáticamente.
6. **Caja abierta → cerrada:** conservar fondo, entradas y salidas; comparar efectivo físico contra esperado y registrar diferencia. La nueva sesión no altera el cierre anterior.
7. **Registro → eliminado/archivado:** contactos sin uso pueden borrarse. Productos y contactos vinculados conservan su identificador para no romper ventas, compras o movimientos. Un producto archivado puede restaurarse.
8. **Operación → reportes:** sumar cobros en su fecha y restar devoluciones en la fecha de la devolución. Diferenciar ventas netas, impuesto incluido, ticket promedio y margen estimado. No llamar utilidad final a un margen que no considera gastos.

## Criterios UX aplicados

- Navegación estable por tareas; venta al alcance desde el resumen.
- Feedback visible de éxito/error; modal con foco y Escape; nombres accesibles para acciones con iconos.
- Estados vacíos accionables, producto agotado deshabilitado y alertas de mínimo visibles.
- Tablas desplazables dentro de su contenedor; navegación plegable y carrito completo en móvil.
- Ilustraciones SVG originales sin depender de fotografías externas.
- Estados de demostración visibles y ayuda centrada en qué puede probar el usuario.
- Tipografías con alternativa local; colores de estado acompañados de texto.

## Criterios de aceptación derivados

Se deben demostrar: venta de efectivo con cambio y descuento; persistencia al recargar; rechazo de sobreventa/cobro duplicado; devolución única; CRUD de catálogo/contactos; recepción única; cierre con diferencia; respaldo inválido rechazado; configuración persistente; exportaciones; ausencia de desbordamiento de página en móvil. Las pruebas automatizadas y sus límites se registran en `VALIDACION.md`.

## Hosting y alcance real

GitHub Pages publica archivos estáticos; no ejecuta un servidor de negocio. [Documentación de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Por ello, esta entrega usa almacenamiento del navegador para una demo de una sucursal y un operador. Una adaptación visual requiere cambios pequeños. La puesta en marcha con personal real, dispositivos concurrentes y dinero real exige trabajo adicional de servidor, seguridad, operación y cumplimiento. Esa diferencia forma parte del diseño y no se oculta con una pantalla de login simulada.
