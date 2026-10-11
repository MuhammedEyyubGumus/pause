# PAUSE · Adım 1: Kurulum, Veritabanı, Tasarım Sistemi

Bu paket Phase 1'in altyapısıdır. Sonunda şunlar çalışıyor olacak:

- Next.js 16 + Tailwind v4 + shadcn/ui projesi
- Supabase'de 4 tablo, RLS politikaları ve sistem seçenekleri
- Giriş yapmamış kullanıcıyı `/login`'e yönlendiren oturum katmanı
- Ana ekrana eklenebilen PWA (manifest, ikonlar, service worker, offline sayfası)
- `/design` adresinde tasarım sistemi önizlemesi

Gerekenler: Node.js 20.9+, npm, git, bir Supabase hesabı.

---

## 1. Projeyi oluştur

```bash
npx create-next-app@latest pause \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm
cd pause
git init && git add -A && git commit -m "init"   # Serwist sürüm bilgisini git'ten alır
```

Kurulum sihirbazı ek soru sorarsa (React Compiler vb.) varsayılanları kabul et.

## 2. shadcn/ui

```bash
npx shadcn@latest init
```

- Base color sorulursa **Stone** seç (zaten `globals.css`'i birazdan kendi dosyamızla değiştireceğiz).
- `tw-animate-css` otomatik kurulur; `globals.css` bunu kullanıyor.

İlk bileşenler (gerisini ihtiyaç oldukça ekleyeceğiz):

```bash
npx shadcn@latest add button sonner
```

## 3. Paketler

```bash
# Supabase + oturum
npm i @supabase/supabase-js @supabase/ssr server-only

# Tema, animasyon, durum, offline kuyruk, doğrulama, çok dil
npm i next-themes motion zustand @tanstack/react-query dexie zod next-intl

# PWA (Turbopack uyumlu Serwist) + Supabase CLI
npm i -D @serwist/turbopack esbuild serwist supabase
```

## 4. Bu paketteki dosyaları kopyala

Paketteki dosyaları projenin köküne, aynı yollara kopyala. Var olanların üzerine yaz:

| Dosya | Ne yapar |
| --- | --- |
| `next.config.ts` | Serwist + güvenlik başlıkları |
| `.env.local.example` | `.env.local` olarak kopyala ve doldur |
| `src/proxy.ts` | Her istekte oturumu yeniler, girişsiz kullanıcıyı `/login`'e yollar (Next.js 16'da `middleware.ts`'in yeni adı) |
| `src/app/globals.css` | Tasarım sistemi: renkler, tipografi, hareket, yardımcı sınıflar |
| `src/app/fonts.ts` | Plus Jakarta Sans (Türkçe) + IBM Plex Sans Arabic (ileride) |
| `src/app/layout.tsx` | Fontlar, tema, PWA meta etiketleri, Serwist |
| `src/app/manifest.ts` | PWA manifest, SOS kısayolu |
| `src/app/sw.ts`, `src/app/serwist.ts`, `src/app/serwist/[path]/route.ts` | Service worker |
| `src/app/~offline/page.tsx` | İnternet yokken gösterilen sayfa |
| `src/app/(auth)/login/page.tsx` | Geçici giriş sayfası (sonraki adımda gerçeği gelecek) |
| `src/app/design/page.tsx` | Tasarım sistemi önizlemesi (Phase 1 sonunda silinecek) |
| `src/lib/supabase/*` | Tarayıcı, sunucu ve proxy için Supabase istemcileri |
| `public/icons/*` | Geçici uygulama ikonları |
| `supabase/migrations/20261007120000_init.sql` | Veritabanı şeması + RLS |
| `supabase/tests/rls_isolation.sql` | İki kullanıcılı güvenlik testi |

`create-next-app`'in oluşturduğu `src/app/page.tsx` kalabilir; ana sayfa adımında değiştireceğiz.

**TypeScript notu:** `npm run build` sırasında `sw.ts` için "Duplicate identifier" türü bir hata görürsen `tsconfig.json`'daki `exclude` dizisine `"src/app/sw.ts"` ekle. Service worker'ı Serwist kendi derler.

## 5. Supabase projesi

1. [supabase.com](https://supabase.com) → New project. **Region: Central EU (Frankfurt)**. Güçlü bir veritabanı şifresi seç ve sakla.
2. Project Settings → API'den URL ve **publishable** anahtarı al, `.env.local`'a yaz:

   ```bash
   cp .env.local.example .env.local
   ```

3. Migration'ı uygula. İki yol var; birini seç:

   **A) CLI ile (önerilen, migration geçmişi tutulur)**

   ```bash
   npx supabase login
   npx supabase init            # supabase/ klasörü zaten varsa "config.toml" ekler
   npx supabase link --project-ref <proje-ref>   # URL'deki xxxx kısmı
   npx supabase db push
   ```

   **B) Panelden** — SQL Editor'a `20261007120000_init.sql` içeriğini yapıştır ve Run.

4. TypeScript tiplerini üret (sonraki adımlarda kullanacağız):

   ```bash
   mkdir -p src/types
   npx supabase gen types typescript --linked > src/types/database.ts
   ```

## 6. Güvenlik testini çalıştır (atlanmasın)

SQL Editor'a `supabase/tests/rls_isolation.sql` içeriğini yapıştır ve Run.
Sonuç satırında **`TÜM RLS TESTLERİ GEÇTİ`** görmelisin. Test her şeyi geri aldığı için veritabanında iz bırakmaz.

Test şunları doğrular:

- Yeni kullanıcıya profil otomatik açılıyor.
- 8 → 4 kaydında `urge_change = -4` hesaplanıyor; sonuç seçilince kanonik sınıf kendiliğinden doluyor.
- B kullanıcısı A'nın davranışını, olayını, özel seçeneğini **göremiyor, değiştiremiyor, silemiyor**.
- B, A adına kayıt **ekleyemiyor**; kendi olayını A'nın davranışına veya A'nın seçeneğine **bağlayamıyor**; kaydını A'ya **devredemiyor**.
- B sistem seçeneklerini görebiliyor ama değiştiremiyor.
- Giriş yapmamış (anon) kullanıcı hiçbir tabloyu okuyamıyor.

Bu migration ve test dosyası, Supabase'in auth şemasını taklit eden yerel bir PostgreSQL 16 üzerinde çalıştırılıp geçti.

## 7. Çalıştır ve dene

```bash
npm run dev
```

- `http://localhost:3000` → `/login`'e yönlenmeli (oturum katmanı çalışıyor).
- `http://localhost:3000/design` → tasarım sistemi önizlemesi. Kontrol et:
  - Zemin sıcak kum tonunda, saf beyaz değil.
  - Slider'ı 0'dan 10'a çek: küre rengi açık kumdan sıcak amber tonuna geçmeli, kırmızıya dönmemeli; rakam genişlik değiştirmemeli.
  - Duygu kartları basınca hafifçe küçülmeli, seçilince teal çerçeve almalı.
  - İşletim sisteminin koyu temasını aç: tüm sayfa lacivert-gri gece moduna geçmeli.
- PWA'yı denemek için üretim derlemesi gerekir (geliştirme modunda service worker devre dışı olabilir):

  ```bash
  npm run build && npm start
  ```

  Chrome DevTools → Application → Manifest ve Service Workers sekmelerinde hata olmamalı.

**Telefonda deneme:** Vercel'e deploy etmek en kolayı (`npx vercel`, ortam değişkenlerini Vercel paneline de ekle). iPhone'da Safari → Paylaş → Ana Ekrana Ekle; Android'de Chrome menüsü → Uygulamayı yükle. Android'de ikona uzun basınca "Çok güçlü dürtü" kısayolu görünmeli (sayfası henüz yok, sonraki adımlarda gelecek).

---

## Klasör yapısı

Bu adımda oluşturulanlar ✓ ile işaretli; diğerleri sonraki adımlarda gelecek.

```
pause/
├── next.config.ts ✓
├── .env.local.example ✓
├── messages/                       # tr.json, en.json (i18n adımı)
├── public/
│   └── icons/ ✓                  # geçici ikonlar
├── supabase/
│   ├── migrations/ ✓             # 001 init; 002 event_emotions, event_triggers, event_interventions ...
│   └── tests/ ✓                  # RLS izolasyon testleri
└── src/
    ├── proxy.ts ✓                # oturum yenileme + giriş koruması
    ├── app/
    │   ├── globals.css ✓         # tasarım sistemi
    │   ├── fonts.ts ✓
    │   ├── layout.tsx ✓
    │   ├── manifest.ts ✓
    │   ├── sw.ts ✓ · serwist.ts ✓ · serwist/[path]/route.ts ✓
    │   ├── ~offline/ ✓
    │   ├── design/ ✓             # token önizlemesi (geçici)
    │   ├── (auth)/                 # login, verify
    │   ├── (onboarding)/           # 6 onboarding ekranı
    │   ├── (app)/                  # alt navigasyonlu sekmeler
    │   │   ├── page.tsx            # Ana Sayfa
    │   │   ├── history/
    │   │   ├── insights/           # Phase 2
    │   │   └── settings/
    │   ├── (flow)/                 # tam ekran, navigasyonsuz akışlar
    │   │   ├── urge/               # davranış → şiddet → pause → sorular
    │   │   ├── pause/[eventId]/    # timer, alternatifler, yeniden ölçüm, sonuç
    │   │   └── sos/
    │   └── api/                    # export, push abonelik (sunucu tarafı)
    ├── components/
    │   ├── ui/                     # shadcn bileşenleri
    │   └── pause/                  # StepShell, BigSlider, ChoiceCard, TimerRing ...
    ├── features/                   # özellik bazlı mantık + ekranlar
    │   ├── onboarding/
    │   ├── urge-flow/              # akış durumu (zustand), adımlar
    │   ├── pause/                  # pause saati, yeniden ölçüm
    │   ├── interventions/          # breathe/, change-place/, urge-surf/, now-later-delegate/
    │   └── history/
    ├── lib/
    │   ├── supabase/ ✓           # client.ts, server.ts, proxy.ts
    │   ├── offline/                # dexie veritabanı + gönderilecekler kuyruğu
    │   └── time/                   # pause saati hesapları, yerel saat
    └── types/
        └── database.ts             # supabase gen types çıktısı
```

**Neden `features/`?** Ekranlar `app/` altında ince kalır; asıl mantık (ör. dürtü akışının durumu, nefes egzersizi) özellik klasöründe birlikte yaşar. Bir alternatifi eklemek veya çıkarmak tek klasöre dokunmak demek.

---

## Bilinçli kararlar ve notlar

- **`tailwind.config.ts` yok.** Tailwind v4'te tüm token'lar `globals.css` içindeki `@theme` bloklarında.
- **Kırmızı kullanılmıyor.** `destructive` yumuşak bir terrakota ve yalnızca gerçek sistem hataları için. Davranış gerçekleştiğinde hiçbir ekran bu rengi kullanmamalı.
- **Şiddet rengi** `bg-urge` sınıfıyla, elementte `style={{ "--urge": 8 }}` verilerek hesaplanır; 0–10 arası tek renk ailesinde kayar.
- **Yeni tablolar sonraki migration'da:** `event_emotions`, `event_triggers`, `event_interventions` (dürtü akışı adımında). Bu 4 tablo ve sistem seçenekleri o adımın temeli.
- **Ortam değişkeni adı:** Supabase panelinde yalnızca eski tip "anon" anahtarı görüyorsan, onu `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`'e yazman yeterli; ikisi de aynı işi görür.
- **Doğrulanamayan kısım:** Bu ortamda npm kayıt defterine erişim kısıtlı olduğu için `globals.css` Tailwind derleyicisinde test edilemedi ve Next.js projesi derlenmedi. `npm run dev` sırasında bir hata çıkarsa mesajı aynen gönder, hemen düzelteyim.
