// Gizlilik politikası metni. Uzun hukuki metin çeviri dosyalarına değil buraya konur.
// Herkese açık sürümden önce bir hukukçuya (KVKK / GDPR) kontrol ettirilmeli ve
// iletişim bilgisi eklenmeli.

export const PRIVACY_UPDATED = "2026-10-24";

type Section = { title: string; body: string[] };

export const PRIVACY: Record<"tr" | "en", { title: string; updated: string; intro: string; sections: Section[] }> = {
  tr: {
    title: "Gizlilik",
    updated: "Son güncelleme",
    intro:
      "PAUSE hassas olabilecek davranışlar hakkında kayıt tutmana yardım eder. Bu yüzden verilerin yalnızca senindir: başkası göremez, satılmaz, reklam için kullanılmaz.",
    sections: [
      {
        title: "Hangi verileri saklıyoruz",
        body: [
          "Hesap: e-posta adresin ve istersen yazdığın adın.",
          "Davranışların: seçtiğin ya da eklediğin davranışlar, hedefin ve neden değiştirmek istediğine dair notun.",
          "Dürtü kayıtları: zaman, dürtü şiddeti (önce ve sonra), duygular, tetikleyiciler, denediğin alternatifler, sonuç, davranışa özel sorulara cevaplar ve yazdığın notlar.",
          "Ayarlar: dil, saat dilimi ve bildirim aboneliği (tarayıcının verdiği teknik bir adres).",
          "Geri bildirim: test döneminde gönderdiğin cevaplar ve eklediğin ekran görüntüleri.",
          "Anonim kullanım istatistikleri: hangi ekranın açıldığı, dürtü akışının hangi adımında çıkıldığı, bir alternatifin başlatılıp bitirildiği gibi. Hesabına bağlanmaz, yazdığın hiçbir şeyi ya da davranış, duygu, tetikleyici adlarını içermez; 180 gün sonra silinir. Ayarlar > Verilerin bölümünden kapatabilirsin.",
        ],
      },
      {
        title: "Neden saklıyoruz",
        body: [
          "Yalnızca uygulamayı sana çalıştırmak için: kayıtlarını göstermek, pause süresini cihazlar arasında doğru tutmak, süre dolunca haber vermek ve sana kendi örüntülerini (içgörüler) hesaplamak.",
          "Geri bildirimler yalnızca uygulamayı geliştirmek için okunur.",
        ],
      },
      {
        title: "Nerede ve kimlerle",
        body: [
          "Veritabanı ve dosyalar: Supabase, Avrupa Birliği (Frankfurt) sunucularında.",
          "Uygulamanın sunulması: Vercel; sunucu işlemleri Frankfurt bölgesinde çalışır.",
          "Giriş kodu e-postaları: Google (Gmail) üzerinden gönderilir; e-postada yalnızca giriş kodu bulunur.",
          "Bildirimler: tarayıcının bildirim servisi (Apple, Google veya Mozilla) üzerinden şifreli iletilir. Bildirimde davranışının adı geçmez.",
          "Yapay zekâ yorumu (yalnızca \"Pattern'lerimi analiz et\"e izin verirsen): uygulamanın hesapladığı özet sayılar (kayıt sayısı, oranlar, ortalamalar, en sık tetikleyici/duygu, yoğun saatler) yorum yazılması için Anthropic'in Claude modeline gönderilir. Notların, adın, e-postan ve kendi yazdığın etiketler gönderilmez. Oluşan yorum hesabında saklanır; izni geri çekince silinir.",
          "Bunların dışında kimseyle veri paylaşmıyoruz. Üçüncü taraf reklam ya da analitik aracı kullanmıyoruz.",
        ],
      },
      {
        title: "Güvenlik",
        body: [
          "Her kayıt hesabına bağlıdır ve veritabanı düzeyinde yalnızca senin oturumunla okunabilir (Row Level Security).",
          "Tüm bağlantılar şifrelidir (HTTPS). Şifre kullanmıyoruz; giriş tek kullanımlık kodla yapılır.",
          "Gizli anahtarlar yalnızca sunucuda tutulur, uygulamanın içinde yer almaz.",
        ],
      },
      {
        title: "Hakların",
        body: [
          "İndirme: Ayarlar > Verilerin bölümünden tüm verilerini JSON ya da tablo (CSV) olarak indirebilirsin.",
          "Düzeltme ve silme: Geçmiş ekranından her kaydı düzenleyebilir ya da silebilirsin.",
          "Hesabı silme: Ayarlar > Verilerin > Hesabımı sil. Hesabın, tüm kayıtların, geri bildirimlerin ve ekran görüntülerin kalıcı olarak silinir.",
          "Türkiye'de KVKK, Avrupa Birliği'nde GDPR kapsamındaki diğer hakların için bize ulaşabilirsin.",
        ],
      },
      {
        title: "Sağlık notu",
        body: [
          "PAUSE bir farkındalık ve öz-düzenleme aracıdır; tanı koymaz, tedavi yerine geçmez.",
          "Alkol ya da bazı maddeleri aniden bırakmak tıbbi risk taşıyabilir. Kendini güvende hissetmiyorsan bir sağlık profesyoneline ya da acil yardım hattına (Türkiye'de 112) başvur.",
        ],
      },
      {
        title: "Test dönemi ve iletişim",
        body: [
          "PAUSE şu an küçük bir test grubuyla deneniyor. Bu metin uygulama geliştikçe güncellenebilir; önemli değişiklikleri uygulama içinde duyururuz.",
          "Soruların için Ayarlar > Geri bildirim ver bölümünü kullanabilirsin.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy",
    updated: "Last updated",
    intro:
      "PAUSE helps you keep a record of behaviors that can be sensitive. That's why your data is yours alone: no one else can see it, it isn't sold and it isn't used for ads.",
    sections: [
      {
        title: "What we store",
        body: [
          "Account: your email address and, if you choose, your name.",
          "Your behaviors: the behaviors you pick or add, your goal and your note on why you want to change.",
          "Urge entries: time, urge intensity (before and after), emotions, triggers, the alternatives you tried, the outcome, answers to behavior-specific questions and any notes you write.",
          "Settings: language, time zone and your notification subscription (a technical address provided by your browser).",
          "Feedback: answers and screenshots you send during the test period.",
          "Anonymous usage statistics: which screens are opened, at which step of the urge flow people leave, whether an alternative was started and finished. They aren't linked to your account, contain nothing you wrote and no behavior, emotion or trigger names, and are deleted after 180 days. You can turn them off in Settings > Your data.",
        ],
      },
      {
        title: "Why we store it",
        body: [
          "Only to run the app for you: showing your entries, keeping the pause timer correct across devices, notifying you when time is up and computing your own patterns (insights).",
          "Feedback is read only to improve the app.",
        ],
      },
      {
        title: "Where and with whom",
        body: [
          "Database and files: Supabase, on servers in the European Union (Frankfurt).",
          "Serving the app: Vercel; server-side processing runs in the Frankfurt region.",
          "Sign-in code emails: sent through Google (Gmail); the email contains only the code.",
          "Notifications: delivered encrypted through your browser's push service (Apple, Google or Mozilla). They never include the name of your behavior.",
          "AI interpretation (only if you allow \"Analyze my patterns\"): the summary numbers the app calculates (entry counts, shares, averages, most common trigger/emotion, busy hours) are sent to Anthropic's Claude model to write the interpretation. Your notes, name, email and labels you wrote yourself are never sent. The interpretation is stored in your account and deleted when you withdraw permission.",
          "We don't share data with anyone else. We use no third-party advertising or analytics tools.",
        ],
      },
      {
        title: "Security",
        body: [
          "Every entry is tied to your account and can only be read with your session, enforced in the database (Row Level Security).",
          "All connections are encrypted (HTTPS). There are no passwords; you sign in with a one-time code.",
          "Secret keys live only on the server, never inside the app.",
        ],
      },
      {
        title: "Your rights",
        body: [
          "Download: Settings > Your data lets you download everything as JSON or as a table (CSV).",
          "Correct and delete: you can edit or delete any entry from History.",
          "Delete your account: Settings > Your data > Delete my account. Your account, entries, feedback and screenshots are permanently deleted.",
          "For your other rights under GDPR (EU) or KVKK (Türkiye), contact us.",
        ],
      },
      {
        title: "Health note",
        body: [
          "PAUSE is an awareness and self-regulation tool; it doesn't diagnose and isn't a substitute for treatment.",
          "Stopping alcohol or some substances suddenly can be medically risky. If you don't feel safe, contact a health professional or your local emergency number.",
        ],
      },
      {
        title: "Test period and contact",
        body: [
          "PAUSE is currently being tested with a small group. This text may change as the app evolves; we'll announce important changes in the app.",
          "For questions, use Settings > Give feedback.",
        ],
      },
    ],
  },
};
