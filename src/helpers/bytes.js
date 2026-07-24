// Conversione byte <-> base64 per scrivere/leggere il documento Automerge
// (binario) tramite Capacitor Filesystem, che lavora per stringhe.
// A chunk perché String.fromCharCode(...bytes) con spread diretto può
// superare il limite di argomenti dello stack su array grandi.
const CHUNK_SIZE = 0x8000;

export function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
