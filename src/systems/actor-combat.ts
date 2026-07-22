/**
 * Shared combat guards — pure, Phaser-light.
 * Used so delayed strikes (buddy lash) do not crash after room clear.
 */

/** True when knockback / setVelocity is safe to apply. */
export function actorHasLiveBody(actor: {
  alive?: boolean;
  sprite?: { active?: boolean; body?: unknown } | null;
}): boolean {
  if (actor.alive === false) return false;
  const s = actor.sprite;
  if (!s || s.active === false) return false;
  return s.body != null;
}
