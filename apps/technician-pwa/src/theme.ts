import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'cmms',
  primaryShade: 6,
  autoContrast: true,
  defaultRadius: 6,
  colors: {
    cmms: [
      '#FEFCE8', '#FEF9C3', '#FEF08A', '#FDE047', '#FACC15',
      '#EAB308', '#CA8A04', '#A16207', '#854D0E', '#713F12',
    ],
  },
  fontFamily: 'Work Sans, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  components: {
    Button: {
      defaultProps: {
        size: 'lg',
        radius: 6,
      },
    },
  },
})
