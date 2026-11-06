# FreeToolsBlog frontend

## Scope

The React frontend at `FreeToolsBlog.Web/` provides a public post index, article detail and comments, plus the existing admin sign-in and post management workflows.

## Mode

Read for the public index and article pages; Operate for the authenticated admin workflow.

## FORM

seed:e8c3ec20eaae7fee — The Daily Index. Newspaper wayfinding frames a readable article column. Keep the masthead, rules, and section openings distinctive while article copy remains calm and easy to read. Use only post and comment fields present in the API; do not invent categories or search endpoints.

## Visitor path

Public readers move from the paginated post list to an article and its comments. The admin signs in, reviews all posts, creates or edits a post, chooses draft or published status, and may delete posts. There is no comment moderation, user management, category, tag, or search API.

## Content and behavior

- Use real API data. The existing seeded posts are Vietnamese; frontend interface copy is Vietnamese.
- Public list pages hide records with `isPublished: false`. The current API still returns draft records in its public list and returns detail by slug without a publication check, so the interface verifies publication before rendering a direct article route.
- Creating a post always creates a draft; publishing immediately requires a follow-up update request.
- Show loading, empty, validation, authentication, network, conflict, and API error states with recovery actions.
- Preserve existing API routes, DTOs, models, and database schema.

## Responsive and access requirements

Use semantic headings, native links and form controls, visible keyboard focus, readable article measure, and structural layout changes for narrow screens. Respect reduced-motion preferences.
