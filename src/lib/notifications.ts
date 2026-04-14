import { supabase } from "@/lib/supabase";

interface NotificationInput {
  orgId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  userEmail?: string | null;
}

/** Send email notification for important events via Supabase Edge Function */
async function sendEmailNotification(
  recipientEmail: string,
  title: string,
  message: string,
  type: string
) {
  const emailTypes = ["deal", "warning", "reassignment", "lead"];
  if (!emailTypes.includes(type)) return;

  try {
    await supabase.functions.invoke("send-notification-email", {
      body: { recipientEmail, title, message, type },
    });
  } catch (e) {
    if (import.meta.env.DEV) console.error("Email send failed:", e);
  }
}

export async function createNotification({ orgId, title, message, type, link, userEmail }: NotificationInput) {
  const { error } = await supabase.from("notifications").insert({
    org_id: orgId,
    title,
    message,
    type,
    link: link || "/",
    user_email: userEmail || null,
  } as any);
  if (error && import.meta.env.DEV) console.error("Notification insert failed:", error);

  // Send email for high-priority notifications
  if (userEmail) {
    sendEmailNotification(userEmail, title, message, type);
  }
}

/** Send notification to all managers/owners in the org */
export async function notifyManagers(orgId: string, title: string, message: string, type: string, link?: string) {
  await createNotification({ orgId, title, message, type, link, userEmail: null });

  // Also send email to owner for important events
  const emailTypes = ["deal", "warning", "reassignment", "lead"];
  if (emailTypes.includes(type)) {
    try {
      const { data: owners } = await supabase
        .from("organization_members")
        .select("email")
        .eq("org_id", orgId)
        .eq("role", "owner");
      if (owners) {
        for (const owner of owners) {
          if (owner.email) {
            sendEmailNotification(owner.email, title, message, type);
          }
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error("Owner email lookup failed:", e);
    }
  }
}

/** Send notification to a specific user */
export async function notifyUser(orgId: string, userEmail: string, title: string, message: string, type: string, link?: string) {
  await createNotification({ orgId, title, message, type, link, userEmail });
}
