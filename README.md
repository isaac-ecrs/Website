# ECRS Website

Eastern Cooperative Recreation School (ECRS) website built with [Astro](https://astro.build), [SASS/SCSS](https://sass-lang.com), and [TypeScript](https://www.typescriptlang.org). Content is managed via [Decap CMS](https://decapcms.org) with an editorial workflow and local development support.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/isaac-ecrs/Website.git
cd Website

# Install dependencies
npm install
```

### Development

```bash
# Start development server (http://localhost:3000)
npm run dev

# For Decap CMS local testing with both dev server and CMS proxy
npm run dev:cms
```

Then navigate to `http://localhost:3000/admin/` to access the CMS.

### Building

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Code Quality

```bash
# Run linting and type checking
npm run lint

# Format code with Prettier
npm run format
```

## Project Structure

```
src/
├── content/              # Content collections (markdown)
│   ├── events/          # Event listings
│   ├── pages/           # Content pages
│   ├── navigation/      # Navigation data
│   └── config.ts        # Content schema definitions
├── components/          # Reusable Astro components
├── layouts/             # Layout wrappers
├── pages/               # File-based routing
└── styles/              # Global and component styles
public/
├── admin/               # Decap CMS interface
└── events/              # Event images
```

## Understanding Astro (For JavaScript Developers)

If you're coming from vanilla HTML/CSS/JS or other frameworks, here are the key Astro concepts you'll encounter in this codebase.

### Component Anatomy

Astro components (`.astro` files) have a unique two-part structure:

```astro
---
// This is the "frontmatter fence" - runs at BUILD time on the server
// Import dependencies, fetch data, define variables here
import Hero from '../components/Hero.astro';
const title = 'Hello World';
---

<!-- This is the template - becomes static HTML -->
<Hero title={title} />
<p>Regular HTML with {expressions} for dynamic values</p>

<style lang="scss">
  /* Styles are automatically scoped to this component */
</style>
```

**Why the fence?** The code between `---` runs during the build, not in the browser. This means you can import modules, call APIs, and do complex logic without shipping any of that JavaScript to users.

### File-based Routing

Files in `src/pages/` automatically become routes:

- `src/pages/index.astro` → `/`
- `src/pages/about.astro` → `/about`
- `src/pages/events/index.astro` → `/events`
- `src/pages/events/[...slug].astro` → `/events/anything` (dynamic route)

### Content Collections

Instead of hardcoding content in components, we store it in markdown files (`src/content/`) with type-safe schemas:

```typescript
// src/content/config.ts - defines what fields each content type has
const eventsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    startDate: z.coerce.date(),
    // ... Zod validates content at build time
  }),
});
```

**Why?** TypeScript knows exactly what fields exist in your content. If you typo `page.data.titl`, you get an error before the site builds.

### Scoped Styles

Styles in `<style>` blocks are automatically scoped to that component:

```astro
<p class="intro">Hello</p>

<style>
  .intro {
    color: blue;
  } /* Only affects THIS component's .intro */
</style>
```

To style content rendered from markdown (using `set:html`), wrap selectors in `:global()`:

```scss
.intro :global(p) {
  /* Targets <p> tags inside .intro, even from markdown */
  font-size: 18px;
}
```

### The `set:html` Directive

When rendering markdown or any HTML string, use `set:html`:

```astro
---
import { marked } from 'marked';
const htmlContent = marked.parse(markdownString);
---

<div set:html={htmlContent} />
```

**Why not `{htmlContent}`?** Curly braces escape HTML for security. `set:html` renders it as actual HTML.

### Key Differences from Plain HTML

| Plain HTML           | Astro                                        |
| -------------------- | -------------------------------------------- |
| `<script src="...">` | `<script>import '...';</script>` (bundled)   |
| Global CSS           | Scoped by default                            |
| Runtime JS           | Build-time by default                        |
| Link with `href`     | Same, but no `.html` extension needed        |
| Separate CSS files   | Inline `<style>` blocks (extracted at build) |

## Decap CMS

### Local Development

The CMS can be run locally without authentication:

```bash
npm run dev:cms
```

This starts both the Astro dev server and the Decap CMS proxy server on `http://localhost:8081`.

### Editorial Workflow

Content goes through a review process:

1. **Draft** - Save content without publishing
2. **In Review** - Ready for editor review
3. **Ready** - Approved and ready to merge
4. **Published** - Merged to main branch

Each state creates a pull request in your Git repository.

### Adding/Editing Content

All content is stored as markdown files in `src/content/`:

- **Events** - Create new event listings in `src/content/events/`
- **Pages** - Edit page content in `src/content/pages/`

## Tech Stack

- **Framework**: Astro 5
- **Styling**: SASS/SCSS with component-scoped styles
- **Language**: TypeScript (strict mode)
- **CMS**: Decap CMS with editorial workflow
- **Deployment**: Netlify (with Git Gateway)
- **Code Quality**: ESLint 9, Prettier
- **Package Manager**: npm

## Scripts

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start development server     |
| `npm run dev:cms`   | Start dev server + CMS proxy |
| `npm run cms:proxy` | Start CMS proxy server only  |
| `npm run build`     | Build for production         |
| `npm run preview`   | Preview production build     |
| `npm run lint`      | Run ESLint and type checking |
| `npm run format`    | Format code with Prettier    |

## Deployment

The site is deployed on Netlify with automatic deployments from the `main` branch. Configuration is in `netlify.toml`.

### Branch Deployment

- **main** - Automatic production deployment
- **Other branches** - Available for preview deployments

## Configuration

### Environment Variables

Create a `.env` file for local development (not committed to Git):

```
# Add any environment variables needed here
```

### Astro Config

See `astro.config.mjs` for Astro-specific configuration including:

- Netlify adapter
- Image optimization
- Markdown processing

### Content Schemas

Content collection schemas are defined in `src/content/config.ts` using Zod for type safety.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` and `npm run format` before committing
4. Commit with clear messages
5. Push and create a pull request

## Resources

- [Astro Documentation](https://docs.astro.build)
- [Decap CMS Documentation](https://decapcms.org/docs/intro/)
- [SASS Documentation](https://sass-lang.com/documentation)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## License

All rights reserved © 2025 Eastern Cooperative Recreation School (ECRS)
