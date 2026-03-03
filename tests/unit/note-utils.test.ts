import { describe, it, expect } from "@jest/globals";
import { stripHTML, getTextPreview } from "@/app/lib/utils/note";
import { createNoteSchema, updateNoteSchema } from "@/app/lib/validations/note";

// ---------------------------------------------------------------------------
// Zod Schema Validation
// ---------------------------------------------------------------------------

describe("Note Validation (Zod schemas)", () => {
  it("should accept a valid note", () => {
    const result = createNoteSchema.safeParse({
      title: "My Note",
      content: "<p>Hello world</p>",
      category: "Work",
    });
    expect(result.success).toBe(true);
  });

  it("should reject a note with missing title", () => {
    const result = createNoteSchema.safeParse({
      content: "<p>No title</p>",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a note with missing content", () => {
    const result = createNoteSchema.safeParse({
      title: "No content",
    });
    expect(result.success).toBe(false);
  });

  it("should reject title exceeding 200 characters", () => {
    const result = createNoteSchema.safeParse({
      title: "A".repeat(201),
      content: "<p>Content</p>",
    });
    expect(result.success).toBe(false);
  });

  it("should reject content exceeding 50 000 characters", () => {
    const result = createNoteSchema.safeParse({
      title: "Big note",
      content: "A".repeat(50001),
    });
    expect(result.success).toBe(false);
  });

  it("should accept content at exactly 50 000 characters", () => {
    const result = createNoteSchema.safeParse({
      title: "Max note",
      content: "A".repeat(50000),
    });
    expect(result.success).toBe(true);
  });

  it("should reject category exceeding 50 characters", () => {
    const result = createNoteSchema.safeParse({
      title: "Note",
      content: "Content",
      category: "A".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("should allow empty string for category", () => {
    const result = createNoteSchema.safeParse({
      title: "Note",
      content: "Content",
      category: "",
    });
    expect(result.success).toBe(true);
  });

  it("should allow linkedEventId as optional string", () => {
    const result = createNoteSchema.safeParse({
      title: "Note",
      content: "Content",
      linkedEventId: "event-123",
    });
    expect(result.success).toBe(true);
  });

  it("should validate updateNoteSchema with partial fields", () => {
    const result = updateNoteSchema.safeParse({ title: "New title" });
    expect(result.success).toBe(true);
  });

  it("should reject updateNoteSchema with invalid title", () => {
    const result = updateNoteSchema.safeParse({ title: "A".repeat(201) });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HTML Content Processing (real imports from @/app/lib/utils/note)
// ---------------------------------------------------------------------------

describe("HTML Content Processing", () => {
  it("should strip HTML tags from content", () => {
    const htmlContent = "<p>Hello <strong>world</strong>!</p>";
    expect(stripHTML(htmlContent)).toBe("Hello world!");
  });

  it("should handle nested HTML tags", () => {
    const htmlContent =
      "<div><p><strong><em>Nested</em></strong> content</p></div>";
    expect(stripHTML(htmlContent)).toBe("Nested content");
  });

  it("should return empty string for empty input", () => {
    expect(stripHTML("")).toBe("");
  });

  it("should return plain text unchanged", () => {
    expect(stripHTML("No tags here")).toBe("No tags here");
  });

  it("should truncate text preview correctly", () => {
    const longText = "A".repeat(150);
    const preview = getTextPreview(longText, 100);

    expect(preview.length).toBe(103); // 100 chars + '...'
    expect(preview.endsWith("...")).toBe(true);
  });

  it("should not truncate text shorter than maxLength", () => {
    expect(getTextPreview("Short text", 100)).toBe("Short text");
  });

  it("should strip HTML before truncating", () => {
    const html = "<p>" + "B".repeat(200) + "</p>";
    const preview = getTextPreview(html, 50);
    expect(preview).toBe("B".repeat(50) + "...");
  });

  it("should use default maxLength of 100", () => {
    const longPlain = "C".repeat(150);
    const preview = getTextPreview(longPlain);
    expect(preview.length).toBe(103);
  });
});
