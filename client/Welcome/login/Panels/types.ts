export type PanelTypes =
  'intro' |
  'login' |
  'forgot' |
  'reset-sent' |
  'register' |
  'verify-email' |
  'unverified-email';
export type NextPanelHandler = (next: PanelTypes) => void;
