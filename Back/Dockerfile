# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY Back/Back.csproj ./Back/
RUN dotnet restore "Back/Back.csproj"

# Copy everything else and build
COPY Back/ ./Back/
RUN dotnet build "Back/Back.csproj" -c Release -o /app/build

# Publish Stage
FROM build AS publish
RUN dotnet publish "Back/Back.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install EF Core tools for migrations
RUN dotnet tool install --global dotnet-ef --version 8.0.10
ENV PATH="$PATH:/root/.dotnet/tools"

COPY --from=publish /app/publish .

# Expose port
EXPOSE 5000

# Run migrations and start the app
ENTRYPOINT ["dotnet", "Back.dll"]
