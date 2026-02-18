import { describe, expect, it } from "bun:test";
import { messages } from "@/lib/i18n/messages";

describe("i18n message coverage", () => {
  it("zh-TW should contain all keys from en", () => {
    const enKeys = Object.keys(messages.en).sort();
    const zhKeys = Object.keys(messages["zh-TW"]).sort();

    expect(zhKeys).toEqual(enKeys);
  });

  it("en should contain all keys from zh-TW", () => {
    const enKeys = Object.keys(messages.en).sort();
    const zhKeys = Object.keys(messages["zh-TW"]).sort();

    expect(enKeys).toEqual(zhKeys);
  });
});
