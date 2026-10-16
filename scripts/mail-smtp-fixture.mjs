import { createServer } from "node:net";

// Independent, deliberately small SMTP peer: no Nodemailer internals or storage.
export async function createSmtpFixture({ rejectRecipient = false, rejectData = false, stallGreeting = false, stallData = false, trickleData = false } = {}) {
  let receivedData;
  const dataReceived = new Promise(resolve => { receivedData = resolve; });
  const sockets = new Set();
  const messages = [];
  let connections = 0;
  const server = createServer(socket => {
    connections += 1;
    sockets.add(socket);
    socket.on("error", () => {});
    let trickle;
    socket.on("close", () => { clearInterval(trickle); sockets.delete(socket); });
    if (stallGreeting) return;
    socket.write("220 fixture ESMTP\r\n");
    let buffer = "";
    let data = false;
    let body = [];
    let envelope = { from: "", to: [] };
    socket.on("data", chunk => {
      buffer += chunk.toString("utf8");
      let end;
      while ((end = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line !== ".") { body.push(line.replace(/^\.\./, ".")); continue; }
          data = false;
          receivedData();
          if (stallData) {
            // An incomplete SMTP response keeps activity alive without accepting DATA.
            // Only deadline tests opt in; ordinary stall tests retain inactivity timeout.
            if (trickleData) trickle ??= setInterval(() => socket.write(" "), 100);
            continue;
          }
          if (rejectData) socket.write("554 fixture-private-response\r\n");
          else {
            messages.push({ envelope, raw: body.join("\r\n") });
            socket.write("250 queued fixture-private-response\r\n");
          }
          body = [];
        } else if (/^(EHLO|HELO) /i.test(line)) socket.write("250 fixture\r\n");
        else if (/^MAIL FROM:/i.test(line)) {
          envelope = { from: line.slice(10), to: [] };
          socket.write("250 sender ok\r\n");
        } else if (/^RCPT TO:/i.test(line)) {
          if (rejectRecipient) socket.write("550 fixture-private-response\r\n");
          else { envelope.to.push(line.slice(8)); socket.write("250 recipient ok\r\n"); }
        } else if (line === "DATA") { data = true; socket.write("354 message follows\r\n"); }
        else if (line === "QUIT") socket.end("221 bye\r\n");
        else if (line === "RSET") socket.write("250 reset\r\n");
        else socket.write("502 unsupported\r\n");
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    port: server.address().port,
    messages,
    dataReceived,
    get connections() { return connections; },
    get activeConnections() { return sockets.size; },
    async waitForIdle() {
      await Promise.all([...sockets].map(socket => new Promise(resolve => socket.once("close", resolve))));
    },
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}

// Decode the MIME transfer encodings emitted over the wire, not transport objects.
export function readMimeParts(raw) {
  const separator = raw.indexOf("\r\n\r\n");
  const headers = raw.slice(0, separator).replace(/\r\n[ \t]+/g, " ");
  const boundary = /boundary="([^"]+)"/i.exec(headers)?.[1];
  if (!boundary) throw new Error("Fixture expected multipart message");
  const parts = {};
  for (const chunk of raw.slice(separator + 4).split(`--${boundary}`).slice(1, -1)) {
    const split = chunk.indexOf("\r\n\r\n");
    const fields = chunk.slice(0, split);
    const type = /Content-Type: (text\/(?:plain|html))/i.exec(fields)?.[1];
    let content = chunk.slice(split + 4).replace(/\r\n$/, "");
    if (/Content-Transfer-Encoding: base64/i.test(fields)) content = Buffer.from(content, "base64").toString("utf8");
    else if (/Content-Transfer-Encoding: quoted-printable/i.test(fields)) {
      content = content.replace(/=\r\n/g, "");
      content = Buffer.from(content.replace(/=([\dA-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))), "latin1").toString("utf8");
    }
    if (type) parts[type] = content;
  }
  return { headers, ...parts };
}
