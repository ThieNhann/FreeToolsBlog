# Backend inventory

This inventory is based on the current ASP.NET minimal API source, EF Core model, and migration snapshot. It describes the existing API as implemented; it does not imply that unsafe behavior is secured by the frontend.

## API endpoints

All paths below are relative to the API origin. JSON field names are shown in their usual ASP.NET camel-case form.

| Method and route | Access | Request | Response and behavior |
| --- | --- | --- | --- |
| `POST /login` | Anonymous | `{ "email": string, "password": string }` | `200 { "accessToken": string }`; `401` for missing, non-admin, or invalid credentials. The JWT carries the numeric name-identifier, username, and Admin role. |
| `GET /posts?pageNumber=1&pageSize=10` | Anonymous | Optional pagination query | `200 PagedResponse<Post>` with `data`, `pageNumber`, `pageSize`, `totalRecords`, `totalPages`. Orders by ascending post ID; page size is capped at 50. Includes drafts. |
| `GET /posts/{slug}` | Anonymous | Slug path segment | `200 PostSummaryDto` or `404`. Includes the full content and all comments. Does not check `IsPublished`. |
| `GET /posts/{postId}/comments?pageNumber=1&pageSize=10` | Anonymous | Optional pagination query | `200 PagedResponse<Comment>` ordered by comment creation time. Page size is capped at 50. The current existence check tests whether any post exists, rather than whether the requested post exists. |
| `POST /posts/{postId}/comments` | Anonymous | `{ "name": string, "content": string }` | `201 CommentDto` and a `Location` for the post; `404` if the post ID is missing. Name is required and limited to 100 characters; content is required. |
| `POST /admin/posts/` | Admin JWT | `{ "title": string, "slug": string, "summary": string, "content": string, "coverImageUrl": string|null, "userId": number }` | `201 { "id": number, "slug": string }`; `409` for a duplicate slug. Always creates a draft and sets both timestamps. Title and slug are required, max 200; summary required, max 500; user ID must be positive. |
| `PUT /admin/posts/{id}` | Admin JWT | `{ "title": string, "slug": string, "summary": string, "content": string, "isPublished": boolean, "coverImageUrl": string|null }` | `200` empty response; `404` if missing; `409` for a duplicate slug. Replaces all editable values and updates `UpdatedAt`. Title and slug max 200; summary max 500. |
| `DELETE /admin/posts/{id}` | Admin JWT | None | `204`; `404` if missing. Cascades to its comments. |

There is no admin post-list/detail API, current-user API, search/filter endpoint, category/tag API, or comment moderation endpoint. Admin post listing in the interface uses the existing paged `GET /posts` endpoint with the JWT.

## Data models and DTOs

- **Post**: `Id`, `Title`, `Slug`, `Summary`, `Content`, `IsPublished` (defaults false), nullable `CoverImageUrl`, `CreatedAt`, `UpdatedAt`, `UserId`, `User`, and `Comments`.
- **User**: `Id`, `Username`, `PasswordHash`, `Email`, `IsAdmin`, `CreatedAt`, and `Posts`. Password hashes are never requested by this frontend.
- **Comment**: `Id`, `Name`, `Content`, `CreatedAt`, `PostId`, and `Post`.
- **PostSummaryDto**: `id`, `title`, `slug`, `summary`, `content`, nullable `coverImageUrl`, `createdAt`, `updatedAt`, `userName`, and comments (`name`, `content`, `createdAt`). The frontend separately loads paged comments for the article view.
- **CreatePostDto**: `title`, `slug`, `summary`, `content`, nullable `coverImageUrl`, `userId`.
- **EditPostDto**: `title`, `slug`, `summary`, `content`, `isPublished`, nullable `coverImageUrl`.
- **CreateCommentDto**: `name`, `content`.
- **CommentDto**: `name`, `content`, `createdAt`.
- **PagedResponse<T>**: `data`, `pageNumber`, `pageSize`, `totalRecords`, computed `totalPages`. Pagination defaults to page 1 and size 10; size is capped at 50.

## Database schema

The active EF Core snapshot defines three SQLite tables:

| Table | Columns | Constraints and relationships |
| --- | --- | --- |
| `Users` | `Id` INTEGER; `Username`, `PasswordHash`, `Email` TEXT; `IsAdmin` INTEGER; `CreatedAt` TEXT | All columns are required. `Id` is the generated primary key. No additional unique index is configured in the current model. |
| `Posts` | `Id` INTEGER; `Title`, `Slug`, `Summary`, `Content` TEXT; `IsPublished` INTEGER; nullable `CoverImageUrl` TEXT; `CreatedAt`, `UpdatedAt` TEXT; `UserId` INTEGER | All columns except `CoverImageUrl` are required. `Id` is the generated primary key; `Slug` has a unique index; `UserId` has an index and required FK `UserId → Users.Id` with delete cascade. |
| `Comments` | `Id` INTEGER; `Name`, `Content` TEXT; `CreatedAt` TEXT; `PostId` INTEGER | All columns are required. `Id` is the generated primary key; `PostId` has an index and required FK `PostId → Posts.Id` with delete cascade. |

SQLite stores booleans as integer values and timestamps as text. Historical migrations created categories, tags, and a post-tag join table, then removed them; those are not present in the active model/snapshot. Current schema migrations also add comments and the user admin flag.

## Integration notes

- The frontend filters drafts in its public views because the list endpoint returns them. This is presentation only: both public post endpoints currently expose draft data. Enforce publication checks in the API before treating drafts as private.
- Creating a post requires `userId`; the frontend reads the name-identifier claim from the signed-in JWT. It never hardcodes or exposes credentials.
- For cross-origin development, `http://localhost:5173` is allowed in Development. Production must set `Frontend:AllowedOrigins` to the deployed frontend origin. The frontend API origin is configured with `VITE_API_BASE_URL`.
- The UI sends comment and post content as plain text and renders article text safely as paragraphs; no HTML or markdown rendering capability is provided by the backend contract.
