export const readText = async (tree, name) => {
  const blob = await tree.lookup(name);
  if (typeof blob?.text !== "function") {
    throw new TypeError(`${name} is not a readable text blob`);
  }
  return blob.text();
};

export const writeText = async (tree, name, content) => {
  if (typeof tree?.writeText !== "function") {
    throw new TypeError(
      "The output tree does not provide writeText(name, content)",
    );
  }
  await tree.writeText(name, content);
};
