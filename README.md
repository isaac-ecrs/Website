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
