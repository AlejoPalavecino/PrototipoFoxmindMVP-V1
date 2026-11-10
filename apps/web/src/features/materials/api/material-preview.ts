import type { Material } from '../../../../../../src/core/contracts/materials.ts';

export function canPreviewMaterial(material: Pick<Material, 'extension' | 'ready' | 'deleted'>): boolean {
  return material.ready && !material.deleted && ['pdf', 'jpg', 'jpeg', 'png'].includes(material.extension);
}
