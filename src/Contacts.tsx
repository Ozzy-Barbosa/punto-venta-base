import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Users, Truck, Mail } from "lucide-react";
import { useWorkspace } from "./context";
import { type Contact, uid, saveContact, removeContact } from "./model";
import { PageHeading, Modal, Field, Money, Empty } from "./ui";
export default function Contacts({
  kind,
}: {
  kind: "customers" | "suppliers";
}) {
  const { state: s, mutate } = useWorkspace();
  const [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Contact | null | undefined>();
  const customer = kind === "customers";
  const list = s[kind].filter(
    (c) =>
      c.active &&
      `${c.name} ${c.email} ${c.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow={
          customer
            ? "RELACIONES QUE HACEN NEGOCIO"
            : "EL ORIGEN DE TUS PRODUCTOS"
        }
        title={customer ? "Clientes" : "Proveedores"}
        description={
          customer
            ? "Conoce a quienes vuelven y acompaña cada compra."
            : "Mantén a mano a quienes abastecen tu negocio."
        }
      >
        <button className="primary" onClick={() => setEditing(null)}>
          <Plus size={18} />
          Nuevo {customer ? "cliente" : "proveedor"}
        </button>
      </PageHeading>
      <section className="panel">
        <div className="panel-toolbar">
          <h2>
            {customer ? "Directorio de clientes" : "Directorio de proveedores"}{" "}
            <span className="count-chip">{list.length}</span>
          </h2>
          <div className="search-field compact">
            <Search size={18} />
            <input
              placeholder="Buscar nombre o contacto"
              aria-label="Buscar contacto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="contact-grid">
          {list.map((c) => {
            const sales = s.sales.filter(
              (x) => x.customerId === c.id && x.status === "paid",
            );
            return (
              <article className="contact-card" key={c.id}>
                <div className="contact-card-head">
                  <div className="contact-avatar">
                    {c.name
                      .split(" ")
                      .slice(0, 2)
                      .map((x) => x[0])
                      .join("")}
                  </div>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Editar ${c.name}`}
                      onClick={() => setEditing(c)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`Eliminar ${c.name}`}
                      onClick={() => {
                        if (
                          confirm(
                            `¿Eliminar ${c.name} del directorio? Si tiene operaciones, se archivará su registro.`,
                          )
                        )
                          mutate(
                            (next) => removeContact(next, kind, c.id),
                            "Contacto eliminado del directorio",
                          );
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3>{c.name}</h3>
                <p className="contact-email">
                  <Mail size={14} />
                  {c.email || "Sin correo registrado"}
                </p>
                <p className="subtle">{c.phone || "Sin teléfono registrado"}</p>
                <div className="contact-note">
                  {c.note || "Sin notas por ahora."}
                </div>
                <div className="contact-card-foot">
                  <span>
                    {customer ? <Users size={15} /> : <Truck size={15} />}{" "}
                    {customer
                      ? `${sales.length} compras`
                      : `${s.purchases.filter((p) => p.supplierId === c.id).length} órdenes`}
                  </span>
                  {customer ? (
                    <b>
                      <Money
                        value={sales.reduce((n, x) => n + x.total, 0)}
                        state={s}
                      />
                    </b>
                  ) : (
                    <span className="badge green">Activo</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {!list.length ? (
          <Empty
            title="Tu directorio está listo para crecer"
            description="Agrega un contacto o cambia la búsqueda."
          />
        ) : null}
      </section>
      {editing !== undefined ? (
        <Modal
          title={`${editing ? "Editar" : "Nuevo"} ${customer ? "cliente" : "proveedor"}`}
          onClose={() => setEditing(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const c: Contact = {
                id: editing?.id || uid(),
                name: String(f.get("name")).trim(),
                email: String(f.get("email")).trim(),
                phone: String(f.get("phone")).trim(),
                note: String(f.get("note")).trim(),
                active: true,
              };
              if (
                mutate(
                  (next) => saveContact(next, kind, c),
                  "Contacto guardado",
                )
              )
                setEditing(undefined);
            }}
          >
            <div className="form-grid">
              <Field label="Nombre" full>
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={editing?.name}
                />
              </Field>
              <Field label="Correo electrónico">
                <input
                  name="email"
                  type="email"
                  defaultValue={editing?.email}
                />
              </Field>
              <Field label="Teléfono">
                <input
                  name="phone"
                  maxLength={40}
                  defaultValue={editing?.phone}
                />
              </Field>
              <Field label="Notas" full>
                <textarea
                  name="note"
                  maxLength={500}
                  rows={3}
                  defaultValue={editing?.note}
                />
              </Field>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </button>
              <button className="primary">Guardar contacto</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
