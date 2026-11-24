import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      ':root, html, body': {
        colorScheme: 'dark',
      },
      body: {
        bg: '#0A1226', // COLORS.background
        color: '#FFFFFF', // COLORS.textPrimary
      },
      'select, input, textarea': {
        colorScheme: 'dark',
      },
      'select option': {
        backgroundColor: '#0c2032 !important',
        color: '#FFFFFF !important',
      },
    },
  },
  colors: {
    brand: {
      400: '#4da3eb',
      500: '#3084c9', // COLORS.primary
      600: '#0B5FA5', // COLORS.primaryDark
      900: '#050B18', // COLORS.surface
    },
    status: {
      ok: '#22C55E',
      attention: '#FBBF24',
      stress: '#EF4444',
      offline: '#6B7280',
    },
    text: {
      secondary: '#A0AEC0', // COLORS.textSecondary
    }
  },
});