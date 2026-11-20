import { createTheme, mergeThemeOverrides } from '@mantine/core'
import { theme as base } from '@cmms/ui'

// Extends the shared theme (colors, primary, radius, font, gradient Button classNames) with only the
// field-specific sizing the engineer app needs. mergeThemeOverrides deep-merges, so the base Button
// defaultProps and the gradient classNames hook are preserved.
// Every size token below scales with the user's "Text size" setting (see textScale.ts).
export const theme = mergeThemeOverrides(
  base,
  createTheme({
    fontSizes: { xs: '0.9375rem', sm: '1.0625rem', md: '1.1875rem', lg: '1.3125rem', xl: '1.625rem' },
    lineHeights: { xs: '1.4', sm: '1.45', md: '1.5', lg: '1.5', xl: '1.4' },
    components: {
      Button: { defaultProps: { size: 'lg', radius: 6 } },
      TextInput: { defaultProps: { size: 'lg' } },
      PasswordInput: { defaultProps: { size: 'lg' } },
      NumberInput: { defaultProps: { size: 'lg' } },
      Select: { defaultProps: { size: 'lg' } },
      Textarea: { defaultProps: { size: 'lg' } },
      InputWrapper: { styles: { label: { fontWeight: 600, marginBottom: 6 }, description: { marginBottom: 6 } } },
      Badge: {
        styles: {
          // Centre the dot and the text on the same line (default line-height leaves the text slightly high)
          root: { height: 'auto', padding: '5px 10px', fontSize: 'var(--mantine-font-size-xs)', fontWeight: 600, textTransform: 'none', letterSpacing: 0, display: 'inline-flex', alignItems: 'center', lineHeight: 1 },
          label: { overflow: 'visible', lineHeight: 1.15, display: 'block', paddingTop: 1 },
        },
      },
      Chip: { defaultProps: { size: 'md' } },
    },
  }),
)
