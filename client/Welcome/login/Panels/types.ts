export type PanelTypes = 'intro' | 'login' | 'forgot' | 'reset-sent' | 'register';
export type NextPanelHandler = (next: PanelTypes) => void;
