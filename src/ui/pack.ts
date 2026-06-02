// Load + validate the content pack ONCE at module init. The UI never touches
// raw JSON elsewhere — it goes through the engine's typed helpers.
import packJson from '../../content/grade3_math_fluency_pack.json';
import { validatePack, type ContentPack } from '../engine';

export const pack = packJson as unknown as ContentPack;

// Fail loud on a bad pack (SPEC §4) — surfaced by App as an error screen.
let packError: string | null = null;
try {
  validatePack(pack);
} catch (e) {
  packError = e instanceof Error ? e.message : String(e);
}
export { packError };
