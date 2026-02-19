using Back.Data;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text.Json;
using WebPush;

namespace Back.Services
{
    public class PushNotificationService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<PushNotificationService> _logger;
        private readonly string _subject;
        private readonly string _publicKey;
        private readonly string _privateKey;
        // HttpClient compartido — reutilizable y thread-safe
        private static readonly HttpClient _http = new();

        public PushNotificationService(AppDbContext db, IConfiguration config, ILogger<PushNotificationService> logger)
        {
            _db = db;
            _logger = logger;
            _subject = config["Vapid:Subject"] ?? "mailto:admin@cartelito.app";
            _publicKey = config["Vapid:PublicKey"] ?? string.Empty;
            _privateKey = config["Vapid:PrivateKey"] ?? string.Empty;
            if (string.IsNullOrEmpty(_publicKey) || string.IsNullOrEmpty(_privateKey))
                _logger.LogWarning("Vapid keys not configured — push notifications disabled.");
        }

        public async Task SendToKitchenAsync(string station, string title, string body, string url = "/admin/kitchen")
        {
            if (string.IsNullOrEmpty(_publicKey) || string.IsNullOrEmpty(_privateKey))
                return;

            var subs = await _db.UserPushSubscriptions
                .Where(s => s.Station == null || s.Station == station)
                .ToListAsync();

            if (subs.Count == 0) return;

            var vapidDetails = new VapidDetails(_subject, _publicKey, _privateKey);
            var client = new WebPushClient();
            client.SetVapidDetails(vapidDetails);

            var payload = JsonSerializer.Serialize(new { title, body, url });
            var toDelete = new List<int>();

            foreach (var sub in subs)
            {
                try
                {
                    var pushSub = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);

                    // Generamos el HttpRequestMessage con las cabeceras VAPID ya firmadas,
                    // y luego añadimos Urgency:high + TTL antes de enviarlo.
                    // Urgency:high le indica a los servidores FCM/APNS que entreguen el
                    // mensaje incluso cuando el dispositivo está en Doze mode (pantalla apagada).
                    var request = client.GenerateRequestDetails(pushSub, payload);
                    request.Headers.TryAddWithoutValidation("Urgency", "high");
                    request.Headers.TryAddWithoutValidation("TTL", "60");

                    var response = await _http.SendAsync(request);

                    if (response.StatusCode == System.Net.HttpStatusCode.Gone
                        || response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        _logger.LogInformation("Push subscription expired for endpoint {Endpoint}, removing", sub.Endpoint);
                        toDelete.Add(sub.Id);
                    }
                    else if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("Push returned {Status} for endpoint {Endpoint}",
                            response.StatusCode, sub.Endpoint);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending push notification to endpoint {Endpoint}", sub.Endpoint);
                }
            }

            if (toDelete.Count > 0)
            {
                var expired = await _db.UserPushSubscriptions.Where(s => toDelete.Contains(s.Id)).ToListAsync();
                _db.UserPushSubscriptions.RemoveRange(expired);
                await _db.SaveChangesAsync();
            }
        }
    }
}
