const MESSAGE_ID = /^[A-Za-z0-9+=.-]{8,200}$/;

export function isIntegrationMessageId(value: string) {
  return MESSAGE_ID.test(value) && !value.includes(":");
}

export function integrationDeliveryEventType(eventType: string, bounceType?: string | null) {
  if (eventType === "Delivery") return "Delivery";
  if (eventType === "Complaint") return "Complaint";
  if (eventType === "Bounce") {
    if (!bounceType || bounceType === "Permanent" || bounceType === "Undetermined") return "Bounce";
    return "TransientBounce";
  }
  return null;
}

export function deliveryExternalId(messageId: string, eventName: string) {
  return `${messageId}:${eventName}`;
}
