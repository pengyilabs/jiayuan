/** Estado de carga para botones de acciones asíncronas: deshabilita y muestra un indicador. */

export async function withButtonLoading<T>(
  button: HTMLElement | null | undefined,
  action: () => Promise<T>,
): Promise<T> {
  if (!(button instanceof HTMLButtonElement)) return action();

  const spinner = document.createElement('span');
  spinner.className = 'btn-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  button.prepend(spinner);
  button.classList.add('is-loading');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');

  try {
    return await action();
  } finally {
    spinner.remove();
    button.classList.remove('is-loading');
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}
