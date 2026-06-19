export type VoiceAnnouncement = 
  | 'customer_order_placed'
  | 'customer_order_preparing'
  | 'customer_order_ready'
  | 'customer_service_notified'
  | 'waiter_new_order'
  | 'waiter_service_ring'
  | 'waiter_order_ready'
  | 'waiter_bill_request';

export const playVoice = (announcement: VoiceAnnouncement) => {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio(`/voices/${announcement}.mp3`);
    audio.play().catch(error => {
      console.warn(`Voice play prevented for ${announcement}:`, error);
    });
  } catch (error) {
    console.error(`Failed to play voice ${announcement}:`, error);
  }
};
