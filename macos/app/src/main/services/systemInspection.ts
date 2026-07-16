export function doctorFields(data: unknown) {
  if (!data || typeof data !== "object") {
    return {
      codexAvailable: false,
      signatureValid: false,
      nodeValid: false,
      codexVersion: null,
      nodeVersion: null,
    };
  }
  const value = data as Record<string, unknown>;
  const codexVersion = typeof value.codexVersion === "string" ? value.codexVersion : null;
  const nodeVersion = typeof value.nodeVersion === "string" ? value.nodeVersion : null;
  return {
    codexAvailable: value.pass === true && Boolean(codexVersion),
    signatureValid: value.officialAppSignatureValid === true,
    nodeValid: value.pass === true && Boolean(nodeVersion),
    codexVersion,
    nodeVersion,
  };
}
