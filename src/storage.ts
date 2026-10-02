import { validateState, type State } from "./model";
import { makeSeed } from "./seed";
export const STORAGE_KEY = "brisa-pos-v1";
export interface Repository {
  load(): State;
  save(next: State, expectedRevision: number): State;
}
export const localRepository: Repository = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = makeSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return validateState(JSON.parse(raw));
  },
  save(next, expectedRevision) {
    const raw = localStorage.getItem(STORAGE_KEY);
    const current = raw ? validateState(JSON.parse(raw)) : null;
    if (current && current.revision !== expectedRevision)
      throw new Error(
        "Los datos cambiaron en otra pestaña. Recarga para continuar.",
      );
    const valid = validateState({ ...next, revision: expectedRevision + 1 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    return valid;
  },
};
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: (string | number)[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n")
  );
}
