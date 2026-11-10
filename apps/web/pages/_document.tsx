import { Html, Head, Main, NextScript } from 'next/document';
import { renderToStaticMarkup } from 'react-dom/server';
import { tokenCaptureScript } from '../src/application/server/token-capture';

/** React hoists resource hints even above ordinary head children. Emit this head atomically. */
class TokenSafeHead extends Head {
  render() {
    const head = super.render();
    const { children, ...attributes } = head.props;
    // Preserve Next's generated metadata/styles/scripts; only the trusted static prefix is added.
    const markup = `<script>${tokenCaptureScript}</script>${renderToStaticMarkup(<>{children}</>)}`;
    return <head {...attributes} dangerouslySetInnerHTML={{ __html: markup }} />;
  }
}

export default function Document() {
  return <Html lang="es">
    <TokenSafeHead>
      <meta name="referrer" content="no-referrer" />
    </TokenSafeHead>
    <body><Main /><NextScript /></body>
  </Html>;
}
