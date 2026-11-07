# FreeToolsBlog Web

React, TypeScript, Vite, and Tailwind frontend for the existing FreeToolsBlog API.

## Run locally

1. Configure the API's JWT key and admin credentials as described in the root README.
2. From the repository root, start the API with `dotnet run --project FreeToolsBlog.Api --launch-profile http`. It listens at `http://localhost:5175` and allows the Vite origin in Development.
3. From this directory, install dependencies and start the frontend:

   ```powershell
   npm install
   Copy-Item .env.example .env.local
   npm run dev
   ```

4. Open the Vite URL printed by the dev server. The admin sign-in uses the email and password configured for the API.

Set `VITE_API_BASE_URL` to the API origin when it differs from `http://localhost:5175`. In production, set the API's `Frontend:AllowedOrigins` configuration to the deployed frontend origin and set `VITE_API_BASE_URL` before building. Configure the static host to serve `index.html` for frontend routes such as `/posts/{slug}` and `/admin/posts/{id}`. The API remains responsible for JWT validation and role authorization.

## API behavior the interface relies on

- Post listing uses `GET /posts?pageNumber={n}&pageSize={n}`; page size is capped at 50. Guests receive published posts only. An authenticated Admin bearer token also allows the admin interface to list drafts.
- Post detail uses `GET /posts/{slug}` and returns `404` for drafts, including when requested directly by slug.
- Comments use `GET /posts/{postId}/comments` and `POST /posts/{postId}/comments`.
- Admin sign-in uses `POST /login`; post create, update, and delete use `/admin/posts`. Create requests need the numeric user ID from the signed JWT's name-identifier claim because the API has no current-user or admin-list endpoint.
- New posts are created as drafts by the API. Publishing an existing post uses the update endpoint.

The API currently has no separate admin-only post-list endpoint; the existing listing includes drafts only for authenticated Admin requests. The frontend does not add API routes or change the database schema.
