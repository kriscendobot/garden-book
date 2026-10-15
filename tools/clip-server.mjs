// The garden's skills/minion-town-clip-publishing (kriscendobot/garden)
// documents the script-src, style-src, connect-src, and img-src directives of
// published clips; the other CLIP_CONTENT_SECURITY_POLICY directives are this
// tool's assumption.
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";

export const CLIP_CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
};

// A published name is one plain file directly in the edition directory.
const PUBLISHED_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

const readPublished = (directory, pathname) => {
  let name;
  try {
    name = decodeURIComponent(pathname.slice(1));
  } catch {
    return { status: 400 };
  }
  const type = contentTypes[extname(name)];
  if (!type || !PUBLISHED_NAME.test(name)) {
    return { status: 404 };
  }
  const path = join(directory, name);
  try {
    if (!statSync(path).isFile()) {
      return { status: 404 };
    }
    return { status: 200, type, body: readFileSync(path) };
  } catch {
    return { status: 404 };
  }
};

export const serveEdition = async (htmlPath) => {
  const directory = dirname(htmlPath);
  const server = createServer((request, response) => {
    const { status, type, body } = readPublished(
      directory,
      new URL(request.url, "http://localhost").pathname,
    );
    if (status !== 200) {
      response.writeHead(status).end();
      return;
    }
    response.writeHead(200, {
      "content-type": type,
      "content-security-policy": CLIP_CONTENT_SECURITY_POLICY,
    });
    response.end(body);
  });
  await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
  return {
    url: `http://127.0.0.1:${server.address().port}/${encodeURIComponent(htmlPath.slice(directory.length + 1))}`,
    close: () => new Promise((closed) => server.close(closed)),
  };
};
