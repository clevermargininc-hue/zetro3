import { z } from "zod";

export const NotificationItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  severity: z.string(),
  title: z.string(),
  body: z.string(),
  linkHref: z.string().nullable(),
  callId: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const NotificationsResponseSchema = z.object({
  unreadCount: z.number(),
  items: z.array(NotificationItemSchema),
});

export const MarkNotificationsReadResponseSchema = z.object({
  ok: z.boolean(),
  readAt: z.string(),
});

export type NotificationItem = z.infer<typeof NotificationItemSchema>;

