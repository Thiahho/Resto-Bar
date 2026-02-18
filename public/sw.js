// Service Worker — Cartelito Push Notifications

self.addEventListener('push', (event) => {
  let data = { title: 'Cartelito', body: '', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  // Tag único por notificación → Android trata cada una como nueva
  // y activa sonido + vibración a través del canal de notificaciones del SO.
  // Un tag fijo como 'kitchen-order' hace que Chrome agrupe notificaciones
  // y no re-alerte (sin sonido ni vibración) incluso con renotify:true.
  const tag = 'kitchen-' + Date.now();

  const showNotif = self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/images/cartelito.webp',
    badge: '/images/cartelito.webp',
    tag,
    silent: false,
    data: { url: data.url },
    vibrate: [300, 100, 300],
  });

  // Notificar a las ventanas abiertas para que reproduzcan el sonido
  // (el canal de notificaciones de Android puede estar en silencio,
  //  pero el Web Audio API de la página siempre funciona si está abierta)
  const notifyClients = clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
      windowClients.forEach((client) =>
        client.postMessage({ type: 'PUSH_KITCHEN_ORDER' })
      );
    });

  event.waitUntil(Promise.all([showNotif, notifyClients]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
