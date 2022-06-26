export type PanelTypes =
  'intro' |
  'url' |
  'password' |
  'test' |
  'finish';
export type NextPanelHandler = (next: PanelTypes) => void;
