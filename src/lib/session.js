// Demo session helpers (M5 roles & permissions). The fake role picker on
// /login writes `pp-role` ('owner' | 'agent') and, for agents, `pp-agent-id`
// to sessionStorage; pages read them here to scope views client-side.
// When `pp-role` is missing we default to 'owner' so pre-login or stale
// states keep the full demo view (login always sets the key).

export function getRole() {
  try {
    return sessionStorage.getItem('pp-role') || 'owner';
  } catch (e) {
    return 'owner';
  }
}

export function getAgentId() {
  try {
    return sessionStorage.getItem('pp-agent-id') || '';
  } catch (e) {
    return '';
  }
}
