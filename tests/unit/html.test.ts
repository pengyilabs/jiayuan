import { describe, expect, it } from 'vitest';
import { escapeHtml, html, joinHtml, raw, SafeHtml, setHtml } from '../../src/core/html';

describe('escapeHtml', () => {
  it('escapa los caracteres peligrosos', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;',
    );
  });
});

describe('html', () => {
  it('escapa los valores interpolados', () => {
    const evil = '<script>alert(1)</script>';
    expect(html`<p>${evil}</p>`.value).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('no vuelve a escapar fragmentos html anidados ni raw', () => {
    const inner = html`<b>${'a&b'}</b>`;
    expect(html`<p>${inner}${raw('<i>x</i>')}</p>`.value).toBe('<p><b>a&amp;b</b><i>x</i></p>');
  });

  it('aplana arrays y omite null, undefined y false', () => {
    const items = [1, 2].map(n => html`<li>${n}</li>`);
    const rendered = html`<ul>${items}${null}${undefined}${false}</ul>`.value;
    expect(rendered).toBe('<ul><li>1</li><li>2</li></ul>');
  });
});

describe('joinHtml', () => {
  it('escapa los elementos que no son SafeHtml', () => {
    expect(joinHtml(['<b>', html`<i></i>`]).value).toBe('&lt;b&gt;<i></i>');
  });

  it('respeta el separador', () => {
    expect(joinHtml(['a', 'b'], ' ').value).toBe('a b');
  });
});

describe('setHtml', () => {
  it('asigna innerHTML con contenido seguro', () => {
    const el = document.createElement('div');
    setHtml(el, new SafeHtml('<span>ok</span>'));
    expect(el.innerHTML).toBe('<span>ok</span>');
  });
});
