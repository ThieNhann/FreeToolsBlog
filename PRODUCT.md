# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Public readers use the blog to find and read posts about free tools.
- An admin author manages posts through the protected admin API.

## Product Purpose

FreeToolsBlog publishes posts about free tools for public readers. The repository currently supports reading posts and comments, submitting comments, and admin post management.

## Positioning

No meaningfully distinct mechanism or market position has been established. Do not invent claims about tool coverage, curation, or quality.

## Operating Context

Readers access posts and comments through public web API endpoints. The admin signs in to receive a bearer token and uses it to create, edit, publish, or delete posts. The API uses SQLite for persistence.

## Capabilities and Constraints

- The existing implementation is a .NET 10 web API with SQLite.
- Public endpoints provide paginated post and comment reads, post lookup by slug, and comment submission.
- Admin post management is protected by JWT authentication and an Admin role.
- Admin credentials and the JWT signing key are configured through .NET User Secrets or environment variables; the signing key must be at least 32 bytes.
- Whether a separate reader-facing website exists is undecided; none is present in this repository.

## Brand Commitments

- Product name: FreeToolsBlog.

## Evidence on Hand

- API implementation: `FreeToolsBlog.Api/Endpoints/PublicEndpoints.cs` and `FreeToolsBlog.Api/Endpoints/AdminEndpoints.cs`.
- Data models: `FreeToolsBlog.Api/Models/`.
- Setup and admin authentication notes: `README.md`.
- No testimonials, audience research, or external proof assets are present in the repository.

## Product Principles

- Make posts available to public readers without requiring admin authentication.
- Keep post management restricted to authenticated admins.
- Preserve post and comment content as the central product material.
- Do not make unsupported claims about the tools or their benefits.
