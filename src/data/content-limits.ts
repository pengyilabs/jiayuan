/**
 * Límites de longitud del texto por plataforma, orientativos (no hay ninguno en la base de
 * datos): sirven solo para el contador de caracteres del formulario, no se hacen cumplir en
 * el servidor.
 */
import type { PlatformId } from '../types/models';

export const CONTENT_LIMIT: Readonly<Record<PlatformId, number>> = {
  facebook: 2200,
  instagram: 2200,
  wechat_official: 20000,
  wechat_channels: 1000,
  xiaohongshu: 1000,
  douyin: 500,
  tiktok: 2200,
  youtube: 5000,
  twitter: 280,
};
