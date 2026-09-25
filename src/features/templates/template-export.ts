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
  const pixelRatio = size.width / element.offsetWidth;

  const dataUrl = await toPng(element, {
    width: size.width,
    height: size.height,
    pixelRatio: Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1,
    style: { width: `${String(size.width)}px`, height: `${String(size.height)}px` },
  });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${fileNameHint}-${String(size.width)}x${String(size.height)}.png`;
  link.click();
}
