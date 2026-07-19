import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderMergeTags } from "../merge";

describe("renderMergeTags", () => {
  it("uses value when present", () => {
    assert.equal(renderMergeTags("Hi {{first_name|there}}", { first_name: "Ada" }), "Hi Ada");
  });

  it("uses fallback when empty", () => {
    assert.equal(renderMergeTags("Hi {{first_name|there}}", { first_name: "" }), "Hi there");
  });

  it("escapes HTML in values", () => {
    assert.equal(
      renderMergeTags("{{first_name}}", { first_name: "<script>" }),
      "&lt;script&gt;"
    );
  });
});
