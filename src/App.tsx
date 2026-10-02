import { useState, useRef, useEffect, lazy, Suspense } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  ReceiptText,
  Users,
  Truck,
  ShoppingCart,
  Wallet,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Store,
} from "lucide-react";
import { WorkspaceContext } from "./context";
import { type State } from "./model";
import { localRepository, STORAGE_KEY, download } from "./storage";
import { Modal } from "./ui";
const Dashboard = lazy(() => import("./Dashboard"));
const Pos = lazy(() => import("./Pos"));
const Inventory = lazy(() => import("./Inventory"));
const Contacts = lazy(() => import("./Contacts"));
const Sales = lazy(() =>
  import("./Operations").then((m) => ({ default: m.Sales })),
);
const Purchases = lazy(() =>
  import("./Operations").then((m) => ({ default: m.Purchases })),
);
const Cash = lazy(() =>
  import("./Operations").then((m) => ({ default: m.Cash })),
);
const Reports = lazy(() => import("./Reports"));
const Settings = lazy(() => import("./Settings"));
const navigation = [
  { id: "dashboard", label: "Resumen", icon: LayoutDashboard },
  { id: "pos", label: "Punto de venta", icon: ShoppingBag },
  { id: "inventory", label: "Inventario", icon: Package },
  { id: "sales", label: "Ventas", icon: ReceiptText },
  { id: "customers", label: "Clientes", icon: Users },
  { id: "suppliers", label: "Proveedores", icon: Truck },
  { id: "purchases", label: "Compras", icon: ShoppingCart },
  { id: "cash", label: "Caja", icon: Wallet },
  { id: "reports", label: "Reportes", icon: ChartNoAxesCombined },
];
export default function App() {
  const [boot] = useState(() => {
    try {
      return { state: localRepository.load(), error: "" };
    } catch {
      return {
        state: null,
        error:
          "No pudimos leer los datos guardados. No se han reemplazado. Descarga una copia para recuperarlos o reinicia la demo.",
      };
    }
  });
  const [state, setState] = useState<State | null>(boot.state),
    [page, setPage] = useState(() => location.hash.slice(1) || "dashboard"),
    [menu, setMenu] = useState(false),
    [help, setHelp] = useState(false),
    [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const ref = useRef(state),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function notify(text: string, error = false) {
    if (error)
      window.dispatchEvent(
        new CustomEvent("brisa-form-error", { detail: text }),
      );
    if (timer.current) clearTimeout(timer.current);
    setToast({ text, error });
    timer.current = setTimeout(() => setToast(null), 5500);
  }
  useEffect(() => {
    function hash() {
      setPage(location.hash.slice(1) || "dashboard");
    }
    function changed(e: StorageEvent) {
      if (e.key === STORAGE_KEY)
        try {
          const next = localRepository.load();
          ref.current = next;
          setState(next);
          notify(
            "Datos actualizados desde otra pestaña. Revisa tu carrito antes de cobrar.",
          );
        } catch {
          notify("No se pudieron leer los cambios de otra pestaña.", true);
        }
    }
    window.addEventListener("hashchange", hash);
    window.addEventListener("storage", changed);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("storage", changed);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    document.title = `${state?.settings.name || "Brisa"} · ${navigation.find((n) => n.id === page)?.label || "Configuración"}`;
  }, [page, state?.settings.name]);
  function navigate(next: string) {
    location.hash = next;
    setPage(next);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function mutate(action: (s: State) => void, message = "Cambios guardados") {
    try {
      const current = ref.current!;
      const next = structuredClone(current);
      action(next);
      const saved = localRepository.save(next, current.revision);
      ref.current = saved;
      setState(saved);
      notify(message);
      return true;
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message.startsWith("[")
            ? "Revisa los campos: algunos datos no son válidos."
            : e.message
          : "No se pudo guardar. Revisa el espacio del navegador.",
        true,
      );
      return false;
    }
  }
  if (!state)
    return (
      <div className="recovery">
        <AlertCircle size={40} />
        <h1>Tus datos necesitan atención</h1>
        <p>{boot.error}</p>
        <button
          className="secondary"
          onClick={() => {
            try {
              download(
                "brisa-recuperacion.txt",
                localStorage.getItem(STORAGE_KEY) || "",
              );
            } catch {
              alert("El navegador bloquea el acceso al almacenamiento.");
            }
          }}
        >
          Descargar datos originales
        </button>
        <button
          className="danger-button"
          onClick={() => {
            if (
              confirm("¿Eliminar los datos locales y cargar la demostración?")
            ) {
              localStorage.removeItem(STORAGE_KEY);
              location.reload();
            }
          }}
        >
          Reiniciar demostración
        </button>
      </div>
    );
  const current = navigation.find((n) => n.id === page);
  const initials = state.settings.name.slice(0, 1).toUpperCase();
  return (
    <WorkspaceContext.Provider value={{ state, mutate, notify, navigate }}>
      <div className={`app theme-${state.settings.accent}`}>
        <a
          className="skip-link"
          href="#main"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main")?.focus();
          }}
        >
          Saltar al contenido
        </a>
        {menu ? (
          <button
            className="sidebar-overlay"
            aria-label="Cerrar navegación"
            onClick={() => setMenu(false)}
          />
        ) : null}
        <aside className={`sidebar ${menu ? "is-open" : ""}`}>
          <button
            className="brand"
            onClick={() => navigate("dashboard")}
            aria-label="Ir al resumen"
          >
            <span className="brand-symbol">
              {initials.toLowerCase()}
              <span>·</span>
            </span>
            <div>
              <strong>
                {state.settings.name.toLowerCase()}
                <span>POS</span>
              </strong>
              <small>{state.settings.tagline}</small>
            </div>
          </button>
          <button className="store-switch" onClick={() => navigate("settings")}>
            <span className="store-icon">
              <Store size={18} />
            </span>
            <span>
              <b>{state.settings.branch}</b>
              <small>Sucursal principal</small>
            </span>
            <ChevronDown size={15} />
          </button>
          <div className="nav-label">ESPACIO DE TRABAJO</div>
          <nav aria-label="Navegación principal">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-label={label}
                onClick={() => navigate(id)}
                className={page === id ? "active" : ""}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon size={19} strokeWidth={1.7} />
                <span>{label}</span>
                {id === "pos" ? <span className="nav-shortcut">↗</span> : null}
                {id === "inventory" &&
                state.products.filter((p) => p.active && p.stock <= p.minimum)
                  .length > 0 ? (
                  <span className="nav-count">
                    {
                      state.products.filter(
                        (p) => p.active && p.stock <= p.minimum,
                      ).length
                    }
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="demo-note">
              <span className="live-dot" />
              <b>Tu espacio de prueba</b>
              <p>
                Explora, vende y hazlo tuyo.
                <br />
                Todos los datos son ficticios.
              </p>
              <button onClick={() => setHelp(true)}>
                Conoce el prototipo <ArrowUpRight size={14} />
              </button>
            </div>
            <button
              className={`settings-nav ${page === "settings" ? "active" : ""}`}
              onClick={() => navigate("settings")}
            >
              <SettingsIcon size={19} />
              Configuración
            </button>
            <div className="profile">
              <div className="avatar">{initials}</div>
              <div>
                <b>Administrador demo</b>
                <small>Sesión de demostración</small>
              </div>
              <span className="profile-dot" />
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div>
              <button
                className="icon-button mobile-menu"
                aria-label="Abrir menú"
                onClick={() => setMenu(true)}
              >
                <Menu size={22} />
              </button>
              <span className="breadcrumb">
                Mi negocio <span>/</span>{" "}
                <b>{current?.label || "Configuración"}</b>
              </span>
            </div>
            <div className="topbar-actions">
              <span className="local-indicator">
                <span className="live-dot" />
                Guardado en este navegador
              </span>
              <span className="demo-badge">DEMO</span>
              <button
                className="icon-button"
                aria-label="Ayuda del prototipo"
                onClick={() => setHelp(true)}
              >
                <HelpCircle size={19} />
              </button>
              <div className="avatar small-avatar">{initials}</div>
            </div>
          </header>
          <main id="main" tabIndex={-1}>
            <Suspense
              fallback={<div className="loading">Preparando tu espacio…</div>}
            >
              {page === "pos" ? (
                <Pos />
              ) : page === "inventory" ? (
                <Inventory />
              ) : page === "sales" ? (
                <Sales />
              ) : page === "customers" ? (
                <Contacts key="customers" kind="customers" />
              ) : page === "suppliers" ? (
                <Contacts key="suppliers" kind="suppliers" />
              ) : page === "purchases" ? (
                <Purchases />
              ) : page === "cash" ? (
                <Cash />
              ) : page === "reports" ? (
                <Reports />
              ) : page === "settings" ? (
                <Settings />
              ) : (
                <Dashboard />
              )}
            </Suspense>
            <footer className="app-footer">
              <span>
                {state.settings.name} POS <span>·</span> Hecho para que tu
                negocio fluya.
              </span>
              <span>Prototipo v1.0 / Datos ficticios</span>
            </footer>
          </main>
        </div>
        {toast ? (
          <div
            className={`toast ${toast.error ? "error" : ""}`}
            role={toast.error ? "alert" : "status"}
          >
            {toast.error ? (
              <AlertCircle size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}
            <span>{toast.text}</span>
            <button aria-label="Cerrar aviso" onClick={() => setToast(null)}>
              <X size={16} />
            </button>
          </div>
        ) : null}
        {help ? (
          <Modal
            title="Bienvenido a tu espacio de prueba"
            onClose={() => setHelp(false)}
          >
            <div className="help-content">
              <p>
                Brisa es un negocio ficticio para explorar un punto de venta
                completo y adaptarlo a nuevos comercios.
              </p>
              <ol>
                <li>
                  <b>Haz tu primera venta.</b> Abre Punto de venta, agrega
                  productos y confirma el cobro simulado.
                </li>
                <li>
                  <b>Sigue el movimiento.</b> Revisa el ticket en Ventas y las
                  existencias en Inventario.
                </li>
                <li>
                  <b>Completa el ciclo.</b> Recibe una compra, registra una
                  devolución o cierra la caja.
                </li>
                <li>
                  <b>Hazlo tuyo.</b> Personaliza la marca y las categorías desde
                  Configuración.
                </li>
              </ol>
              <p className="info-box">
                Los datos permanecen en este navegador y no se comparten entre
                dispositivos. No hay acceso privado, pagos reales ni facturación
                fiscal. Descarga un respaldo antes de borrar los datos del
                navegador.
              </p>
              <button
                className="primary full-button"
                onClick={() => {
                  setHelp(false);
                  navigate("pos");
                }}
              >
                Probar una venta <ArrowUpRight size={17} />
              </button>
            </div>
          </Modal>
        ) : null}
      </div>
    </WorkspaceContext.Provider>
  );
}
