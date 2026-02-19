using Back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Back.Controller
{
    [ApiController]
    public class TelegramController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ITelegramService _telegram;
        private readonly ILogger<TelegramController> _logger;

        public TelegramController(IConfiguration config, ITelegramService telegram, ILogger<TelegramController> logger)
        {
            _config = config;
            _telegram = telegram;
            _logger = logger;
        }

        // ─── Webhook (llamado por Telegram, sin auth JWT) ─────────────────────────

        /// <summary>
        /// POST /api/telegram/webhook
        /// Telegram envía aquí cada mensaje que recibe el bot.
        /// El bot responde con el Chat ID del remitente.
        /// </summary>
        [HttpPost("api/telegram/webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> Webhook([FromBody] TelegramUpdate update)
        {
            // Validar secret header si está configurado
            var secret = _config["Telegram:WebhookSecret"];
            if (!string.IsNullOrWhiteSpace(secret))
            {
                var header = Request.Headers["X-Telegram-Bot-Api-Secret-Token"].FirstOrDefault();
                if (header != secret)
                    return Unauthorized();
            }

            var chatId = update.Message?.Chat?.Id ?? update.CallbackQuery?.Message?.Chat?.Id;
            var from = update.Message?.From ?? update.CallbackQuery?.From;

            if (chatId == null)
                return Ok();

            var name = string.IsNullOrWhiteSpace(from?.FirstName) ? "usuario" : from.FirstName;
            var message = $"Hola {name}! Tu Chat ID es:\n\n`{chatId}`\n\nCopiá este número y dáselo al administrador para activar las notificaciones de cocina.";

            await _telegram.SendAsync(chatId.Value.ToString(), message);

            _logger.LogInformation("[Telegram] Respondido Chat ID {ChatId} a {Name}", chatId, name);
            return Ok();
        }

        // ─── Endpoints admin ──────────────────────────────────────────────────────

        /// <summary>
        /// POST /api/telegram/set-webhook  { "url": "https://tudominio.com" }
        /// Registra la URL pública del webhook en Telegram.
        /// </summary>
        [HttpPost("api/telegram/set-webhook")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetWebhook([FromBody] SetWebhookDto dto)
        {
            var token = _config["Telegram:BotToken"];
            if (string.IsNullOrWhiteSpace(token))
                return BadRequest(new { message = "BotToken no configurado" });

            var webhookUrl = $"{dto.Url.TrimEnd('/')}/api/telegram/webhook";
            var secret = _config["Telegram:WebhookSecret"];

            using var http = new HttpClient();
            var payload = new Dictionary<string, string> { ["url"] = webhookUrl };
            if (!string.IsNullOrWhiteSpace(secret))
                payload["secret_token"] = secret;

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await http.PostAsync($"https://api.telegram.org/bot{token}/setWebhook", content);
            var body = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("[Telegram] setWebhook → {Url}: {Body}", webhookUrl, body);
            return response.IsSuccessStatusCode ? Ok(new { webhookUrl, result = body }) : BadRequest(new { result = body });
        }

        /// <summary>
        /// DELETE /api/telegram/set-webhook
        /// Elimina el webhook (vuelve a modo getUpdates).
        /// </summary>
        [HttpDelete("api/telegram/set-webhook")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteWebhook()
        {
            var token = _config["Telegram:BotToken"];
            if (string.IsNullOrWhiteSpace(token))
                return BadRequest(new { message = "BotToken no configurado" });

            using var http = new HttpClient();
            var response = await http.GetAsync($"https://api.telegram.org/bot{token}/deleteWebhook");
            var body = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("[Telegram] deleteWebhook: {Body}", body);
            return Ok(new { result = body });
        }

        /// <summary>
        /// GET /api/telegram/updates
        /// Devuelve los últimos mensajes (modo sin webhook, para desarrollo).
        /// </summary>
        [HttpGet("api/telegram/updates")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetUpdates()
        {
            var token = _config["Telegram:BotToken"];
            if (string.IsNullOrWhiteSpace(token))
                return BadRequest(new { message = "BotToken no configurado" });

            using var http = new HttpClient();

            try
            {
                var response = await http.GetAsync($"https://api.telegram.org/bot{token}/getUpdates?limit=50");
                var body = await response.Content.ReadAsStringAsync();

                var parsed = JsonSerializer.Deserialize<TelegramUpdatesResponse>(body,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (parsed?.Ok != true || parsed.Result == null)
                    return Ok(new { contacts = Array.Empty<object>() });

                var contacts = parsed.Result
                    .Where(u => u.Message?.Chat != null)
                    .GroupBy(u => u.Message!.Chat!.Id)
                    .Select(g =>
                    {
                        var last = g.OrderByDescending(u => u.UpdateId).First();
                        var from = last.Message!.From;
                        return new
                        {
                            chatId = last.Message.Chat!.Id.ToString(),
                            firstName = from?.FirstName ?? "",
                            lastName = from?.LastName ?? "",
                            username = from?.Username ?? ""
                        };
                    })
                    .OrderBy(c => c.firstName)
                    .ToList();

                return Ok(new { contacts });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Telegram] Error fetching updates");
                return StatusCode(500, new { message = "Error consultando el bot" });
            }
        }

        // ─── DTOs ─────────────────────────────────────────────────────────────────

        public class SetWebhookDto
        {
            public string Url { get; set; } = "";
        }

        public class TelegramUpdate
        {
            [JsonPropertyName("update_id")]
            public long UpdateId { get; set; }
            public TelegramMessage? Message { get; set; }
            [JsonPropertyName("callback_query")]
            public TelegramCallbackQuery? CallbackQuery { get; set; }
        }

        public class TelegramMessage
        {
            public TelegramChat? Chat { get; set; }
            public TelegramUser? From { get; set; }
        }

        public class TelegramCallbackQuery
        {
            public TelegramUser? From { get; set; }
            public TelegramMessage? Message { get; set; }
        }

        public class TelegramChat
        {
            public long Id { get; set; }
            [JsonPropertyName("first_name")]
            public string? FirstName { get; set; }
        }

        public class TelegramUser
        {
            [JsonPropertyName("first_name")]
            public string? FirstName { get; set; }
            [JsonPropertyName("last_name")]
            public string? LastName { get; set; }
            public string? Username { get; set; }
        }

        private class TelegramUpdatesResponse
        {
            public bool Ok { get; set; }
            public List<TelegramUpdate>? Result { get; set; }
        }
    }
}
