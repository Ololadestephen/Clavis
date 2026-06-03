export function createRequire() {
  return function browserRequire() {
    throw new Error("Node require is not available in the browser.");
  };
}
