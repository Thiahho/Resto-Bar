using System.Net;

namespace Back.Services
{
    public interface IWhatsAppService
    {
        Task SendAsync(string phone, string apiKey, string message);
    }

    public class CallMeBotWhatsAppService : IWhatsAppService
    {
        private readonly HttpClient _http;
        private readonly ILogger<CallMeBotWhatsAppService> _logger;

        public CallMeBotWhatsAppService(HttpClient http, ILogger<CallMeBotWhatsAppService> logger)
        {
            _http = http;
            _logger = logger;
        }

        public async Task SendAsync(string phone, string apiKey, string message)
        {
            if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(apiKey))
                return;

            var encodedMessage = WebUtility.UrlEncode(message);
            var url = $"https://api.callmebot.com/whatsapp.php?phone={phone}&text={encodedMessage}&apikey={apiKey}";

            try
            {
                var response = await _http.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[WhatsApp] CallMeBot returned {Status} for phone {Phone}", response.StatusCode, phone);
                }
                else
                {
                    _logger.LogInformation("[WhatsApp] Sent to {Phone}: {Message}", phone, message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[WhatsApp] Error sending message to {Phone}", phone);
            }
        }
    }
}
