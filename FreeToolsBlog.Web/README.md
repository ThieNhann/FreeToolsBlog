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

- Public post listing uses `GET /posts?pageNumber={n}&pageSize={n}`; page size is capped at 50. The API includes drafts in that response, so the reader interface filters out records whose `isPublished` value is false. This client-side filter does not secure draft content; the current API exposes that content publicly.
- Public post detail uses `GET /posts/{slug}`. It currently returns a post by slug without checking `isPublished`; the interface checks the post list before rendering a direct article route, but the API itself still exposes the draft response. Enforce publication checks in the API before using it for sensitive drafts.
- Comments use `GET /posts/{postId}/comments` and `POST /posts/{postId}/comments`.
- Admin sign-in uses `POST /login`; post create, update, and delete use `/admin/posts`. Create requests need the numeric user ID from the signed JWT's name-identifier claim because the API has no current-user or admin-list endpoint.
- New posts are created as drafts by the API. Publishing an existing post uses the update endpoint.

The API currently exposes no filtering or search endpoint and no admin-only post-list endpoint. The frontend does not add API routes or change the database schema.
