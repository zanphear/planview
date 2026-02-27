export const DEFAULT_STATUSES = [
  { id: 'todo', label: 'To-do', emoji: '\uD83D\uDCCB' },
  { id: 'in_progress', label: 'In Progress', emoji: '\uD83D\uDD35' },
  { id: 'blocked', label: 'Blocked', emoji: '\uD83D\uDD34' },
  { id: 'done', label: 'Done', emoji: '\u2705' },
] as const;

export const DEFAULT_COLOURS = [
  '#E44332', '#E8833A', '#F0C239', '#5CBF4D',
  '#2DA1B1', '#4186E0', '#9B6AC0', '#E06296',
  '#D97025', '#B8C142', '#47B881', '#3D7ACF',
  '#7C5BBB', '#DB4C8C', '#8E8E8E', '#5E6C84',
];
