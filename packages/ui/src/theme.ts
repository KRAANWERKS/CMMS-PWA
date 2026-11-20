import { createTheme, type ButtonProps, type MantineTheme } from '@mantine/core'

// A filled/undefined/gradient Button maps its color to one gradient class. Driven here, not at call sites,
// so a primary or coloured action looks the same everywhere without per-button hex values.
function gradientButtonClass(color: ButtonProps['color']): string | undefined {
  switch (color) {
    case undefined:
    case 'cmms':
    case 'yellow':
      return 'cmms-gradient-primary'
    case 'red':
      return 'cmms-gradient-danger'
    case 'green':
      return 'cmms-gradient-success'
    case 'blue':
      return 'cmms-gradient-info'
    default:
      return undefined
  }
}

export const theme = createTheme({
  primaryColor: 'yellow',
  primaryShade: 6,
  autoContrast: true,
  defaultRadius: 6,
  colors: {
    yellow: [
      '#FFF8E1', '#FFEFCB', '#FFDD9A', '#FFCA64', '#FFBA38',
      '#FFB01B', '#FFA903', '#E39500', '#CB8400', '#B07100',
    ],
    cmms: [
      '#FFF4E6', '#FFE8CC', '#FFD8A8', '#FFC078', '#FFA94D',
      '#FF922B', '#FD7E14', '#F76707', '#E8590C', '#D9480F',
    ],
  },
  fontFamily: 'Work Sans, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily: 'Work Sans, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    sizes: {
      h1: { fontSize: '1.75rem', lineHeight: '1.2', fontWeight: '700' },
      h2: { fontSize: '1.25rem', lineHeight: '1.3', fontWeight: '700' },
      h3: { fontSize: '1rem', lineHeight: '1.35', fontWeight: '650' },
    },
  },
  components: {
    Button: {
      defaultProps: { radius: 6 },
      classNames: (_theme: MantineTheme, props: ButtonProps) => ({
        root:
          props.variant === undefined || props.variant === 'filled' || props.variant === 'gradient'
            ? gradientButtonClass(props.color)
            : props.variant === 'default'
              ? 'cmms-secondary-button'
              : undefined,
      }),
      styles: {
        root: { fontWeight: 650 },
      },
    },
    Paper: {
      defaultProps: { radius: 6 },
    },
    Card: {
      defaultProps: { radius: 6 },
    },
    TextInput: {
      defaultProps: { radius: 6 },
    },
    Select: {
      defaultProps: { radius: 6 },
    },
  },
})
