FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["FreeToolsBlog.Api/FreeToolsBlog.Api.csproj", "FreeToolsBlog.Api/"]
RUN dotnet restore "FreeToolsBlog.Api/FreeToolsBlog.Api.csproj"
COPY . .
WORKDIR /src/FreeToolsBlog.Api
RUN dotnet publish "FreeToolsBlog.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FreeToolsBlog.Api.dll"]