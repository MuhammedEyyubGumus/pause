// Geri bildirim durumları — sunucu sayfası ve istemci düğmeleri ortak kullanır
export const FEEDBACK_STATUSES = ["new", "read", "done"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
