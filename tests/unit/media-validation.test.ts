import { describe, expect, it, vi } from 'vitest';
import {
  basicFileIssues,
  classifyFile,
  matchesAnyRatio,
  parseAllowedRatios,
  validateFileCount,
  validateMediaFiles,
  validateVideoDuration,
} from '../../src/data/media-validation';
import type { MediaFile } from '../../src/data/media-validation';

const file = (name: string, type: string, size = 1024): File =>
  new File([new Uint8Array(size)], name, { type });

const img = (name = 'a.jpg', type = 'image/jpeg'): MediaFile => ({
  file: file(name, type),
  kind: 'image',
});
const vid = (name = 'a.mp4', type = 'video/mp4'): MediaFile => ({
  file: file(name, type),
  kind: 'video',
});

describe('classifyFile', () => {
  it('reconoce imágenes y vídeos soportados', () => {
    expect(classifyFile(file('a.jpg', 'image/jpeg'))).toBe('image');
    expect(classifyFile(file('a.png', 'image/png'))).toBe('image');
    expect(classifyFile(file('a.webp', 'image/webp'))).toBe('image');
    expect(classifyFile(file('a.mp4', 'video/mp4'))).toBe('video');
    expect(classifyFile(file('a.mov', 'video/quicktime'))).toBe('video');
  });

  it('devuelve null para formatos no soportados', () => {
    expect(classifyFile(file('a.gif', 'image/gif'))).toBeNull();
    expect(classifyFile(file('a.pdf', 'application/pdf'))).toBeNull();
  });
});

describe('basicFileIssues', () => {
  it('sin problemas cuando el formato y el tamaño son válidos', () => {
    expect(basicFileIssues([img()])).toEqual([]);
  });

  it('señala el formato no soportado (MIME distinto al declarado por kind)', () => {
    const issues = basicFileIssues([{ file: file('a.gif', 'image/gif'), kind: 'image' }]);
    expect(issues).toEqual([{ code: 'unsupported_format', fileName: 'a.gif' }]);
  });

  it('señala archivos que superan el límite de tamaño', () => {
    const big = { file: file('big.jpg', 'image/jpeg', 51 * 1024 * 1024), kind: 'image' as const };
    expect(basicFileIssues([big])).toEqual([{ code: 'too_large', fileName: 'big.jpg' }]);
  });
});

describe('validateFileCount', () => {
  it('single: exactamente una imagen y ningún vídeo', () => {
    expect(validateFileCount('image', [img()])).toEqual([]);
    expect(validateFileCount('image', [])).toEqual([{ code: 'count_single' }]);
    expect(validateFileCount('image', [img(), img('b.jpg')])).toEqual([{ code: 'count_single' }]);
    expect(validateFileCount('image', [vid()])).toEqual([{ code: 'count_single' }]);
  });

  it('carousel: entre 2 y 10 imágenes, sin vídeo', () => {
    expect(validateFileCount('carousel', [img(), img('b.jpg')])).toEqual([]);
    expect(
      validateFileCount(
        'carousel',
        Array.from({ length: 10 }, (_, i) => img(`i${String(i)}.jpg`)),
      ),
    ).toEqual([]);
    expect(validateFileCount('carousel', [img()])).toEqual([{ code: 'count_carousel' }]);
    expect(
      validateFileCount(
        'carousel',
        Array.from({ length: 11 }, (_, i) => img(`i${String(i)}.jpg`)),
      ),
    ).toEqual([{ code: 'count_carousel' }]);
  });

  it('video y short_video: exactamente un archivo de vídeo', () => {
    expect(validateFileCount('video', [vid()])).toEqual([]);
    expect(validateFileCount('short_video', [vid()])).toEqual([]);
    expect(validateFileCount('video', [img()])).toEqual([{ code: 'count_video' }]);
    expect(validateFileCount('video', [vid(), vid('b.mp4')])).toEqual([{ code: 'count_video' }]);
  });

  it('story: una imagen o un vídeo (no ambos, no ninguno)', () => {
    expect(validateFileCount('story', [img()])).toEqual([]);
    expect(validateFileCount('story', [vid()])).toEqual([]);
    expect(validateFileCount('story', [img(), vid()])).toEqual([{ code: 'count_single' }]);
    expect(validateFileCount('story', [])).toEqual([{ code: 'count_single' }]);
  });

  it('text, article y live no exigen archivos', () => {
    expect(validateFileCount('text', [])).toEqual([]);
    expect(validateFileCount('article', [img(), img('b.jpg')])).toEqual([]);
    expect(validateFileCount('live', [])).toEqual([]);
  });
});

describe('parseAllowedRatios / matchesAnyRatio', () => {
  it('convierte un array de tokens estructurados', () => {
    expect(parseAllowedRatios(['1:1', '4:5', '16:9'])).toEqual([1, 0.8, 16 / 9]);
  });

  it('sin ratios declarados no impone restricción', () => {
    expect(parseAllowedRatios([])).toEqual([]);
    expect(matchesAnyRatio(2.5, [])).toBe(true);
  });

  it('acepta con una tolerancia razonable y rechaza fuera de ella', () => {
    const allowed = parseAllowedRatios(['1:1', '16:9']);
    expect(matchesAnyRatio(1.0, allowed)).toBe(true);
    expect(matchesAnyRatio(1.03, allowed)).toBe(true); // dentro de tolerancia
    expect(matchesAnyRatio(16 / 9, allowed)).toBe(true);
    expect(matchesAnyRatio(2.0, allowed)).toBe(false); // ni cuadrado ni panorámico
  });

  it('ignora tokens que no tienen la forma W:H', () => {
    expect(parseAllowedRatios(['9:16', '≤ 90s', ''])).toEqual([9 / 16]);
  });
});

describe('validateMediaFiles', () => {
  it('combina formato/tamaño y número de archivos', () => {
    expect(validateMediaFiles('image', [img()])).toEqual([]);
    const wrongFormat = validateMediaFiles('image', [
      { file: file('a.gif', 'image/gif'), kind: 'image' },
    ]);
    // Cuenta como 1 imagen (basta para "single"): solo falla el formato.
    expect(wrongFormat.map(i => i.code)).toEqual(['unsupported_format']);
    const wrongCount = validateMediaFiles('image', [img(), img('b.jpg')]);
    expect(wrongCount.map(i => i.code)).toEqual(['count_single']);
  });
});

describe('validateVideoDuration', () => {
  URL.createObjectURL = () => 'blob:test-video';
  URL.revokeObjectURL = () => undefined;

  const stubVideo = (duration: number): void => {
    class FakeVideo {
      onloadedmetadata: (() => void) | null = null;
      onerror: (() => void) | null = null;
      preload = '';
      duration = duration;
      set src(_value: string) {
        queueMicrotask(() => this.onloadedmetadata?.());
      }
    }
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'video'
        ? (new FakeVideo() as unknown as HTMLVideoElement)
        : document.createElement(tag),
    );
  };

  it('sin límite declarado, no restringe', async () => {
    expect(await validateVideoDuration([vid()], null)).toEqual([]);
  });

  it('acepta un vídeo dentro del límite', async () => {
    stubVideo(45);
    expect(await validateVideoDuration([vid()], 90)).toEqual([]);
    vi.restoreAllMocks();
  });

  it('rechaza un vídeo que supera el límite', async () => {
    stubVideo(120);
    const issues = await validateVideoDuration([vid('reel.mp4')], 90);
    expect(issues).toEqual([{ code: 'duration_exceeded', fileName: 'reel.mp4' }]);
    vi.restoreAllMocks();
  });

  it('ignora los archivos que no son vídeo', async () => {
    stubVideo(999);
    expect(await validateVideoDuration([img()], 10)).toEqual([]);
    vi.restoreAllMocks();
  });
});
