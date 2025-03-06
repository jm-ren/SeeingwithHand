# Seeing with Hand

An interactive annotation tool for creating and visualizing annotations on images.

## Architecture Overview

The application follows a modern React architecture with a focus on maintainability, scalability, and performance. The key architectural components include:

### Core Components

- **Home**: The main container component that orchestrates the application.
- **AnnotationCanvas**: Handles drawing and interaction with the canvas.
- **Traceboard**: Displays a chronological record of annotations.
- **ToolboxPanel**: Provides tools for creating different types of annotations.
- **SessionControls**: Controls for managing recording sessions.

### State Management

The application uses React Context API for state management:

- **AnnotationContext**: Manages annotation state, tool selection, and session state.

### Utilities and Helpers

- **utils.ts**: General utility functions for the application.
- **imageProcessing.ts**: Functions for canvas drawing and image manipulation.

### Configuration

- **appConfig.ts**: Contains application settings and feature flags.

### Custom Hooks

- **useCanvas**: Encapsulates canvas operations and drawing logic.

## Project Structure

```
src/
├── components/         # React components
│   ├── ui/             # UI components (buttons, cards, etc.)
│   ├── AnnotationCanvas.tsx
│   ├── home.tsx
│   ├── SessionControls.tsx
│   ├── Toolbox.tsx
│   └── Traceboard.tsx
├── context/            # React context providers
│   └── AnnotationContext.tsx
├── hooks/              # Custom React hooks
│   └── useCanvas.ts
├── lib/                # Utility functions
│   ├── imageProcessing.ts
│   ├── supabase.ts
│   └── utils.ts
├── types/              # TypeScript type definitions
│   ├── annotations.ts
│   └── supabase.ts
├── config/             # Configuration files
│   └── appConfig.ts
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## Development Guidelines

### Adding New Features

1. **Check Feature Flags**: Use the feature flag system in `appConfig.ts` to control feature availability.
2. **Update Types**: Add or modify types in the appropriate type definition files.
3. **Extend Context**: If the feature requires new state, extend the appropriate context.
4. **Create Utilities**: Extract reusable logic into utility functions.
5. **Implement UI**: Create or update components to implement the feature.

### Code Style

- Use TypeScript for type safety.
- Use functional components with hooks.
- Extract complex logic into custom hooks.
- Use the Context API for state management.
- Follow the existing naming conventions.

### Performance Considerations

- Use memoization for expensive calculations.
- Optimize canvas rendering with `requestAnimationFrame`.
- Use React.memo for components that don't need frequent re-renders.
- Be mindful of re-renders caused by context changes.

## Future Enhancements

The architecture is designed to support the following future enhancements:

- **Backend Integration**: The application is prepared for integration with a backend service.
- **Real-time Collaboration**: The state management system can be extended to support real-time updates.
- **Advanced Visualization**: The visualization system can be enhanced with more sophisticated rendering.
- **AI-assisted Annotations**: The architecture supports integration with AI services for annotation suggestions.

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## License

[MIT License](LICENSE)

