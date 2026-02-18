using Back.Data;
using Microsoft.EntityFrameworkCore;
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

        public PushNotificationService(AppDbContext db, IConfiguration config, ILogger<PushNotificationService> logger)
        {
            _db = db;
            _logger = logger;
            _subject = config["Vapid:Subject"] ?? "mailto:admin@cartelito.app";
            _publicKey = config["Vapid:PublicKey"] ?? throw new InvalidOperationException("Vapid:PublicKey not configured");
            _privateKey = config["Vapid:PrivateKey"] ?? throw new InvalidOperationException("Vapid:PrivateKey not configured");
        }

        public async Task SendToKitchenAsync(string station, string title, string body, string url = "/admin/kitchen")
        {
            var subs = await _db.UserPushSubscriptions
                .Where(s => s.Station == null || s.Station == station)
                .ToListAsync();

            if (subs.Count == 0) return;

            var vapidDetails = new VapidDetails(_subject, _publicKey, _privateKey);
            var client = new WebPushClient();
            var payload = JsonSerializer.Serialize(new { title, body, url });
            var toDelete = new List<int>();

            foreach (var sub in subs)
            {
                try
                {
                    var pushSub = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                    await client.SendNotificationAsync(pushSub, payload, vapidDetails);
                }
                catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone
                                                || ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogInformation("Push subscription expired for endpoint {Endpoint}, removing", sub.Endpoint);
                    toDelete.Add(sub.Id);
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
