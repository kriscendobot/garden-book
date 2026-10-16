export const readText = async (tree, name) => {
  const blob = await tree.lookup(name);
  if (typeof blob?.text !== "function") {
    throw new TypeError(`${name} is not a readable text blob`);
  }
  return blob.text();
};

export const readBytes = async (tree, name) => {
  const blob = await tree.lookup(name);
  if (typeof blob?.bytes !== "function") {
    throw new TypeError(`${name} is not a readable binary blob`);
  }
  return blob.bytes();
};

export const writeText = async (tree, name, content) => {
  if (typeof tree?.writeText !== "function") {
    throw new TypeError(
      "The output tree does not provide writeText(name, content)",
    );
  }
  await tree.writeText(name, content);
};

export const writeBytes = async (tree, name, content) => {
  if (typeof tree?.writeBytes !== "function") {
    throw new TypeError(
      "The output tree does not provide writeBytes(name, content)",
    );
  }
  await tree.writeBytes(name, content);
};
