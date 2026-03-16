import { createTheme, type MantineColorsTuple, type MantineTheme } from '@mantine/core';

// InvokeAI Color Palette - Uses high-contrast pure white for text
// NOTE: For dynamic theming, components should use CSS variables (var(--theme-gray-X))
// instead of c="invokeGray.X". This palette is a fallback for Mantine's internal use.
const invokeGray: MantineColorsTuple = [
  '#ffffff', // 0 - Primary text - PURE WHITE for max contrast
  '#f0f0f0', // 1 - Secondary text - bright gray
  '#e0e0e0', // 2 - Tertiary text
  '#c0c0c0', // 3 - Subtle text, dividers
  '#909090', // 4 - Muted text, placeholders
  '#5c5f66', // 5 - UI elements (slider handles, scrollbars)
  '#373a40', // 6 - Input backgrounds (text areas, number inputs)
  '#2c2e33', // 7 - Cards, popovers, floating panels
  '#222427', // 8 - Main sidebars/panels
  '#1b1b20', // 9 - Canvas background (deepest layer)
];

const invokeBrand: MantineColorsTuple = [
  '#fff4e6', // 0 - Lightest tint
  '#ffe8cc', // 1
  '#ffd8a8', // 2
  '#ffc078', // 3
  '#ffa94d', // 4
  '#ff922b', // 5
  '#eb8034', // 6 - Primary brand color, Generate button
  '#d6722b', // 7 - Hover state
  '#bf6322', // 8 - Active/pressed state
  '#a8551a', // 9 - Deep contrast
];

export const theme = createTheme({
  colors: {
    invokeGray,
    invokeBrand,
  },

  primaryColor: 'invokeBrand',
  primaryShade: 6,

  // Font settings
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',

  fontSizes: {
    xs: '11px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '18px',
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },

  // Radius
  radius: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },

  // Default radius for components
  defaultRadius: 'sm',

  // Component-specific overrides
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
      styles: (theme: MantineTheme) => ({
        root: {
          fontWeight: 600,
          fontSize: theme.fontSizes.sm,
        },
      }),
    },

    Slider: {
      styles: () => ({
        track: {
          height: '4px',
          backgroundColor: 'var(--theme-gray-8)',
        },
        bar: {
          backgroundColor: 'var(--theme-brand)',
        },
        thumb: {
          width: '14px',
          height: '14px',
          borderWidth: '2px',
          borderColor: 'var(--theme-brand)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        },
      }),
    },

    Switch: {
      styles: () => ({
        track: {
          backgroundColor: 'var(--theme-gray-6)',
          borderColor: 'var(--theme-gray-5)',
          cursor: 'pointer',
        },
        thumb: {
          // Prevent the thumb from animating/dropping on click-and-drag
          transition: 'left 150ms ease',
          transform: 'none',
          backgroundColor: 'white',
        },
        label: {
          color: 'var(--theme-gray-0)',
        },
      }),
    },

    NumberInput: {
      defaultProps: {
        size: 'sm',
        hideControls: true,
      },
      styles: (theme: MantineTheme) => ({
        input: {
          fontSize: theme.fontSizes.sm,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        },
      }),
    },

    TextInput: {
      defaultProps: {
        size: 'sm',
      },
      styles: (theme: MantineTheme) => ({
        input: {
          fontSize: theme.fontSizes.sm,
          backgroundColor: 'var(--theme-gray-6)',
          borderColor: 'var(--theme-gray-5)',
        },
        label: {
          fontSize: theme.fontSizes.sm,
          fontWeight: 500,
          marginBottom: theme.spacing.xs,
          color: 'var(--theme-gray-0)',
        },
      }),
    },

    Textarea: {
      defaultProps: {
        size: 'sm',
      },
      styles: (theme: MantineTheme) => ({
        input: {
          fontSize: theme.fontSizes.sm,
          backgroundColor: 'var(--theme-gray-6)',
          borderColor: 'var(--theme-gray-5)',
          // Note: Don't use minHeight here - use minRows prop on the component instead
        },
        label: {
          fontSize: theme.fontSizes.sm,
          fontWeight: 500,
          marginBottom: theme.spacing.xs,
          color: 'var(--theme-gray-0)',
        },
      }),
    },

    Select: {
      defaultProps: {
        size: 'sm',
      },
      styles: (theme: MantineTheme) => ({
        input: {
          fontSize: theme.fontSizes.sm,
          backgroundColor: 'var(--theme-gray-6)',
          borderColor: 'var(--theme-gray-5)',
        },
        label: {
          fontSize: theme.fontSizes.sm,
          fontWeight: 500,
          marginBottom: theme.spacing.xs,
          color: 'var(--theme-gray-0)',
        },
        dropdown: {
          backgroundColor: 'var(--theme-gray-7)',
          borderColor: 'var(--theme-gray-5)',
        },
        option: {
          fontSize: theme.fontSizes.sm,
        },
      }),
    },

    Card: {
      defaultProps: {
        radius: 'sm',
        padding: 'md',
      },
      styles: () => ({
        root: {
          backgroundColor: 'var(--theme-gray-7)',
          borderColor: 'var(--theme-gray-5)',
        },
      }),
    },

    Paper: {
      defaultProps: {
        radius: 'sm',
        padding: 'md',
      },
      styles: () => ({
        root: {
          backgroundColor: 'var(--theme-gray-7)',
        },
      }),
    },

    Accordion: {
      defaultProps: {
        variant: 'filled',
        transitionDuration: 200,
      },
      styles: (theme: MantineTheme) => ({
        root: {
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        },
        item: {
          // Styled as "paper" elevation - nested cards
          backgroundColor: 'var(--elevation-paper)',
          border: 'var(--elevation-border)',
          borderRadius: theme.radius.sm,
          boxShadow: 'var(--elevation-shadow-sm)',
          overflow: 'hidden',
        },
        control: {
          padding: '10px 12px',
          backgroundColor: 'transparent',
          transition: 'background-color 150ms ease',
          '&:hover': {
            backgroundColor: 'var(--elevation-raised)',
          },
        },
        label: {
          fontWeight: 600,
          fontSize: theme.fontSizes.xs,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--theme-gray-0)',
        },
        content: {
          backgroundColor: 'var(--elevation-paper)',
        },
        panel: {
          backgroundColor: 'var(--elevation-paper)',
          padding: '0 12px 12px 12px',
        },
        chevron: {
          transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          color: 'var(--theme-gray-3)',
        },
      }),
    },

    Progress: {
      defaultProps: {
        size: 'sm',
        animated: true,
      },
      styles: () => ({
        root: {
          backgroundColor: 'var(--theme-gray-8)',
        },
        bar: {
          backgroundColor: 'var(--theme-brand)',
        },
      }),
    },

    Badge: {
      defaultProps: {
        size: 'sm',
        variant: 'filled',
      },
      styles: (theme: MantineTheme) => ({
        root: {
          fontSize: theme.fontSizes.xs,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        },
      }),
    },

    Modal: {
      defaultProps: {
        zIndex: 1200,  // Default z-index for all modals
        transitionProps: {
          transition: 'pop',
          duration: 200,
          timingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
        overlayProps: {
          backgroundOpacity: 0.55,
          blur: 3,
        },
      },
      styles: (theme: MantineTheme) => ({
        content: {
          backgroundColor: 'var(--theme-gray-7)',
        },
        header: {
          backgroundColor: 'var(--theme-gray-7)',
          borderBottom: '1px solid var(--theme-gray-5)',
        },
        title: {
          fontSize: theme.fontSizes.md,
          fontWeight: 600,
          color: 'var(--theme-gray-0)',
        },
        body: {
          backgroundColor: 'var(--theme-gray-7)',
        },
        overlay: {
          transition: 'opacity 250ms ease, backdrop-filter 250ms ease',
        },
      }),
    },

    Drawer: {
      defaultProps: {
        transitionProps: {
          transition: 'slide-right',
          duration: 250,
          timingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
        overlayProps: {
          backgroundOpacity: 0.5,
          blur: 4,
        },
      },
      styles: (theme: MantineTheme) => ({
        content: {
          backgroundColor: 'var(--theme-gray-7)',
        },
        header: {
          backgroundColor: 'var(--theme-gray-7)',
          borderBottom: '1px solid var(--theme-gray-5)',
        },
        title: {
          fontSize: theme.fontSizes.md,
          fontWeight: 600,
          color: 'var(--theme-gray-0)',
        },
        body: {
          backgroundColor: 'var(--theme-gray-7)',
        },
      }),
    },

    Table: {
      styles: (theme: MantineTheme) => ({
        table: {
          backgroundColor: 'var(--theme-gray-8)',
        },
        th: {
          fontSize: theme.fontSizes.xs,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--theme-gray-0)',
          backgroundColor: 'var(--theme-gray-7)',
          borderColor: 'var(--theme-gray-5)',
        },
        td: {
          fontSize: theme.fontSizes.sm,
          borderColor: 'var(--theme-gray-6)',
        },
      }),
    },

    ScrollArea: {
      styles: () => ({
        scrollbar: {
          // background color override handled in index.css
        },
      }),
    },

    Divider: {
      styles: () => ({
        root: {
          borderColor: 'var(--theme-gray-5)',
        },
      }),
    },

    SegmentedControl: {
      defaultProps: {
        fullWidth: true,
        radius: 'sm',
      },
      styles: (theme: MantineTheme) => ({
        root: {
          backgroundColor: 'var(--theme-gray-8)',
        },
        indicator: {
          backgroundColor: 'var(--theme-brand)',
        },
        label: {
          fontSize: theme.fontSizes.sm,
          fontWeight: 600,
          // active state color handled in index.css
        },
      }),
    },

    AppShell: {
      styles: () => ({
        main: {
          backgroundColor: 'var(--theme-gray-9)',
        },
        header: {
          backgroundColor: 'var(--theme-gray-8)',
          borderColor: 'var(--theme-gray-5)',
        },
        navbar: {
          backgroundColor: 'var(--theme-gray-8)',
          borderColor: 'var(--theme-gray-5)',
        },
        aside: {
          backgroundColor: 'var(--theme-gray-8)',
          borderColor: 'var(--theme-gray-5)',
        },
      }),
    },
  },

  // Other theme properties
  other: {
    // Custom properties that can be accessed via theme.other
    headerHeight: 60,
    navbarWidth: 340,
    asideWidth: { base: 300, md: 400 },
  },
});
