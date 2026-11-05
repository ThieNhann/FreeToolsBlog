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