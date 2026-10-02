import { afterEach, describe, expect, it, vi } from "vitest";
import { localRepository, STORAGE_KEY, csv } from "./storage";
function fakeStorage() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
  vi.stubGlobal("localStorage", storage);
  return storage;
}
afterEach(() => vi.unstubAllGlobals());
describe("local persistence", () => {
  it("rejects stale writers and preserves newer data", () => {
    fakeStorage();
    const initial = localRepository.load();
    const updated = structuredClone(initial);
    updated.settings.name = "Nueva marca";
    localRepository.save(updated, initial.revision);
    expect(() => localRepository.save(initial, initial.revision)).toThrow(
      "otra pestaña",
    );
    expect(localRepository.load().settings.name).toBe("Nueva marca");
  });
  it("does not silently replace corrupted data", () => {
    const storage = fakeStorage();
    storage.setItem(STORAGE_KEY, "broken");
    expect(() => localRepository.load()).toThrow();
    expect(storage.getItem(STORAGE_KEY)).toBe("broken");
  });
  it("reports failed writes without changing original state", () => {
    const storage = fakeStorage();
    const s = localRepository.load();
    storage.setItem = () => {
      throw Error("Quota exceeded");
    };
    const next = structuredClone(s);
    next.settings.name = "Not saved";
    expect(() => localRepository.save(next, s.revision)).toThrow();
    expect(localRepository.load().settings.name).toBe("Brisa");
  });
  it("escapes CSV content and common formula prefixes", () => {
    expect(csv([["=1+1", 'a"b', "normal"]])).toContain(
      '"\'=1+1","a""b","normal"',
    );
  });
});
