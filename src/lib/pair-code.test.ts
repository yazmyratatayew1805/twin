import { describe, expect, it } from "vitest";
import { histogram } from "./histogram";
import { CODE_LENGTH, CODE_TTL_MS, generateCode, isExpired, isValidCodeFormat, normalizeCode } from "./pair-code";

describe("код проверки пары", () => {
  it("6 символов без похожих букв и цифр (0/O, 1/I)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(isValidCodeFormat(code)).toBe(true);
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it("код, продиктованный как попало, нормализуется", () => {
    expect(normalizeCode(" 4h2 58j ")).toBe("4H258J");
    expect(normalizeCode("4h2-58j")).toBe("4H258J");
    expect(isValidCodeFormat(normalizeCode("4h2 58j"))).toBe(true);
  });

  it("отклоняет неверный формат", () => {
    expect(isValidCodeFormat("ABC")).toBe(false);
    expect(isValidCodeFormat("ABCDE0")).toBe(false); // ноль не из алфавита
    expect(isValidCodeFormat("ABCDEFG")).toBe(false);
  });

  it("код живёт 24 часа", () => {
    const fresh = new Date(Date.now() - CODE_TTL_MS + 60_000).toISOString();
    const old = new Date(Date.now() - CODE_TTL_MS - 60_000).toISOString();
    expect(isExpired({ created_at: fresh })).toBe(false);
    expect(isExpired({ created_at: old })).toBe(true);
  });
});

describe("распределение процентов в админке", () => {
  it("корзины по 10%, 100 попадает в последнюю", () => {
    const b = histogram([0, 5, 9, 10, 55, 99, 100]);
    expect(b).toHaveLength(10);
    expect(b[0].count).toBe(3);
    expect(b[1].count).toBe(1);
    expect(b[5].count).toBe(1);
    expect(b[9]).toEqual({ from: 90, to: 100, count: 2 });
  });
});
