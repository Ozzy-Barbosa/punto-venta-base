import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Package, ArrowUpRight } from "lucide-react";
import type { Product, State } from "./model";
export const formatMoney = (n: number, currency = "MXN") =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n / 100);
export const formatDate = (at: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(at));
export function ProductArt({
  product,
  small = false,
}: {
  product: Pick<Product, "art" | "category">;
  small?: boolean;
}) {
  const colors: Record<string, string> = {
    "Café y té": "#d7a676",
    Panadería: "#e3b87e",
    Despensa: "#eac98c",
    Bebidas: "#93b4a1",
    Hogar: "#b7b6ce",
  };
  const color = colors[product.category] || "#a3b9ad";
  return (
    <div
      className={`product-art art-${product.art} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 180 140" fill="none">
        <ellipse cx="90" cy="119" rx="45" ry="6" fill="#20372b" opacity=".09" />
        {product.art === "coffee" || product.art === "bag" ? (
          <>
            <path
              d="M62 27h56l7 14-4 70q-30 12-62 0l-4-70Z"
              fill={product.art === "coffee" ? "#967655" : color}
            />
            <path d="M62 27h56l-2 12H64Z" fill="#554d38" opacity=".4" />
            <path d="m57 43 11 10v58l-9 0Z" fill="#fff" opacity=".12" />
            <rect x="69" y="57" width="44" height="42" rx="2" fill="#f8f4e9" />
            <path d="M88 67c12-4 14 12 2 18-12 4-14-12-2-18Z" fill="#3d6150" />
            <path d="m87 82 8-12" stroke="#f8f4e9" />
            <path d="M78 92h27" stroke="#a6aa91" strokeWidth="2" />
          </>
        ) : null}
        {product.art === "jar" ? (
          <>
            <rect x="60" y="40" width="61" height="72" rx="13" fill={color} />
            <rect x="59" y="29" width="63" height="19" rx="5" fill="#66735a" />
            <path d="M65 34h51M65 39h51" stroke="#f8f4e9" opacity=".3" />
            <rect x="61" y="60" width="59" height="36" fill="#f5f0df" />
            <circle cx="90" cy="77" r="10" stroke="#7b8d60" strokeWidth="2" />
            <path d="m84 81 12-9" stroke="#7b8d60" />
            <path d="M66 50v8" stroke="#fff" strokeWidth="4" opacity=".3" />
          </>
        ) : null}
        {product.art === "bottle" ? (
          <>
            <path
              d="M79 30h22v15c0 13 16 16 16 29v34q0 8-8 8H72q-8 0-8-8V74c0-13 15-16 15-29Z"
              fill={color}
            />
            <rect x="78" y="23" width="24" height="12" rx="3" fill="#485c4d" />
            <path d="M73 64v42" stroke="#fff" opacity=".25" strokeWidth="5" />
            <path d="M65 72h51v27H65Z" fill="#f8f4e9" />
            <circle cx="90" cy="85" r="8" fill="#bc6c4b" />
            <path d="m86 86 9-4" stroke="#fff" />
          </>
        ) : null}
        {product.art === "bread" ? (
          <>
            <path
              d="M43 96c-18-22 2-36 17-30 2-28 28-25 31-11 15-19 34-6 33 12 18-8 35 12 13 30-24 20-75 21-94-1Z"
              fill="#c88d4b"
            />
            <path
              d="m61 64 9 30m22-38 4 37m26-26-6 28"
              stroke="#f4d5a1"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M47 85q38 29 85-2"
              stroke="#a66c37"
              strokeWidth="3"
              opacity=".3"
            />
          </>
        ) : null}
        {product.art === "cup" ? (
          <>
            <path
              d="M115 59h11c24 0 23 32 0 32h-12"
              stroke="#9c9a85"
              strokeWidth="10"
            />
            <path d="M58 48h61v45q0 22-30 22T58 93Z" fill={color} />
            <ellipse cx="88" cy="48" rx="30" ry="9" fill="#dcdbce" />
            <ellipse cx="88" cy="48" rx="24" ry="5" fill="#715a46" />
            <path
              d="M70 66v25"
              stroke="#fff"
              opacity=".25"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </>
        ) : null}
        {product.art === "box" ? (
          <>
            <path d="m57 37 54-9 13 12v72l-56 9-11-10Z" fill={color} />
            <path d="m57 37 11 12 56-9-13-12Z" fill="#fff" opacity=".3" />
            <path d="m68 49 56-9v72l-56 9Z" fill="#3c6350" />
            <path d="m76 61 39-5v40l-39 5Z" fill="#eee8d4" />
            <path
              d="m89 84 14-15m-15 7 13 3"
              stroke="#67855c"
              strokeWidth="3"
            />
          </>
        ) : null}
        {product.art === "plant" ? (
          <>
            <path d="M67 81h47l-7 35H73Z" fill="#bf896d" />
            <path
              d="M90 82c-36-2-43-30-36-39 26 0 38 17 36 39Z"
              fill="#73926a"
            />
            <path
              d="M90 82c-5-37 13-52 23-49 10 24 0 40-23 49Z"
              fill="#356d4e"
            />
            <path
              d="M91 82c13-34 33-34 41-26-3 23-21 31-41 26Z"
              fill="#91a878"
            />
          </>
        ) : null}
      </svg>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const handler = (e: Event) => setError((e as CustomEvent<string>).detail);
    window.addEventListener("brisa-form-error", handler);
    return () => window.removeEventListener("brisa-form-error", handler);
  }, []);
  useEffect(() => {
    const d = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    d?.showModal();
    return () => {
      d?.close();
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <header>
        <div>
          <span className="eyebrow">TU ESPACIO DE TRABAJO</span>
          <h2 id="modal-title">{title}</h2>
        </div>
        <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {children}
    </dialog>
  );
}
export function Empty({
  title = "Todavía no hay registros",
  description = "Los nuevos movimientos aparecerán aquí.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <Package size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Money({ value, state }: { value: number; state: State }) {
  return <>{formatMoney(value, state.settings.currency)}</>;
}
export function Stat({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: ReactNode;
  caption: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        {label}
        <span>{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  );
}
export function SectionTitle({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`field ${full ? "full" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
