// PAUSE · Bildirim anahtarlarını üretir (bir kez çalıştırılır).
//   node scripts/generate-push-keys.mjs
// Ek paket gerekmez; Node'un yerleşik Web Crypto'sunu kullanır.
// Çıktıdaki ÖZEL anahtarı ve CRON_SECRET'i kimseyle paylaşma, git'e koyma.

const b64url = (bytes) => Buffer.from(bytes).toString("base64url");

const { publicKey, privateKey } = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);
const vapidPublic = b64url(new Uint8Array(await crypto.subtle.exportKey("raw", publicKey)));
const vapidPrivate = (await crypto.subtle.exportKey("jwk", privateKey)).d;
const cronSecret = b64url(crypto.getRandomValues(new Uint8Array(32)));

console.log(`
1) .env.local dosyasına ekle (bu anahtar herkese açık olabilir):

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidPublic}

2) Supabase'e gizli değerleri kaydet (tek satır, terminale yapıştır):

npx supabase secrets set VAPID_PUBLIC_KEY=${vapidPublic} VAPID_PRIVATE_KEY=${vapidPrivate} VAPID_SUBJECT=mailto:SENIN_EPOSTAN CRON_SECRET=${cronSecret}

3) supabase/setup/push_cron.sql içinde CRON_SECRET_BURAYA yazan yere şunu koy:

${cronSecret}
`);
