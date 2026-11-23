import Document, { Html, Head, Main, NextScript, type DocumentContext, type DocumentInitialProps } from 'next/document';
import { renderToStaticMarkup } from 'react-dom/server';
import { tokenCaptureScript } from '../src/application/server/token-capture';
import { readNonce } from '../src/application/server/content-security-policy';

/** React hoists resource hints even above ordinary head children. Emit this head atomically. */
class TokenSafeHead extends Head {
  render() {
    const head = super.render();
    const { children, ...attributes } = head.props;
    const nonce = readNonce(this.props.nonce);
    // Preserve Next's generated metadata/styles/scripts; only the trusted static prefix is added.
    const markup = `<script${nonce ? ` nonce="${nonce}"` : ''}>${tokenCaptureScript}</script>${renderToStaticMarkup(<>{children}</>)}`;
    return <head {...attributes} dangerouslySetInnerHTML={{ __html: markup }} />;
  }
}

type Props = DocumentInitialProps & { nonce?: string };

/** proxy.ts sets x-nonce and the matching CSP on every page request. */
export default class FoxMindDocument extends Document<Props> {
  static async getInitialProps(context: DocumentContext): Promise<Props> {
    const initial = await Document.getInitialProps(context);
    return { ...initial, nonce: readNonce(context.req?.headers['x-nonce']) };
  }

  render() {
    const { nonce } = this.props;
    return <Html lang="es">
      <TokenSafeHead nonce={nonce}>
        <meta name="referrer" content="no-referrer" />
      </TokenSafeHead>
      <body><Main /><NextScript nonce={nonce} /></body>
    </Html>;
  }
}
