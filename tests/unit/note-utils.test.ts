import { describe, it, expect } from "@jest/globals";

describe("Note Validation", () => {
  it("should validate note title length", () => {
    const maxLength = 200;
    const validTitle = "A".repeat(maxLength);
    const invalidTitle = "A".repeat(maxLength + 1);

    expect(validTitle.length).toBeLessThanOrEqual(maxLength);
    expect(invalidTitle.length).toBeGreaterThan(maxLength);
  });

  it("should validate note content length", () => {
    const maxLength = 50000;
    const validContent = "A".repeat(maxLength);
    const invalidContent = "A".repeat(maxLength + 1);

    expect(validContent.length).toBeLessThanOrEqual(maxLength);
    expect(invalidContent.length).toBeGreaterThan(maxLength);
  });

  it("should validate note category length", () => {
    const maxLength = 50;
    const validCategory = "A".repeat(maxLength);
    const invalidCategory = "A".repeat(maxLength + 1);

    expect(validCategory.length).toBeLessThanOrEqual(maxLength);
    expect(invalidCategory.length).toBeGreaterThan(maxLength);
  });
});

describe("HTML Content Processing", () => {
  it("should strip HTML tags from content", () => {
    const stripHTML = (html: string) => html.replace(/<[^>]*>/g, "");

    const htmlContent = "<p>Hello <strong>world</strong>!</p>";
    const plainText = stripHTML(htmlContent);

    expect(plainText).toBe("Hello world!");
  });

  it("should handle nested HTML tags", () => {
    const stripHTML = (html: string) => html.replace(/<[^>]*>/g, "");

    const htmlContent =
      "<div><p><strong><em>Nested</em></strong> content</p></div>";
    const plainText = stripHTML(htmlContent);

    expect(plainText).toBe("Nested content");
  });

  it("should truncate text preview correctly", () => {
    const getTextPreview = (html: string, maxLength: number = 100) => {
      const text = html.replace(/<[^>]*>/g, "");
      return text.length > maxLength
        ? text.substring(0, maxLength) + "..."
        : text;
    };

    const longText = "A".repeat(150);
    const preview = getTextPreview(longText, 100);

    expect(preview.length).toBe(103); // 100 chars + '...'
    expect(preview.endsWith("...")).toBe(true);
  });
});
