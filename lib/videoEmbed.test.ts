import { describe, expect, it } from "vitest";
import { toYoutubeEmbedUrl } from "./videoEmbed";

describe("toYoutubeEmbedUrl", () => {
  it("handles watch URLs", () => {
    expect(toYoutubeEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("handles youtu.be short links", () => {
    expect(toYoutubeEmbedUrl("https://youtu.be/abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("handles shorts links", () => {
    expect(toYoutubeEmbedUrl("https://www.youtube.com/shorts/abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("passes through already-embedded links", () => {
    expect(toYoutubeEmbedUrl("https://www.youtube.com/embed/abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("returns null for non-YouTube hosts", () => {
    expect(toYoutubeEmbedUrl("https://www.hudl.com/video/abc123")).toBeNull();
  });

  it("returns null for malformed URLs", () => {
    expect(toYoutubeEmbedUrl("not a url")).toBeNull();
  });
});
