# Deploy FreeToolsBlog miễn phí

Hướng dẫn này triển khai frontend React/Vite lên Cloudflare Pages, API .NET lên Render và database PostgreSQL lên Neon. Các gói miễn phí phù hợp để làm portfolio/demo; chúng không có cam kết uptime hay hỗ trợ production.

## 0. Kiến trúc sau khi deploy

```text
Trình duyệt
  ├─ Frontend React/Vite       Cloudflare Pages
  └─ API ASP.NET Core          Render (Docker)
       └─ PostgreSQL           Neon
```

Frontend hiện cần gọi API bằng `VITE_API_BASE_URL`. API hiện dùng SQLite, đăng ký database trong `FreeToolsBlog.Api/Data/DataExtension.cs`, và tự chạy migration khi khởi động thông qua `MigrateDb()`. Vì filesystem của Render Free không bền vững, không dùng file SQLite trên Render để giữ dữ liệu.

### Điều kiện tiên quyết

- Tài khoản GitHub có repository này.
- Tài khoản Cloudflare, Render và Neon.
- .NET 10 SDK và Node.js cài trên máy để kiểm tra local.
- Repository sạch các secret: không đưa mật khẩu database, JWT key hoặc mật khẩu admin vào Git.

> Gói miễn phí và giới hạn có thể thay đổi. Kiểm tra trang pricing/free chính thức trước khi triển khai: [Cloudflare Pages](https://pages.cloudflare.com/), [Render Free](https://render.com/docs/free), [Neon Pricing](https://neon.com/pricing).

## 1. Quyết định có giữ database SQLite hiện tại không

Chọn một trong hai trường hợp trước khi thay đổi provider:

### A. Không cần giữ dữ liệu hiện có — cách ngắn nhất cho portfolio

Tạo database PostgreSQL mới và để app tạo schema cùng bài viết demo từ seeding hiện có. Các bước bên dưới giả định bạn chọn cách này.

**Không xóa file `ToolsBlog.Db` để chuyển đổi.** Database SQLite cũ không được chuyển tự động; bạn có thể giữ bản backup để tham khảo.

### B. Cần giữ bài viết, bình luận hoặc dữ liệu tài khoản hiện có

Không làm theo bước xóa bộ migration cũ ở mục 3. Đổi EF Core provider không tự chuyển schema hay dữ liệu giữa hai loại database. Trước tiên cần:

1. Sao lưu file SQLite và xác nhận có thể khôi phục.
2. Tạo schema PostgreSQL bằng bộ migration riêng.
3. Chuyển users, posts, comments theo đúng thứ tự khóa ngoại, giữ nguyên ID nếu cần.
4. Kiểm tra số lượng bản ghi, quan hệ và đăng nhập admin trước khi đưa API mới ra public.

Không import thẳng file SQLite hoặc chạy migration SQLite trên PostgreSQL. Nếu dữ liệu này quan trọng, hãy dừng ở đây và lập kế hoạch chuyển dữ liệu riêng trước khi đụng vào migrations.

## 2. Tạo PostgreSQL database trên Neon

1. Đăng ký/đăng nhập [Neon](https://neon.tech/).
2. Tạo một project PostgreSQL mới, chọn region gần nơi bạn muốn phục vụ người dùng.
3. Mở trang **Connect** của project và chọn database/role.
4. Lưu lại các thông tin kết nối hoặc connection string; không đưa chúng vào Git.
5. Dùng SSL. Npgsql connection string dạng chuẩn có dạng:

   ```text
   Host=<host>;Database=<database>;Username=<username>;Password=<password>;SSL Mode=Require
   ```

   Thay các giá trị trong dấu `<...>` bằng thông tin Neon. Nếu Neon hiển thị connection string URI dạng `postgresql://...`, lấy host, database, username và password để điền vào dạng chuẩn phía trên; không dán nguyên URI vào cấu hình Npgsql nếu chưa xác nhận driver đang dùng hỗ trợ URI đó.

Neon Free có giới hạn compute/storage và tự scale về 0 khi không hoạt động; request đầu sau thời gian idle có thể chậm. Không nhầm với Render Postgres Free: gói Render Free hiện có giới hạn vòng đời database, nên không phù hợp làm nơi lưu dữ liệu lâu dài.

## 3. Chuyển API từ SQLite sang PostgreSQL

### 3.1 Tạo nhánh và sao lưu

Tạo nhánh riêng để có thể quay lại nếu migration mới không chạy:

```powershell
git switch -c deploy/postgresql
```

Nếu đang có dữ liệu SQLite cần tham khảo, tạo bản sao file database trước. File mặc định là `ToolsBlog.Db`, nhưng đường dẫn thực tế phụ thuộc working directory khi chạy API. Kiểm tra vị trí file trước khi sao lưu; đừng giả định có thể khôi phục dữ liệu từ migration.

### 3.2 Cài Npgsql EF Core provider

Từ thư mục gốc repository:

```powershell
dotnet remove .\FreeToolsBlog.Api\FreeToolsBlog.Api.csproj package Microsoft.EntityFrameworkCore.Sqlite
dotnet add .\FreeToolsBlog.Api\FreeToolsBlog.Api.csproj package Npgsql.EntityFrameworkCore.PostgreSQL --version 10.*
```

Provider Npgsql phải cùng major version với EF Core đang dùng (10.x trong project hiện tại). Kiểm tra package references sau lệnh:

```powershell
dotnet list .\FreeToolsBlog.Api\FreeToolsBlog.Api.csproj package
```

Giữ `Microsoft.EntityFrameworkCore.Design`; công cụ tạo migration cần package này.

### 3.3 Đổi đăng ký database

Mở `FreeToolsBlog.Api/Data/DataExtension.cs`. Trong `AddAppDb()`, đổi đăng ký SQLite:

```csharp
builder.Services.AddSqlite<AppDbContext>(
    connString,
    optionsAction: options => options.UseSeeding((context, _) =>
    {
        // Nội dung seeding hiện tại
    })
);
```

thành đăng ký PostgreSQL:

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connString)
        .UseSeeding((context, _) =>
        {
            // Giữ nguyên toàn bộ nội dung seeding hiện tại ở đây
        }));
```

Giữ nguyên phần kiểm tra `Admin:Username`/`Admin:Password` và toàn bộ nội dung seeding đang có. Không thêm password hoặc connection string vào `appsettings.json`.

### 3.4 Tạo migration PostgreSQL mới

Các migration hiện có trong `FreeToolsBlog.Api/Data/Migrations/` được sinh cho SQLite. Với lựa chọn **không giữ dữ liệu cũ**:

1. Xác nhận không có môi trường nào đang dùng bộ migration hiện tại để lưu dữ liệu cần giữ.
2. Trong VS Code Explorer, xóa các file migration sinh tự động trong `FreeToolsBlog.Api/Data/Migrations/`, bao gồm migration `.cs`, file `.Designer.cs` và `AppDbContextModelSnapshot.cs`. Đây là lịch sử schema trong source control; thao tác này **không xóa** file SQLite.
3. Tạo migration mới từ model hiện tại:

   ```powershell
   dotnet ef migrations add InitialPostgres --project .\FreeToolsBlog.Api --startup-project .\FreeToolsBlog.Api
   ```

Nếu lệnh `dotnet ef` chưa có, cài công cụ khớp với EF Core 10.0.14 đang có trong project rồi chạy lại:

```powershell
dotnet tool install --global dotnet-ef --version 10.0.14
```

Sau đó mở migration mới và kiểm tra nó tạo các bảng cần thiết: `Users`, `Posts`, `Comments` cùng khóa ngoại/index tương ứng. Kiểm tra không còn annotation kiểu `Sqlite:Autoincrement` hoặc kiểu cột `INTEGER`/`TEXT` đặc thù SQLite.

Build API:

   ```powershell
   dotnet build .\FreeToolsBlog.Api\FreeToolsBlog.Api.csproj
   ```

Nếu project từng được deploy hoặc migration cũ đã chạy trên database cần giữ, **không xóa/chỉnh lịch sử migration đó**. Dùng quy trình riêng cho dữ liệu cần bảo toàn ở mục 1B.

### 3.5 Connection string local (tuỳ chọn)

Để chạy API local với Neon, đặt connection string bằng .NET User Secrets, không sửa `appsettings.json`:

```powershell
dotnet user-secrets set "ConnectionStrings:ToolsBlog" "Host=<host>;Database=<database>;Username=<username>;Password=<password>;SSL Mode=Require" --project .\FreeToolsBlog.Api
```

User Secrets chỉ dùng cho môi trường phát triển. Ở production, cấu hình biến môi trường trực tiếp trong Render ở mục 5.

## 4. Kiểm tra API local trước khi deploy

### 4.1 Cấu hình secrets local

API hiện yêu cầu JWT secret tối thiểu 32 bytes. Có thể tạo chuỗi ngẫu nhiên trong PowerShell:

```powershell
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Đặt các giá trị local bằng User Secrets:

```powershell
dotnet user-secrets set "Jwt:SecretKey" "<chuỗi-ngẫu-nhiên-vừa-tạo>" --project .\FreeToolsBlog.Api
dotnet user-secrets set "Admin:Username" "siteadmin" --project .\FreeToolsBlog.Api
dotnet user-secrets set "Admin:Password" "<mật-khẩu-mạnh-riêng>" --project .\FreeToolsBlog.Api
dotnet user-secrets set "Frontend:AllowedOrigins:0" "http://localhost:5173" --project .\FreeToolsBlog.Api
```

Seeding hiện tạo email admin theo dạng `<Admin:Username>@freetoolsblog.local`. Ví dụ username `siteadmin` thì đăng nhập bằng `siteadmin@freetoolsblog.local` cùng password đã cấu hình.

### 4.2 Chạy thử

Mở PowerShell thứ nhất:

```powershell
dotnet run --project .\FreeToolsBlog.Api --launch-profile http
```

API local dùng port `5175`. Mở PowerShell thứ hai:

```powershell
Set-Location .\FreeToolsBlog.Web
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Đảm bảo `.env.local` có:

```text
VITE_API_BASE_URL=http://localhost:5175
```

Sau đó chạy:

```powershell
npm run dev
```

Kiểm tra trang đọc bài, danh sách bài demo và đăng nhập admin. Dừng cả hai tiến trình trước khi deploy.

## 5. Deploy API lên Render bằng Docker

### 5.1 Thêm Dockerfile ở repository root

Tạo file `Dockerfile` ở cùng cấp với `FreeToolsBlog.sln`:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["FreeToolsBlog.Api/FreeToolsBlog.Api.csproj", "FreeToolsBlog.Api/"]
RUN dotnet restore "FreeToolsBlog.Api/FreeToolsBlog.Api.csproj"

COPY . .
WORKDIR /src/FreeToolsBlog.Api
RUN dotnet publish "FreeToolsBlog.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FreeToolsBlog.Api.dll"]
```

### 5.2 Tạo Render Web Service

1. Push nhánh đã cập nhật lên GitHub.
2. Trong Render, chọn **New → Web Service**, kết nối GitHub và chọn repository.
3. Chọn runtime **Docker**.
4. Đặt Dockerfile path là `./Dockerfile`; build context là repository root (`.`).
5. Chọn region gần Neon nếu có thể và chọn **Free**.
6. Trước khi deploy, thêm các environment variables sau trong **Environment**:

   | Key | Value |
   | --- | --- |
   | `ConnectionStrings__ToolsBlog` | Connection string Npgsql của Neon |
   | `Jwt__SecretKey` | Chuỗi ngẫu nhiên tối thiểu 32 bytes |
   | `Admin__Username` | Tên admin, ví dụ `siteadmin` |
   | `Admin__Password` | Mật khẩu admin mạnh, không dùng lại mật khẩu cá nhân |
   | `Frontend__AllowedOrigins__0` | URL frontend Cloudflare Pages, sẽ có sau mục 6 |

   Nếu tạo API trước frontend, có thể deploy tạm với origin dự kiến `https://<ten-project>.pages.dev`, sau đó sửa lại đúng URL thực tế.

7. Không đặt database vào file trong container. App gọi `MigrateDb()` khi khởi động; lần đầu API chạy sẽ áp dụng migration PostgreSQL và seeding hiện có.
8. Chọn **Create Web Service** và xem **Logs** đến khi deploy thành công.
9. Ghi lại URL API, ví dụ `https://<ten-service>.onrender.com`.

Render Free có thể đưa service vào trạng thái ngủ khi không có traffic; request đầu tiên sau đó có thể mất khoảng một phút. Filesystem local không bền vững, vì vậy không lưu database hoặc upload cần giữ trên đó.

## 6. Deploy frontend lên Cloudflare Pages

1. Trong Cloudflare Dashboard, chọn **Workers & Pages → Create → Pages → Connect to Git**.
2. Chọn repository GitHub.
3. Cấu hình build:

   | Cấu hình | Giá trị |
   | --- | --- |
   | Root directory | `FreeToolsBlog.Web` |
   | Build command | `npm ci && npm run build` |
   | Build output directory | `dist` |
   | Node.js version | `22.12.0` trở lên (Vite hiện tại yêu cầu Node `^20.19.0` hoặc `>=22.12.0`) |

4. Thêm build environment variable:

   | Key | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | URL API Render, ví dụ `https://<ten-service>.onrender.com` |
   | `NODE_VERSION` | `22.12.0` |

   Biến `VITE_*` được nhúng vào frontend public khi build; chỉ đặt URL API ở đây, tuyệt đối không đặt JWT secret, password hay connection string.

5. Chọn **Save and Deploy**.
6. Sau khi build xong, ghi lại URL `https://<ten-project>.pages.dev`.
7. Trở lại Render → API service → **Environment**, đặt `Frontend__AllowedOrigins__0` đúng bằng origin frontend (không thêm dấu `/` cuối), lưu và redeploy.
8. Nếu dùng custom domain sau này, thêm origin mới vào cấu hình CORS của API.

Frontend là SPA. Cloudflare Pages hỗ trợ fallback cho SPA mặc định khi không có file `404.html`; kiểm tra trực tiếp đường dẫn `/posts/<slug>` và `/admin/posts/<id>` sau deploy.

## 7. Kiểm tra sau deploy

1. Mở frontend Cloudflare Pages.
2. Mở URL API với endpoint:

   ```text
   https://<ten-service>.onrender.com/posts?pageNumber=1&pageSize=10
   ```

   Kỳ vọng nhận JSON response, không phải trang lỗi.

3. Trên frontend kiểm tra:
   - Danh sách bài và trang chi tiết tải được.
   - Bình luận tải và gửi được.
   - Đăng nhập admin bằng email `<Admin:Username>@freetoolsblog.local` và password đã cấu hình.
   - Tạo/chỉnh sửa bài hoạt động sau đăng nhập.
   - Refresh trực tiếp route bài viết/admin không trả về 404.
4. Mở Developer Tools → **Console** và **Network**. Nếu gặp CORS, kiểm tra `Frontend__AllowedOrigins__0` khớp chính xác scheme + hostname của Pages, rồi redeploy API.
5. Trong Render Logs, xác nhận app đã chạy migration và không báo lỗi kết nối database. Nếu deploy fail, kiểm tra log trước khi đổi cấu hình.

## 8. Kiểm tra bảo mật trước khi chia sẻ CV

- Không commit `Jwt:SecretKey`, password admin, Neon credentials hoặc `.env.local`.
- Đổi mọi mật khẩu demo trước khi public.
- API chỉ trả draft cho request có bearer token hợp lệ của Admin; guest chỉ thấy bài đã publish. Không đưa dữ liệu nhạy cảm lên một website công khai chỉ vì bài đang ở trạng thái draft.
- CORS chỉ cho phép đúng domain frontend; CORS không thay thế authentication/authorization.
- Free hosting phù hợp demo, không cam kết SLA, dữ liệu dự phòng hay thời gian phản hồi ổn định. Sao lưu dữ liệu Neon nếu nội dung bắt đầu có giá trị.

## 9. Cập nhật sau này

- Push commit lên GitHub để Cloudflare Pages build lại frontend.
- Render cũng tự deploy từ nhánh đã kết nối (nếu bật auto-deploy).
- Khi thay đổi model, tạo migration mới:

  ```powershell
  dotnet ef migrations add <TenMigration> --project .\FreeToolsBlog.Api --startup-project .\FreeToolsBlog.Api
  dotnet build .\FreeToolsBlog.Api\FreeToolsBlog.Api.csproj
  ```

- Commit migration cùng thay đổi model. Khi API khởi động, `MigrateDb()` áp dụng migration vào PostgreSQL.
- Không sửa/xóa migration đã chạy trên database có dữ liệu; tạo migration mới để thay đổi schema.
