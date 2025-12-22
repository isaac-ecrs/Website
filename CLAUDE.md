# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Eastern Cooperative Recreation School (ECRS) website, a static site built with **Astro**, **SASS/SCSS**, and **TypeScript**. The site uses a content-driven architecture with markdown-based Content Collections and Decap CMS for content management. It's deployed on Netlify.

## Essential Commands

### Development

- `npm run dev` or `npm start` - Start the development server (runs on http://localhost:3000)
- `npm run build` - Build the production site (output to `dist/`)
- `npm run preview` - Preview the production build locally

### Decap CMS Local Development

- `npm run cms:proxy` - Start the Decap CMS local backend server (runs on http://localhost:8081)
- `npm run dev:cms` - Start both the dev server and CMS proxy server concurrently

To use Decap CMS locally:

1. Run `npm run dev:cms` to start both servers
2. Navigate to `http://localhost:3000/admin/`
3. The CMS will use your local Git repository instead of requiring authentication
4. Changes are made directly to your local markdown files

### TypeScript

- TypeScript is configured with strict mode (`astro/tsconfigs/strict`)
- Check types with `astro` CLI if needed

## Project Structure

### High-Level Architecture

**Pages & Routing:**

- `src/pages/` - Static and dynamic pages (Astro file-based routing)
- `src/pages/index.astro` - Home page (main landing page)
- `src/pages/events/` - Events listing and dynamic event detail pages

**Content Collections:**

- `src/content/config.ts` - Defines two collections with Zod schemas:
  - `events` - Event listings with metadata (startDate, endDate, location, registrationEmail, featured flag, etc.)
  - `pages` - Content pages with hero sections, feature cards, and donation CTAs
- `src/content/events/` - Event markdown files
- `src/content/pages/` - Page markdown files (currently `home.md`)

**Components:**

- `src/components/` - Reusable Astro components (all `.astro` files)
  - `Header.astro` - Fixed navigation header
  - `Footer.astro` - Site footer
  - `BaseLayout.astro` - Main layout wrapper (imports global styles, includes Netlify Identity widget)
  - `Hero.astro` - Hero section with background image and CTA
  - `FeatureCard.astro` - 3-card feature section on home page
  - `ServiceCard.astro` - Service/program cards grid
  - `EventHighlight.astro` - Featured event display
  - `CTASection.astro` - Call-to-action section (donations, etc.)

**Assets:**

- `src/assets/images/` - All images (optimized via Astro Image)
- `src/assets/images/icons/` - SVG icons
- `src/assets/images/services/` - Service program images
- `src/assets/images/landing-page/` - Feature card images
- `src/assets/images/events/` - Event images

**Styles:**

- `src/styles/global.scss` - Global reset, utility classes, section styles
- `src/styles/_variables.scss` - Design tokens (colors, fonts, spacing, breakpoints, shadows)
- `src/styles/_mixins.scss` - SCSS mixins for responsive design and reusable patterns
- `src/styles/_typography.scss` - Font imports and typography utilities
- `src/styles/_animations.scss` - CSS animation definitions
- Component-scoped styles are defined in `<style lang="scss">` blocks within `.astro` files

### Color Palette (from `_variables.scss`)

- Primary: `$color-primary` (#378e3c - forest green)
- Accent: `$color-accent` (#faa634 - warm orange)
- Secondary: `$color-secondary` (#00afc6 - teal)
- Text: `$color-text-dark` (#454340 - dark brown)
- Backgrounds: Cream, tan, white, dark brown

### Responsive Design

- Breakpoints: Mobile (768px), Tablet (980px), Desktop (1200px)
- Mobile-first approach using `@include mobile` mixin
- Section dividers use CSS `clip-path` (not SVG)

## Key Patterns & Conventions

### Content Workflow

1. Content lives in markdown files in `src/content/`
2. Content schemas are validated in `src/content/config.ts` using Zod
3. Pages use `getEntry()` or `getCollection()` to fetch and render content
4. Featured events are flagged with a `featured: true` property for homepage highlighting

### Image Handling

- All images imported as ES6 imports (not strings)
- Use `Image` component from `astro:assets` for optimization
- Responsive images via `image-shadow` utility class and rounded containers

### Layout & Sections

- Main layout: `BaseLayout` wraps all pages
- Sections use modifier classes: `section--cream`, `section--tan`, `section--white`, `section--dark`
- Sections have automatic diagonal top dividers using CSS `clip-path`
- Grid utilities: `.grid-3` (3 columns) and `.grid-2` (2 columns) with mobile fallback to 1 column
- Container width: 80% with max-width of 1080px

### Styling Approach

- SCSS is scoped to components where possible (`<style lang="scss">` in `.astro` files)
- Global utilities in `global.scss` (buttons, containers, sections, grids)
- Design tokens in `_variables.scss`
- Responsive mixins in `_mixins.scss` (e.g., `@include mobile` for mobile breakpoint)
- Components use `@use` to import variables and mixins

### Button Styles

- Base class: `.btn`
- Variants: `.btn--primary`, `.btn--secondary`
- Defined via mixins (`button-base`, `button-primary`, `button-secondary`)

## Deployment & CMS

### Netlify Deployment

- Configured via `@astrojs/netlify` adapter with `edgeMiddleware: false`
- Site URL: https://ecrs.org

### Decap CMS Integration

- Netlify Identity widget loaded in `BaseLayout.astro` for authentication
- Content is stored in git (markdown files)
- Admin panel available at `/admin/`
- **Editorial Workflow enabled**: Content goes through Draft → In Review → Ready states before publishing
  - Draft: Content is saved as a draft and not published
  - In Review: Content is ready for review by editors
  - Ready: Content is approved and ready to be published
  - Each state is managed via pull requests in the Git repository
- **Local backend support**: Use `local_backend: true` in config for local development without authentication

## Important Notes

- The navigation links in `Header.astro` currently use Lorem Ipsum placeholder text
- Service program details are managed in the home page markdown (`src/content/pages/home.md`)
- Events have a `featured` flag to highlight a specific event on the homepage
- Mobile navigation is marked as "TODO" in Header.astro
- All content is static (no server-side rendering) - built at deploy time
