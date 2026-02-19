using System.Text;
using System.Text.Json;

namespace Back.Services
{
    public interface ITelegramService
    {
        Task SendAsync(string chatId, string message);
    }

    public class TelegramService : ITelegramService
    {
        private readonly HttpClient _http;
        private readonly ILogger<TelegramService> _logger;
        private readonly string _botToken;

        public TelegramService(HttpClient http, ILogger<TelegramService> logger, IConfiguration config)
        {
            _http = http;
            _logger = logger;
            _botToken = config["Telegram:BotToken"] ?? string.Empty;
        }

        public async Task SendAsync(string chatId, string message)
        {
            if (string.IsNullOrWhiteSpace(chatId) || string.IsNullOrWhiteSpace(_botToken))
                return;

            var url = $"https://api.telegram.org/bot{_botToken}/sendMessage";
            var body = JsonSerializer.Serialize(new { chat_id = chatId, text = message });
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            try
            {
                var response = await _http.PostAsync(url, content);
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("[Telegram] Error {Status} para chatId {ChatId}: {Error}", response.StatusCode, chatId, error);
                }
                else
                {
                    _logger.LogInformation("[Telegram] Enviado a {ChatId}: {Message}", chatId, message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Telegram] Error enviando mensaje a {ChatId}", chatId);
            }
        }
    }
}
