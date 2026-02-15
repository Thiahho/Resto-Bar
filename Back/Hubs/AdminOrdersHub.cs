using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Back.Hubs
{
    [Authorize(Roles="Admin")]
    public class AdminOrdersHub : Hub
    {
        private readonly ILogger<AdminOrdersHub> _logger;

        public const string AdminsGroup = "admins";

        public AdminOrdersHub(ILogger<AdminOrdersHub> logger)
        {
            _logger = logger;
        }

        public static string BranchGroup (int branchId) => $"admins:branch:{branchId}";

        public override async Task OnConnectedAsync()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, AdminsGroup);

            var userName = Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? Context.User?.Identity?.Name
                ?? "unknown";

            _logger.LogInformation("Admin connected to hub. ConnectionId: {ConnectionId}, User: {User}", Context.ConnectionId, userName);

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userName = Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? Context.User?.Identity?.Name
                ?? "unknown";

            _logger.LogInformation("Admin disconnected from hub. ConnectionId: {ConnectionId}, User: {User}", Context.ConnectionId, userName);

            await base.OnDisconnectedAsync(exception);
        }

        public async Task SubscribeToBranch(int branchId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, BranchGroup(branchId));
            _logger.LogInformation("Admin subscribed to branch updates. ConnectionId: {ConnectionId}, BranchId: {BranchId}", Context.ConnectionId, branchId);
        }

        public async Task UnsubscribeFromBranch(int branchId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, BranchGroup(branchId));
            _logger.LogInformation("Admin unsubscribed from branch updates. ConnectionId: {ConnectionId}, BranchId: {BranchId}", Context.ConnectionId, branchId);
        }
    }
}