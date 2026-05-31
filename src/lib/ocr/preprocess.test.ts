import { describe, expect, it } from "vitest";
import { MAX_OCR_LONG_EDGE } from "@/lib/ocr/preprocess";

describe("preprocess", () => {
  it("MAX_OCR_LONG_EDGE는 1500px", () => {
    expect(MAX_OCR_LONG_EDGE).toBe(1500);
  });
});
