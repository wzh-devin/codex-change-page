import { describe, expect, it } from "vitest";

import { doctorFields } from "./systemInspection";

describe("doctorFields", () => {
  it("does not infer Codex validity from platform support alone", () => {
    expect(doctorFields(null)).toEqual({
      codexAvailable: false,
      signatureValid: false,
      nodeValid: false,
      codexVersion: null,
      nodeVersion: null,
    });
    expect(doctorFields({
      pass: true,
      officialAppSignatureValid: true,
      codexVersion: "26.707",
      nodeVersion: "v24.14.0",
    })).toMatchObject({
      codexAvailable: true,
      signatureValid: true,
      nodeValid: true,
      codexVersion: "26.707",
    });
  });
});
