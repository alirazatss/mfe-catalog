# Landing Page - Standalone React Application

A standalone React application for the CCIS Landing Page extracted from the module-shipment-tracking-service.

## Overview

This application displays a welcome page with access to various modules and administration features based on user permissions.

## Features

- **Module Navigation**: Quick access to all available modules (Shipment Tracker, TempViaNet, Profiles, etc.)
- **Administration Panel**: Access to system administration and settings
- **Role-Based Access**: Tiles are displayed based on user access rights
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Built with React 19 and Tailwind CSS

## Project Structure

```
src/
├── components/
│   └── ui-components/
│       └── Tile/                 # Reusable tile component
├── modules/
│   └── landing-page/
│       ├── components/
│       │   └── TileSection/      # Section grouping tiles
│       ├── constants/            # Tile configurations
│       ├── pages/
│       │   └── LandingPage.tsx   # Main landing page
│       ├── types/                # TypeScript types
│       └── utils/                # Utility functions
├── hooks/
│   └── useUserPreferences.ts     # User data hook
├── constants/
│   └── colors.ts                 # Color palette
├── types.ts                      # Global types
├── main.tsx                      # Entry point
└── index.css                     # Global styles
```

## Installation

```bash
# Install dependencies
pnpm install

# or
npm install
```

## Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Run linter
pnpm lint
```

## Building

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Configuration

### Environment Variables

Currently, the application uses mock user preferences. To integrate with real user data:

1. Update `src/hooks/useUserPreferences.ts` to fetch real user data
2. Configure your API endpoints
3. Update the `UserPreferences` type as needed

### Colors

Colors are defined in `src/constants/colors.ts`. The application uses:

- Primary brand colors
- Status badge colors
- Alarm colors
- Theme colors

## Technologies

- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Vite**: Build tool
- **Vitest**: Testing framework
- **Biome**: Linting and formatting

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## Linting & Formatting

```bash
# Check code quality
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

## License

Proprietary
