// Web Push gönderimi: dış kütüphane yok, yalnızca standart Web Crypto + fetch.
// Deno (Supabase Edge Functions), Node 20+ ve tarayıcıda aynı şekilde çalışır.
//   RFC 8292: VAPID (gönderen sunucunun kimliği, ES256 imzalı JWT)
//   RFC 8291 + RFC 8188: içerik şifreleme (aes128gcm)

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string };
export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

const enc = new TextEncoder();

// TypeScript 5.7+ Uint8Array'i ArrayBuffer/SharedArrayBuffer olarak ayırıyor;
// Web Crypto ve fetch yalnızca ArrayBuffer ister. Eski/yeni sürümlerin ikisinde de derlensin diye.
const bs = (u: Uint8Array) => u as unknown as BufferSource;

export function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(str.length / 4) * 4, "=");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", bs(ikm), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: bs(salt), info: bs(info) }, key, length * 8);
  return new Uint8Array(bits);
}

// --- VAPID (RFC 8292) -------------------------------------------------------

async function vapidAuthorization(endpoint: string, vapid: VapidKeys): Promise<string> {
  const pub = b64urlDecode(vapid.publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("VAPID public key must be a 65-byte uncompressed P-256 point");

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: vapid.privateKey,
    x: b64urlEncode(pub.slice(1, 33)),
    y: b64urlEncode(pub.slice(33, 65)),
    ext: true,
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64urlEncode(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: vapid.subject,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  // Web Crypto ECDSA imzası zaten JWS'nin istediği r||s (64 bayt) biçiminde
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, bs(enc.encode(unsigned))));
  return `vapid t=${unsigned}.${b64urlEncode(sig)}, k=${vapid.publicKey}`;
}

// --- İçerik şifreleme (RFC 8291, aes128gcm) --------------------------------

export async function encryptPayload(
  payload: Uint8Array,
  p256dh: string,
  authSecret: string,
  // Testlerde sabit değer vermek için; normalde rastgele
  opts: { salt?: Uint8Array; serverKeys?: CryptoKeyPair } = {},
): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(p256dh);
  const auth = b64urlDecode(authSecret);

  const serverKeys =
    opts.serverKeys ??
    ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  const uaKey = await crypto.subtle.importKey("raw", bs(uaPublic), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, serverKeys.privateKey, 256),
  );

  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(auth, ecdhSecret, keyInfo, 32);

  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // Tek kayıt: içerik + 0x02 (son kayıt ayracı)
  const plaintext = concat(payload, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", bs(cek), "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(nonce) }, aesKey, bs(plaintext)));

  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize);
  header[20] = asPublic.length;
  header.set(asPublic, 21);

  return concat(header, ciphertext);
}

// --- Gönderim ---------------------------------------------------------------

export async function sendWebPush(
  sub: PushSubscriptionKeys,
  payload: string,
  vapid: VapidKeys,
  options: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" } = {},
): Promise<Response> {
  const body = await encryptPayload(enc.encode(payload), sub.p256dh, sub.auth);
  return fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(sub.endpoint, vapid),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(options.ttl ?? 900),
      Urgency: options.urgency ?? "high",
    },
    body: bs(body),
  });
}

// Testler için dışa açık
export const _internal = { vapidAuthorization };
