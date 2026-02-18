# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Back.csproj ./
RUN dotnet restore "Back.csproj"

COPY . ./
RUN dotnet build "Back.csproj" -c Release -o /app/build

# Publish Stage
FROM build AS publish
RUN dotnet publish "Back.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

COPY --from=publish /app/publish .

EXPOSE 10000

ENTRYPOINT ["dotnet", "Back.dll"]
