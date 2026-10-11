export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center pt-safe pb-safe">
      <h1 className="text-question">Şu an bağlantı yok</h1>
      <p className="max-w-xs text-muted-foreground">
        Dürtü kaydın cihazında güvende. Bağlantı gelince otomatik gönderilecek.
      </p>
    </main>
  );
}
