import { env } from "../../config/env";
import { residentAlertsRepo } from "../../repositories/residentAlerts.repo";
import type { ResidentAlert } from "./residentAlerts.types";

export interface ResidentAlertSmsDelivery {
  alertId: string;
  recipient: string;
  status: "sent" | "failed" | "skipped";
  channel: "sms" | "whatsapp" | "telegram";
  provider: "twilio" | "whatsapp_cloud" | "telegram";
  providerMessageId?: string;
  errorMessage?: string;
}

const MAX_SMS_LENGTH = 320;
const MAX_CHAT_LENGTH = 900;

export async function sendResidentAlertSms(alert: ResidentAlert): Promise<ResidentAlertSmsDelivery[]> {
  if (!env.SMS_ENABLED) return [];

  const recipients = parseRecipients(env.SMS_DEMO_RECIPIENTS);
  if (recipients.length === 0) {
    console.warn("[residentAlertSms] SMS_ENABLED=true but SMS_DEMO_RECIPIENTS is empty.");
    return [];
  }

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || (!env.TWILIO_FROM_NUMBER && !env.TWILIO_MESSAGING_SERVICE_SID)) {
    console.warn("[residentAlertSms] Twilio is not fully configured; skipping SMS sends.");
    const skipped = recipients.map((recipient) => ({
      alertId: alert.id,
      recipient,
      status: "skipped" as const,
      channel: "sms" as const,
      provider: "twilio" as const,
      errorMessage: "Twilio is not fully configured.",
    }));
    await residentAlertsRepo.saveSmsDeliveries(skipped);
    return skipped;
  }

  const message = formatResidentAlertSms(alert);
  const deliveries = await Promise.all(
    recipients.map((recipient) => sendTwilioSms(recipient, message, alert.id))
  );
  await residentAlertsRepo.saveSmsDeliveries(deliveries);
  return deliveries;
}

export async function sendResidentAlertWhatsapp(alert: ResidentAlert): Promise<ResidentAlertSmsDelivery[]> {
  if (!env.WHATSAPP_ENABLED) return [];

  const recipients = parseRecipients(env.WHATSAPP_DEMO_RECIPIENTS);
  if (recipients.length === 0) {
    console.warn("[residentAlertWhatsapp] WHATSAPP_ENABLED=true but WHATSAPP_DEMO_RECIPIENTS is empty.");
    return [];
  }

  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    console.warn("[residentAlertWhatsapp] WhatsApp Cloud API is not fully configured; skipping sends.");
    const skipped = recipients.map((recipient) => ({
      alertId: alert.id,
      recipient,
      status: "skipped" as const,
      channel: "whatsapp" as const,
      provider: "whatsapp_cloud" as const,
      errorMessage: "WhatsApp Cloud API is not fully configured.",
    }));
    await residentAlertsRepo.saveSmsDeliveries(skipped);
    return skipped;
  }

  const message = formatResidentChatMessage(alert);
  const deliveries = await Promise.all(
    recipients.map((recipient) => sendWhatsappMessage(recipient, message, alert.id))
  );
  await residentAlertsRepo.saveSmsDeliveries(deliveries);
  return deliveries;
}

export async function sendResidentAlertTelegram(alert: ResidentAlert): Promise<ResidentAlertSmsDelivery[]> {
  if (!env.TELEGRAM_ENABLED) return [];

  const chatIds = parseTelegramChatIds(env.TELEGRAM_DEMO_CHAT_IDS);
  if (chatIds.length === 0) {
    console.warn("[residentAlertTelegram] TELEGRAM_ENABLED=true but TELEGRAM_DEMO_CHAT_IDS is empty.");
    return [];
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn("[residentAlertTelegram] Telegram bot token is missing; skipping sends.");
    const skipped = chatIds.map((chatId) => ({
      alertId: alert.id,
      recipient: chatId,
      status: "skipped" as const,
      channel: "telegram" as const,
      provider: "telegram" as const,
      errorMessage: "Telegram bot token is missing.",
    }));
    await residentAlertsRepo.saveSmsDeliveries(skipped);
    return skipped;
  }

  const message = formatResidentChatMessage(alert);
  const deliveries = await Promise.all(
    chatIds.map((chatId) => sendTelegramMessage(chatId, message, alert.id))
  );
  await residentAlertsRepo.saveSmsDeliveries(deliveries);
  return deliveries;
}

export function formatResidentAlertSms(alert: ResidentAlert): string {
  const statusPrefix =
    alert.status === "resolved"
      ? "MURUS SG All Clear"
      : alert.status === "updated"
        ? "MURUS SG Alert Update"
        : "MURUS SG Public Alert";
  const guidancePrefix = alert.status === "updated" ? "Updated action" : "Action";
  const raw = `${statusPrefix}: ${alert.title}. ${guidancePrefix}: ${alert.publicAction} Area: ${alert.locationLabel}.`;
  return raw.length <= MAX_SMS_LENGTH ? raw : `${raw.slice(0, MAX_SMS_LENGTH - 3).trimEnd()}...`;
}

export function formatResidentChatMessage(alert: ResidentAlert): string {
  const statusPrefix =
    alert.status === "resolved" ? "ALL CLEAR" : alert.status === "updated" ? "UPDATED ALERT" : "MURUS SG ALERT";
  const raw = [
    `${statusPrefix}: ${alert.title}`,
    alert.body,
    `Action: ${alert.publicAction}`,
    `Location: ${alert.locationLabel}`,
  ].filter(Boolean).join("\n");
  return raw.length <= MAX_CHAT_LENGTH ? raw : `${raw.slice(0, MAX_CHAT_LENGTH - 3).trimEnd()}...`;
}

export function parseRecipients(value?: string): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim().replace(/\s+/g, ""))
        .filter((item) => /^\+\d{8,15}$/.test(item))
    )
  );
}

export function parseTelegramChatIds(value?: string): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter((item) => /^-?\d+$/.test(item) || /^@\w{5,}$/.test(item))
    )
  );
}

async function sendTwilioSms(
  to: string,
  body: string,
  alertId: string
): Promise<ResidentAlertSmsDelivery> {
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const form = new URLSearchParams({
    To: to,
    Body: body,
  });
  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    form.set("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    form.set("From", normalisePhoneNumber(env.TWILIO_FROM_NUMBER));
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const data = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };

    if (!response.ok) {
      return {
        alertId,
        recipient: to,
        status: "failed",
        channel: "sms",
        provider: "twilio",
        errorMessage: data.message ?? `Twilio returned ${response.status}.`,
      };
    }

    return {
      alertId,
      recipient: to,
      status: "sent",
      channel: "sms",
      provider: "twilio",
      providerMessageId: data.sid,
    };
  } catch (err) {
    return {
      alertId,
      recipient: to,
      status: "failed",
      channel: "sms",
      provider: "twilio",
      errorMessage: err instanceof Error ? err.message : "Unknown Twilio send failure.",
    };
  }
}

async function sendWhatsappMessage(
  to: string,
  body: string,
  alertId: string
): Promise<ResidentAlertSmsDelivery> {
  const endpoint = `https://graph.facebook.com/${env.WHATSAPP_GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "text",
        text: { preview_url: false, body },
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return {
        alertId,
        recipient: to,
        status: "failed",
        channel: "whatsapp",
        provider: "whatsapp_cloud",
        errorMessage: data.error?.message ?? `WhatsApp returned ${response.status}.`,
      };
    }

    return {
      alertId,
      recipient: to,
      status: "sent",
      channel: "whatsapp",
      provider: "whatsapp_cloud",
      providerMessageId: data.messages?.[0]?.id,
    };
  } catch (err) {
    return {
      alertId,
      recipient: to,
      status: "failed",
      channel: "whatsapp",
      provider: "whatsapp_cloud",
      errorMessage: err instanceof Error ? err.message : "Unknown WhatsApp send failure.",
    };
  }
}

async function sendTelegramMessage(
  chatId: string,
  body: string,
  alertId: string
): Promise<ResidentAlertSmsDelivery> {
  const endpoint = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: body,
        disable_web_page_preview: true,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };

    if (!response.ok || data.ok === false) {
      return {
        alertId,
        recipient: chatId,
        status: "failed",
        channel: "telegram",
        provider: "telegram",
        errorMessage: data.description ?? `Telegram returned ${response.status}.`,
      };
    }

    return {
      alertId,
      recipient: chatId,
      status: "sent",
      channel: "telegram",
      provider: "telegram",
      providerMessageId: data.result?.message_id ? String(data.result.message_id) : undefined,
    };
  } catch (err) {
    return {
      alertId,
      recipient: chatId,
      status: "failed",
      channel: "telegram",
      provider: "telegram",
      errorMessage: err instanceof Error ? err.message : "Unknown Telegram send failure.",
    };
  }
}

function normalisePhoneNumber(value?: string): string {
  return value?.replace(/\s+/g, "") ?? "";
}
