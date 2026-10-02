# Registro de validación

Fecha: 1 de octubre de 2026. Entorno local: Windows, Node 24 y Microsoft Edge Chromium controlado con Playwright. Datos sintéticos, sin pagos ni comunicaciones reales.

## Resultado local

| Comprobación | Resultado |
|---|---|
| TypeScript y compilación de producción | Correcta |
| Pruebas del motor y persistencia | 24/24 aprobadas |
| Recorridos en navegador | 12/12 aprobados: 6 en escritorio y 6 en móvil |
| Escritorio | 1440 × 1000 |
| Móvil emulado | 390 × 844, interacción táctil |
| Revisión visual | Capturas de resumen y catálogo inspeccionadas |
| Dependencias | `npm audit`: 0 vulnerabilidades conocidas tras actualizar Vitest |

## Comportamientos comprobados

- Venta con descuento, efectivo suficiente y cambio; persistencia después de recargar.
- Ticket visible en modo de impresión, ocultando la interfaz de trabajo.
- Devolución única con motivo, restauración de stock y registro correcto de caja.
- Prohibición de sobreventa, unidades fraccionarias, cobro con caja cerrada y solicitud de venta repetida.
- Doble clic en confirmar produce un único ticket.
- Datos de ticket independientes de cambios posteriores de nombre, precio y costo.
- Alta, edición, ajuste, archivo y restauración de producto; SKU único comprobado en el motor.
- Clientes y proveedores con conservación de relaciones históricas.
- Creación de compra, recepción única, costo actualizado y bloqueo de archivo con compras pendientes.
- Apertura, entradas, salidas, cierre con diferencia y reapertura de caja.
- Búsqueda exacta por SKU con Enter, guardado de carrito y recuperación tras recargar.
- Configuración persistente, descarga de JSON y CSV.
- Restauración de JSON válido y rechazo de respaldo inválido sin reemplazar los datos actuales.
- Rechazo de escritor con revisión desactualizada; preservación de datos corruptos y aviso de fallo de escritura.
- Reportes con devoluciones atribuidas a su fecha y costos históricos.
- Escape cierra modales; las acciones con iconos tienen nombres accesibles.
- Páginas sin desbordamiento horizontal del documento; tablas anchas se desplazan en su contenedor.
- Sin errores JavaScript observados en los recorridos de venta y navegación instrumentados.

## Correcciones verificadas

La revisión detectó y corrigió un catálogo móvil que podía ensanchar el área visible con un carrito activo. Se fijó el ancho mínimo de la cuadrícula y se comprobó el ancho del documento contra el ancho real de su ventana. Se ajustaron formularios y modales para mantener controles accesibles. Se corrigió el estilo de impresión para no ocultar el ticket junto con la interfaz. Las gráficas ahora permiten representar ventas netas negativas por devoluciones.

## Evidencia visual

- [Resumen de escritorio](images/escritorio-resumen.png)
- [Punto de venta de escritorio](images/escritorio-venta.png)
- [Resumen móvil](images/movil-resumen.png)
- [Punto de venta móvil](images/movil-venta.png)

## Límites de la verificación

Pruebas sobre Chromium/Edge; no sustituyen pruebas en Safari, Firefox, equipos físicos ni una auditoría completa de accesibilidad. Se comprobó el diseño de impresión en navegador, no una impresora térmica real. La entrada de SKU se probó como teclado, no con hardware de escaneo. No se han validado cargas multiusuario, pasarelas de pago ni facturación fiscal, que no forman parte de esta demo.

## Publicación

- Repositorio público: [Ozzy-Barbosa/punto-venta-base](https://github.com/Ozzy-Barbosa/punto-venta-base).
- Aplicación: [Brisa POS](https://ozzy-barbosa.github.io/punto-venta-base/), HTTP 200 y HTTPS habilitado.
- Versión de aplicación comprobada: `10b63f60b316ef51b20c6eda92a39c7499a62496`.
- [Despliegue 36957798479](https://github.com/Ozzy-Barbosa/punto-venta-base/actions/runs/36957798479): finalizado con éxito; pruebas del motor y compilación también ejecutadas en GitHub.
- Archivos principales publicados cotejados contra la compilación local: `index-DojdQ3Hc.css` y `index-D_hVt3bV.js`, coincidencia confirmada; hoja de estilo responde HTTP 200.
- **Los 12 recorridos de navegador se repitieron contra la URL pública y aprobaron (45,4 s)**: 6 en escritorio y 6 en móvil, incluidos venta/devolución, inventario, compras/caja, configuración/exportación, restauración y doble clic.
- Las pruebas públicas usaron contextos aislados de navegador y solamente cambiaron sus datos locales de demostración. No hubo cargos, correos ni modificaciones a información de otros visitantes.

Las actualizaciones posteriores que solo añaden este registro documental no cambian los archivos de la aplicación verificada.
