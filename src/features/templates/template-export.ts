/**
 * Exporta el diseño renderizado de un template a un archivo PNG descargable (F5).
 * `html-to-image` (F8) se carga de forma diferida (`import()`) porque solo hace falta cuando
 * alguien pulsa "Exportar PNG": mantenerla fuera del paquete inicial evita cargarla en cada
 * visita para una acción que la mayoría de las sesiones no usa.
 */
import { templateOutputSize } from './template-render';
import type { PlatformId, Template } from '../../types/models';

/**
 * Captura `element` (debe llevar la clase `.tpl-preview` ya con su `aspect-ratio` real) y
 * descarga un PNG a las dimensiones exactas de la variante — no las del elemento en pantalla,
 * que pueden ser más pequeñas dentro del formulario o el modal de vista previa.
 */
export async function exportTemplateAsPng(
  element: HTMLElement,
  tpl: Template,
  fileNameHint: string,
  platformId?: PlatformId,
  postTypeId?: string | null,
): Promise<void> {
  const { toPng } = await import('html-to-image');
  const size = templateOutputSize(tpl, platformId, postTypeId ?? undefined);

  // `width`/`height` ya son el tamaño final del lienzo: html-to-image escala el elemento
  // (que en pantalla puede ser mucho más pequeño, p. ej. dentro del formulario) a ese tamaño
  // por su cuenta. `pixelRatio` es un multiplicador ADICIONAL sobre width/height (para
  // pantallas retina) — sin fijarlo en 1 aquí, el resultado sale varias veces más grande de lo
  // pedido (comprobado: sin este fix, un 1080×1080 se exportaba a 5301×5301, ~15 MB).
  const dataUrl = await toPng(element, {
    width: size.width,
    height: size.height,
    pixelRatio: 1,
  });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${fileNameHint}-${String(size.width)}x${String(size.height)}.png`;
  link.click();
}
