// Shared constants for kimono pages. Keep string keys in one place.
(function () {
  window.KimonoConstants = {
    actions: {
      createBooking: 'createBooking',
      refund: 'refund',
      checkInOrder: 'checkInOrder',
      adminUpdate: 'adminUpdate'
    },
    pendingKeys: {
      booking: 'kimono_pending_booking',
      refund: 'kimono_pending_refund',
      checkin: 'kimono_pending_checkin',
      adminUpdatePrefix: 'kimono_pending_admin_update_'
    },
    orderStatus: {
      pending: 'pending',
      confirmed: 'confirmed',
      refunding: 'refunding',
      refunded: 'refunded'
    },
    responseStatus: {
      success: 'success',
      ok: 'ok',
      unauthorized: 'unauthorized'
    }
  };
})();
