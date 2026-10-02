import { useState, useRef } from "react";
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Plus,
  X,
  Store,
  Database,
  Palette,
  BookOpen,
} from "lucide-react";
import { useWorkspace } from "./context";
import { stateSchema, validateState } from "./model";
import { makeSeed } from "./seed";
import { download, STORAGE_KEY } from "./storage";
import { PageHeading, Field, SectionTitle, Modal } from "./ui";
export default function Settings() {
  const { state: s, mutate, notify } = useWorkspace();
  const [category, setCategory] = useState(""),
    [reset, setReset] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function importFile(file: File) {
    try {
      if (file.size > 10 * 1024 * 1024) throw Error("El archivo excede 10 MB.");
      const data = validateState(JSON.parse(await file.text()));
      if (
        confirm(
          `¿Restaurar el respaldo de ${data.settings.name}? Reemplazará los datos de este navegador. Se descargará antes una copia de los datos actuales.`,
        )
      ) {
        download("brisa-antes-de-restaurar.json", JSON.stringify(s, null, 2));
        mutate((next) => {
          Object.assign(next, data, { revision: next.revision });
        }, "Respaldo restaurado");
      }
    } catch {
      notify(
        "Respaldo inválido. Revisa el formato, los importes y las relaciones de los datos.",
        true,
      );
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="TU NEGOCIO, A TU MANERA"
        title="Configuración"
        description="Un prototipo preparado para llevar el nombre de tu próximo proyecto."
      />
      <div className="settings-grid">
        <section className="panel">
          <SectionTitle title="Perfil del negocio">
            <Store size={19} />
          </SectionTitle>
          <form
            className="settings-form"
            key={`${s.settings.name}-${s.settings.currency}`}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const profile = stateSchema.shape.settings.parse({
                  name: String(f.get("name")).trim(),
                  tagline: String(f.get("tagline")).trim(),
                  branch: String(f.get("branch")).trim(),
                  currency: String(f.get("currency")),
                  taxRate: Number(f.get("taxRate")),
                  accent: String(f.get("accent")),
                  footer: String(f.get("footer")).trim(),
                });
                if (
                  profile.currency !== s.settings.currency &&
                  (s.sales.length || s.sessions.length)
                )
                  throw Error(
                    "Para cambiar moneda, inicia un proyecto nuevo con un perfil y datos de origen en esa moneda. No se convierten ventas ni caja históricas.",
                  );
                mutate((next) => {
                  next.settings = profile;
                }, "Configuración guardada");
              } catch (e) {
                notify((e as Error).message, true);
              }
            }}
          >
            <div className="form-grid">
              <Field label="Nombre comercial">
                <input
                  name="name"
                  required
                  defaultValue={s.settings.name}
                  maxLength={50}
                />
              </Field>
              <Field label="Descripción corta">
                <input
                  name="tagline"
                  defaultValue={s.settings.tagline}
                  maxLength={80}
                />
              </Field>
              <Field label="Sucursal" full>
                <input
                  name="branch"
                  required
                  defaultValue={s.settings.branch}
                  maxLength={100}
                />
              </Field>
              <Field label="Moneda">
                <select name="currency" defaultValue={s.settings.currency}>
                  <option>MXN</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </Field>
              <Field label="Impuesto incluido (%)">
                <input
                  name="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  defaultValue={s.settings.taxRate}
                />
              </Field>
              <Field label="Color del espacio">
                <select name="accent" defaultValue={s.settings.accent}>
                  <option value="forest">Bosque</option>
                  <option value="ocean">Océano</option>
                  <option value="plum">Ciruela</option>
                </select>
              </Field>
              <Field label="Mensaje del ticket" full>
                <textarea
                  name="footer"
                  maxLength={200}
                  rows={2}
                  defaultValue={s.settings.footer}
                />
              </Field>
            </div>
            <p className="subtle">
              La tasa del 16% es una configuración de demostración, no una
              determinación fiscal. Se desglosa del precio final; aplica a
              nuevas ventas. La moneda se fija al crear cada proyecto.
            </p>
            <div className="form-actions">
              <button className="primary">
                <Save size={16} />
                Guardar cambios
              </button>
            </div>
          </form>
        </section>
        <div className="settings-stack">
          <section className="panel">
            <SectionTitle title="Categorías">
              <Palette size={19} />
            </SectionTitle>
            <div className="settings-body">
              <div className="category-chips">
                {s.categories.map((c) => (
                  <span key={c}>
                    {c}
                    <button
                      aria-label={`Eliminar categoría ${c}`}
                      onClick={() => {
                        if (s.products.some((p) => p.category === c)) {
                          notify(
                            "Esta categoría tiene productos, incluidos los archivados. Cámbialos de categoría primero.",
                            true,
                          );
                          return;
                        }
                        mutate((next) => {
                          next.categories = next.categories.filter(
                            (x) => x !== c,
                          );
                        }, "Categoría eliminada");
                      }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const c = category.trim();
                  if (!c) return;
                  if (
                    s.categories.some(
                      (x) => x.toLowerCase() === c.toLowerCase(),
                    )
                  ) {
                    notify("La categoría ya existe.", true);
                    return;
                  }
                  if (
                    mutate((next) => {
                      next.categories.push(c);
                    }, "Categoría creada")
                  )
                    setCategory("");
                }}
              >
                <input
                  aria-label="Nueva categoría"
                  placeholder="Nueva categoría"
                  value={category}
                  maxLength={50}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <button className="secondary" aria-label="Agregar categoría">
                  <Plus size={17} />
                </button>
              </form>
            </div>
          </section>
          <section className="panel">
            <SectionTitle title="Tus datos">
              <Database size={19} />
            </SectionTitle>
            <div className="settings-body">
              <p>
                La información se guarda en este navegador. Descarga un respaldo
                para conservarla o trasladarla a otro dispositivo.
              </p>
              <div className="backup-actions">
                <button
                  className="secondary"
                  onClick={() =>
                    download("brisa-respaldo.json", JSON.stringify(s, null, 2))
                  }
                >
                  <Download size={17} />
                  Descargar respaldo
                </button>
                <button
                  className="secondary"
                  onClick={() => input.current?.click()}
                >
                  <Upload size={17} />
                  Restaurar respaldo
                </button>
                <input
                  ref={input}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importFile(f);
                  }}
                />
              </div>
              <button
                className="text-link danger"
                onClick={() => setReset(true)}
              >
                <RotateCcw size={15} />
                Restablecer demostración
              </button>
            </div>
          </section>
          <section className="about-card">
            <BookOpen size={22} />
            <div>
              <h3>Una base para construir</h3>
              <p>
                Versión 1.0 · Demo local con datos ficticios. Incluye
                inventario, ventas y caja. Para operar un negocio real requiere
                servidor, acceso seguro y validación fiscal.
              </p>
              <a
                href="https://github.com/Ozzy-Barbosa/punto-venta-base"
                target="_blank"
                rel="noreferrer"
              >
                Ver documentación y código ↗
              </a>
            </div>
          </section>
        </div>
      </div>
      {reset ? (
        <Modal
          title="Restablecer la demostración"
          onClose={() => setReset(false)}
        >
          <p>
            Se reemplazarán productos, ventas, clientes y configuración de este
            navegador. Descarga primero un respaldo si deseas conservarlos.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (f.get("confirm") !== "RESTABLECER") {
                notify("Escribe RESTABLECER para continuar.", true);
                return;
              }
              if (
                mutate(
                  (next) =>
                    Object.assign(next, makeSeed(), {
                      revision: next.revision,
                    }),
                  "Demostración restablecida",
                )
              ) {
                localStorage.removeItem("brisa-cart-v1");
                setReset(false);
              }
            }}
          >
            <Field label="Escribe RESTABLECER">
              <input name="confirm" required autoComplete="off" />
            </Field>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  download(
                    "brisa-antes-de-reiniciar.json",
                    localStorage.getItem(STORAGE_KEY) || "",
                  )
                }
              >
                Descargar respaldo
              </button>
              <button className="danger-button">Restablecer datos</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
