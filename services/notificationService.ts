
/**
 * Mock Notification Service
 * Simulates sending Email and SMS through a backend provider (e.g., Twilio, SendGrid)
 */

interface Recipient {
  name: string;
  email: string;
  phone: string;
}

interface NotificationPayload {
  plateNumber: string;
  type: 'CHALLAN' | 'WARNING';
  amount?: number;
  violations?: string[];
  challanId?: string;
}

export const sendNotification = async (
  recipient: Recipient,
  payload: NotificationPayload
): Promise<boolean> => {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(`[Notification Service] Sending ${payload.type} to ${recipient.email}...`);
  console.log(`Payload:`, payload);

  // Trigger Native Browser Notification if allowed
  if (Notification.permission === 'granted') {
    const title = payload.type === 'CHALLAN' 
      ? `E-Challan Issued: ${payload.plateNumber}`
      : `Warning Issued: ${payload.plateNumber}`;
      
    const body = payload.type === 'CHALLAN'
      ? `Fine: ₹${payload.amount}. Sent to ${recipient.name}.`
      : `Violation Warning sent to ${recipient.name}.`;

    new Notification(title, {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/2555/2555572.png', // Generic siren icon
    });
  }

  // Simulate success (random failure chance could be added here for testing)
  return true;
};
