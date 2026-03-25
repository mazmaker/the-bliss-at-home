/**
 * Staff App - Real-time Extend Session Notifications
 * Listens for booking extensions and updates UI accordingly
 */

import { useEffect, useState } from 'react';
import { supabase } from '@bliss/supabase/auth';
import toast from 'react-hot-toast';

interface ExtensionNotification {
  bookingId: string;
  additionalDuration: number;
  additionalPrice: number;
  newTotalDuration: number;
  newTotalPrice: number;
  extendedAt: string;
}

export function useExtendSessionNotifications(staffProfileId?: string) {
  const [latestExtension, setLatestExtension] = useState<ExtensionNotification | null>(null);

  useEffect(() => {
    if (!staffProfileId) return;

    console.log('🔔 Setting up extend session notifications for staff:', staffProfileId);

    // Subscribe to booking_services changes (for extensions)
    const extensionChannel = supabase
      .channel('staff-booking-extensions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_services',
          filter: `is_extension=eq.true`,
        },
        async (payload) => {
          console.log('🔔 Extension detected:', payload);

          const newExtension = payload.new;

          // Get booking details to check if this staff is assigned
          const { data: booking } = await supabase
            .from('bookings')
            .select(`
              id,
              booking_number,
              final_price,
              staff:staff_id (
                profile_id
              )
            `)
            .eq('id', newExtension.booking_id)
            .single();

          // Only notify if this is for the current staff
          if (booking?.staff?.profile_id === staffProfileId) {
            // Calculate totals
            const { data: allServices } = await supabase
              .from('booking_services')
              .select('duration, price')
              .eq('booking_id', newExtension.booking_id);

            const totalDuration = allServices?.reduce((sum, s) => sum + s.duration, 0) || 0;
            const totalPrice = allServices?.reduce((sum, s) => sum + s.price, 0) || 0;

            const extensionData: ExtensionNotification = {
              bookingId: newExtension.booking_id,
              additionalDuration: newExtension.duration,
              additionalPrice: newExtension.price,
              newTotalDuration: totalDuration,
              newTotalPrice: totalPrice,
              extendedAt: newExtension.extended_at
            };

            setLatestExtension(extensionData);

            // Show toast notification
            toast.success(
              `🕐 การจอง ${booking.booking_number} ได้รับการเพิ่มเวลา ${newExtension.duration} นาที`,
              {
                duration: 6000,
                position: 'top-center',
              }
            );

            console.log('✅ Extension notification processed:', extensionData);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Cleaning up extend session notifications');
      supabase.removeChannel(extensionChannel);
    };
  }, [staffProfileId]);

  const clearLatestExtension = () => {
    setLatestExtension(null);
  };

  return {
    latestExtension,
    clearLatestExtension
  };
}