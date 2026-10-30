// Wire encoding only. Encryption and authorization happen exclusively on the server.
export function encodeCredential(value: string) {
  return `utf8:${btoa(String.fromCharCode(...new TextEncoder().encode(value)))}`;
}
export function decodeCredential(value: string) {
  return value.startsWith('utf8:')
    ? new TextDecoder().decode(Uint8Array.from(atob(value.slice(5)), byte => byte.charCodeAt(0)))
    : atob(value);
}
