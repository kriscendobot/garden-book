// CLIP_CSP is the policy documented for published clips in the garden's
// skills/minion-town-clip-publishing (kriscendobot/garden).
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";

export const CLIP_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
};

export const serveEdition = async (htmlPath) => {
  const directory = dirname(htmlPath);
  const server = createServer((request, response) => {
    const name = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname.slice(1),
    );
    const type = contentTypes[extname(name)];
    if (!type || name.includes("/") || !existsSync(join(directory, name))) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "content-type": type,
      "content-security-policy": CLIP_CSP,
    });
    response.end(readFileSync(join(directory, name)));
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  return {
    url: `http://127.0.0.1:${server.address().port}/${encodeURIComponent(htmlPath.slice(directory.length + 1))}`,
    close: () => new Promise((closed) => server.close(closed)),
  };
};
