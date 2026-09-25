/**
 * Validación de los archivos que se suben a un post: formato, tamaño, número de archivos
 * según el tipo de publicación elegido, y relación de aspecto de las imágenes.
 * No depende de Supabase ni del DOM de la aplicación: solo de las APIs del navegador
 * (`File`, `Image`, `URL`), así que la usan por igual el formulario y ambos repositorios.
 */
import type { PostTypeGroup } from '../types/models';

export type MediaKind = 'image' | 'video';

export interface MediaFile {
  file: File;
  kind: MediaKind;
}

/** Mismos tipos MIME que aceptan los buckets de Storage (F1). */
const ALLOWED_MIME: Readonly<Record<MediaKind, readonly string[]>> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime'],
};

/** Mismo límite que `file_size_limit` en los buckets de Storage (F1). */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export type MediaIssueCode =
  | 'unsupported_format'
  | 'too_large'
  | 'count_single'
  | 'count_carousel'
  | 'count_video'
  | 'ratio_mismatch'
  | 'duration_exceeded';

export interface MediaIssue {
  code: MediaIssueCode;
  fileName?: string;
}

/** Determina el tipo de un archivo a partir de su MIME, o `null` si no está soportado. */
export function classifyFile(file: File): MediaKind | null {
  if (ALLOWED_MIME.image.includes(file.type)) return 'image';
  if (ALLOWED_MIME.video.includes(file.type)) return 'video';
  return null;
}

/** Formato no soportado o archivo demasiado grande. */
export function basicFileIssues(files: readonly MediaFile[]): MediaIssue[] {
  const issues: MediaIssue[] = [];
  for (const { file, kind } of files) {
    if (!ALLOWED_MIME[kind].includes(file.type)) {
      issues.push({ code: 'unsupported_format', fileName: file.name });
    } else if (file.size > MAX_FILE_BYTES) {
      issues.push({ code: 'too_large', fileName: file.name });
    }
  }
  return issues;
}

/** Cuántos archivos admite cada tipo de publicación (`post_types.format_group`). */
export function validateFileCount(group: PostTypeGroup, files: readonly MediaFile[]): MediaIssue[] {
  const images = files.filter(f => f.kind === 'image').length;
  const videos = files.filter(f => f.kind === 'video').length;
  switch (group) {
    case 'image':
      return images === 1 && videos === 0 ? [] : [{ code: 'count_single' }];
    case 'carousel':
      return images >= 2 && images <= 10 && videos === 0 ? [] : [{ code: 'count_carousel' }];
    case 'video':
    case 'short_video':
      return videos === 1 && images === 0 ? [] : [{ code: 'count_video' }];
    case 'story':
      return images + videos === 1 ? [] : [{ code: 'count_single' }];
    case 'text':
    case 'article':
    case 'live':
      return []; // sin archivos obligatorios
  }
}

/**
 * Ratios estructurados de `post_types.aspect_ratios` (F5), p. ej. `['1:1','4:5','16:9']`;
 * los tokens que no tengan la forma `W:H` se ignoran (vacío = sin restricción de ratio).
 */
export function parseAllowedRatios(tokens: readonly string[]): number[] {
  const ratios: number[] = [];
  for (const token of tokens) {
    const match = /^(\d+):(\d+)$/.exec(token.trim());
    if (!match) continue;
    const [, w, h] = match;
    ratios.push(Number(w) / Number(h || '1'));
  }
  return ratios;
}

const RATIO_TOLERANCE = 0.06;

/** `true` si el ratio coincide (con tolerancia) con alguno de los declarados, o si no hay ninguno. */
export function matchesAnyRatio(ratio: number, allowed: readonly number[]): boolean {
  if (allowed.length === 0) return true;
  return allowed.some(a => Math.abs(ratio - a) / a <= RATIO_TOLERANCE);
}

/** Relación de aspecto (ancho/alto) de una imagen, leída de forma asíncrona en el navegador. */
export function imageAspectRatio(file: File, timeoutMs = 5000): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error(`Tiempo de espera agotado leyendo la imagen: ${file.name}`));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(img.naturalWidth / img.naturalHeight);
    };
    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo leer la imagen: ${file.name}`));
    };
    img.src = url;
  });
}

/** Valida el ratio de las imágenes contra los declarados por el tipo de publicación. */
export async function validateImageRatios(
  files: readonly MediaFile[],
  aspectRatios: readonly string[],
): Promise<MediaIssue[]> {
  const allowed = parseAllowedRatios(aspectRatios);
  if (allowed.length === 0) return [];
  const issues: MediaIssue[] = [];
  for (const { file, kind } of files) {
    if (kind !== 'image') continue;
    try {
      const ratio = await imageAspectRatio(file);
      if (!matchesAnyRatio(ratio, allowed))
        issues.push({ code: 'ratio_mismatch', fileName: file.name });
    } catch {
      // Archivo ilegible: `basicFileIssues` ya habrá señalado el formato si es el problema.
    }
  }
  return issues;
}

/** Duración (segundos) de un vídeo, leída de forma asíncrona a partir de sus metadatos. */
export function videoDuration(file: File, timeoutMs = 5000): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error(`Tiempo de espera agotado leyendo el vídeo: ${file.name}`));
    }, timeoutMs);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo leer el vídeo: ${file.name}`));
    };
    video.src = url;
  });
}

/** Valida la duración de los vídeos contra el máximo declarado por el tipo (si lo hay). */
export async function validateVideoDuration(
  files: readonly MediaFile[],
  maxDurationSeconds: number | null,
): Promise<MediaIssue[]> {
  if (maxDurationSeconds === null) return [];
  const issues: MediaIssue[] = [];
  for (const { file, kind } of files) {
    if (kind !== 'video') continue;
    try {
      const duration = await videoDuration(file);
      if (duration > maxDurationSeconds)
        issues.push({ code: 'duration_exceeded', fileName: file.name });
    } catch {
      // Archivo ilegible: `basicFileIssues` ya habrá señalado el formato si es el problema.
    }
  }
  return issues;
}

/** Todas las validaciones síncronas (formato, tamaño, número de archivos). */
export function validateMediaFiles(
  group: PostTypeGroup,
  files: readonly MediaFile[],
): MediaIssue[] {
  return [...basicFileIssues(files), ...validateFileCount(group, files)];
}
