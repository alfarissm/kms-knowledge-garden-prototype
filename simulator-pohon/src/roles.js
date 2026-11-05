// Simulation roles explain action ownership; this is not authentication.
export const USER_ACTIONS = ['login','learn','rate','share','care-air','care-fertilizer','care-fruit'];
export const ADMIN_ACTIONS = ['acc','stale','rejected','duplicate'];
export const DEMO_ACTIONS = ['advance','healthy','thirsty','dead','boost','example','level-up','level-down'];

export function isActionAllowed(role, action, demoOpen = false) {
  if (action === 'reset') return true;
  if (USER_ACTIONS.includes(action)) return role === 'user';
  if (ADMIN_ACTIONS.includes(action)) return role === 'admin';
  return DEMO_ACTIONS.includes(action) && demoOpen;
}
