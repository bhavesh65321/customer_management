import { parseApiError, friendlyAuthError } from "./apiError";

describe("parseApiError", () => {
  it("returns fallback when data is empty", () => {
    expect(parseApiError({}, "Fallback")).toBe("Fallback");
  });

  it("extracts top-level detail string", () => {
    expect(parseApiError({ detail: "Not found" }, "Fallback")).toBe("Not found");
  });

  it("extracts first FastAPI validation error message", () => {
    const data = { detail: [{ msg: "field required" }] };
    expect(parseApiError(data, "Fallback")).toBe("field required");
  });

  it("extracts message field", () => {
    expect(parseApiError({ message: "Bad request" }, "Fallback")).toBe("Bad request");
  });

  it("extracts error field", () => {
    expect(parseApiError({ error: "Unauthorized" }, "Fallback")).toBe("Unauthorized");
  });

  it("returns fallback for null input", () => {
    expect(parseApiError(null, "Fallback")).toBe("Fallback");
  });

  it("returns fallback for undefined input", () => {
    expect(parseApiError(undefined, "Fallback")).toBe("Fallback");
  });
});

describe("friendlyAuthError", () => {
  it("maps 401 to friendly message", () => {
    const result = friendlyAuthError(401, {});
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("maps 403 to friendly message", () => {
    const result = friendlyAuthError(403, {});
    expect(typeof result).toBe("string");
  });

  it("falls back to parseApiError for unknown codes", () => {
    const result = friendlyAuthError(500, { detail: "Server error" }, "Fallback");
    expect(result).toBe("Server error");
  });
});
