import { incrementProjectVersion } from '../projects';
import { updateSpriteName } from './spriteRepository';

export async function renameSpriteById(spriteId: string, name: string): Promise<boolean> {
  const row = await updateSpriteName(spriteId, name);
  if (!row) return false;

  if (row.project_id) {
    await incrementProjectVersion(row.project_id);
  }

  return true;
}
