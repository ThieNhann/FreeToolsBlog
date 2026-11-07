# FreeToolsBlog

## Admin authentication

Configure these values through .NET User Secrets or environment variables before starting the API:

- `Jwt:SecretKey`: a random secret of at least 32 bytes
- `Admin:Username` and `Admin:Password`: credentials used to create or initialize the admin account

For example, from `FreeToolsBlog.Api`:

```powershell
dotnet user-secrets init
dotnet user-secrets set "Jwt:SecretKey" "<random-secret-of-at-least-32-bytes>"
dotnet user-secrets set "Admin:Username" "admin"
dotnet user-secrets set "Admin:Password" "<strong-password>"
```

The configured admin account is created on database migration. If that account already exists with an empty password hash, its password is initialized; otherwise its password is not overwritten. Admin post changes require a bearer token from `POST /login` using the admin email and password.

## API rate limits

The API uses ASP.NET Core's in-memory fixed-window rate limiter. Limits are per client IP for public reads, login, and comment submissions; admin post changes are limited per authenticated admin ID.

| Requests | Limit |
| --- | --- |
| Public post and comment reads | 120 per minute |
| Login attempts | 5 per 5 minutes |
| Comment submissions | 3 per minute |
| Admin post changes | 60 per minute |

Requests over a limit receive `429 Too Many Requests`, a Problem Details response, and a `Retry-After` header. Excess requests are rejected immediately rather than queued. These are starting limits and may need adjustment for real traffic; readers behind the same NAT, office, or VPN share the public IP-based limit.

The limiter reads `RemoteIpAddress`. When deploying behind a reverse proxy, configure ASP.NET Core forwarded headers to trust only that proxy; do not trust arbitrary client-supplied `X-Forwarded-For` values. In-memory limits are local to one API process and reset when it restarts, so a multi-instance deployment needs a shared limiter or enforcement at the gateway.

## Deploy miễn phí

Hướng dẫn deploy frontend, API và PostgreSQL: [DEPLOY-FREE.md](./DEPLOY-FREE.md).