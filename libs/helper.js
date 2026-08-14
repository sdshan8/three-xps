function basename(path) {
  return path.split(/[\\/]/).pop();
}

function isNone(value) {
  if(value === undefined) return true;
  if(value === null) return true;
  return false;
}

function extractModelName(value) {
  const match = value.match(/([^\\\/]+)\.mesh\s*-->/i);
  return match ? match[1] : "model";
}

export {
  basename,
  isNone,
  extractModelName
}