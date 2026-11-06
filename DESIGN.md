---
name: FreeToolsBlog
description: A restrained newspaper index for finding and reading free tool guides.
colors:
  paper: "#f6f3eb"
  ink: "#20211f"
  olive: "#4c5948"
  editorial-red: "#913d2b"
  rule: "#b7b3a8"
  paper-white: "#fffdf8"
  body-muted: "#50564f"
typography:
  display:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "clamp(30px, 4vw, 42px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "clamp(34px, 4.3vw, 50px)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  article:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
rounded:
  control: "4px"
  notice: "3px"
  status-pill: "999px"
components:
  button-primary:
    backgroundColor: "#202a23"
    textColor: "#fffdf8"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "#3f5143"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "#303b32"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
    height: "42px"
  text-field:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 11px"
    height: "42px"
---

# Design System: FreeToolsBlog

## Overview

**Creative North Star: "The Daily Index"**

Newspaper wayfinding frames the reading experience: a centered masthead, double rules, compact metadata, and ruled story rows organize the index without competing with the posts. Literata brings the editorial voice to titles and article copy; Manrope handles navigation, metadata, and controls with a clear, contemporary counterpoint.

The public pages stay quiet and legible, with warm paper, dark ink, olive details, and a restrained red-brown accent. Admin screens use the same palette and type system, adding compact controls and status markers for task clarity. The source defines a light appearance, visible keyboard focus, and reduced-motion handling.

**Key Characteristics:**
- Newspaper masthead and double-rule framing
- Warm paper surfaces, ink text, olive wayfinding, and sparing red-brown accents
- Serif-led headlines and article reading, sans-serif interface labels
- Flat, ruled layouts with minimal rounded control surfaces

## Colors

The palette pairs warm off-white paper and charcoal ink with muted olive and a restrained editorial red-brown accent.

### Primary
- **Editorial Red-Brown** (`colors.editorial-red`): Interactive emphasis, story-link hover, and focus treatments.

### Secondary
- **Muted Olive** (`colors.olive`): Masthead note, navigation, and calm status-related accents.

### Neutral
- **Warm Paper** (`colors.paper`): Page canvas.
- **Deep Ink** (`colors.ink`): Main text and wordmark.
- **Paper White** (`colors.paper-white`): Form fields and light button text.
- **Muted Body Gray** (`colors.body-muted`): Summaries, metadata, and supporting copy.
- **Rule Gray** (`colors.rule`): Shared token for quiet boundaries; the stylesheet also uses related gray-brown values for specific rules and borders.

## Typography

**Display Font:** Literata (with Georgia, serif fallback)  
**Body Font:** Manrope (with system-ui, sans-serif fallback)  
**Label/Mono Font:** Manrope (same sans-serif stack; no distinct mono face is defined)

**Character:** Literata gives the masthead, section titles, and article body an editorial texture. Manrope keeps small interface copy and form labels compact and direct.

### Hierarchy
- **Display** (600, responsive 30–42px, 1.2 line-height): Wordmark and footer wordmark.
- **Headline** (500, responsive 34–50px, 1.12 line-height): Index and primary page headings; article headings scale to 36–54px.
- **Title** (500, 25px, 1.28 line-height): Post titles, with the featured row at 31px; section headings use 25px.
- **Body** (400, 15px, 1.7 line-height): Interface descriptions and summaries; article text uses Literata at 17px with 1.85 line-height in a 700px column.
- **Label** (700, 12px): Buttons and field labels. Masthead note is 11px, uppercase, with 0.13em tracking.

## Layout

The public index centers a wide masthead (up to 1280px) above a narrower page shell (up to 1060px). The intro is centered and capped at 760px; post rows use a 138px metadata rail and a flexible text column, divided by thin rules. Article copy narrows to 700px for reading. At 760px and below, outer gutters reduce from 32px to 18px and post rows stack; at 440px and below, footer and comment metadata stack vertically. Admin grids also collapse to one column at the tablet breakpoint.

Spacing is expressed directly in component CSS rather than through a shared spacing token scale; preserve the observed local values and generous section gaps when extending these patterns.

## Elevation & Depth

The interface is flat: depth comes from paper-to-field contrast, double masthead and section rules, and single row dividers. No box-shadow vocabulary is defined. Loading placeholders use a subtle opacity pulse; hover transitions are short and respect reduced-motion preferences.

## Shapes

Public editorial content is mostly square-edged and separated by rules. Admin buttons and fields use a small radius (4px), notices a slightly tighter radius (3px), and status labels are fully pill-shaped (999px). Focus is visible as a solid 3px outline with offset.

## Components

### Buttons

Compact, typographic actions sit naturally within the editorial system.
- **Shape:** Gently rounded controls (4px); minimum height 42px.
- **Primary:** Deep green-charcoal background, warm-white text, and 10px 15px padding. Hover shifts to a lighter muted green.
- **Quiet:** Transparent background with a gray-green border and text; hover gains a warm gray fill.
- **Focus:** Global keyboard focus outline remains visible.

### Inputs / Fields

Fields are quiet, high-contrast working surfaces.
- **Style:** Warm-white fill, gray-brown 1px border, 4px radius, and 10px 11px padding.
- **Focus:** Border and 2px outline shift to brown with a 1px offset; global focus-visible outline also applies.
- **Textareas:** Start at 98px minimum height and remain vertically resizable; the post editor content area is taller.

### Navigation

The centered masthead is the primary wayfinding signature.
- **Style:** Literata wordmark between double rules, a small uppercase olive note, then centered Manrope links.
- **States:** Links are muted green at rest and red-brown with an underline on hover. Navigation remains centered on narrow screens.

### Cards / Containers

The post index uses ruled rows rather than elevated cards.
- **Background:** Transparent over the paper canvas.
- **Border:** Thin bottom dividers; featured content receives additional vertical padding and a larger title.
- **Responsive behavior:** Metadata and story text stack into a single column on narrow screens.

### Status Labels

Admin status is expressed as a compact pill rather than a prominent banner.
- **Shape:** Full pill (999px), with 5px 9px padding.
- **Published:** Pale green-gray fill and dark green text; drafts use warm gray-beige and brown text.

## Do's and Don'ts

### Do:
- **Do** keep article text in the narrow serif reading column and preserve its generous line-height.
- **Do** use rules, alignment, and whitespace to organize public content.
- **Do** keep focus indicators visible and honor reduced-motion preferences.

### Don't:
- **Don't** add heavy shadows to surfaces; depth is carried by tonal contrast and rules.
- **Don't** turn public post rows into raised, rounded cards.
- **Don't** introduce additional font families or accent colors without updating the established palette.
