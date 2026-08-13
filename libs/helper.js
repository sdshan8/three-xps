function basename(path) {
  return path.split(/[\\/]/).pop();
}

function isNone(value) {
  if(value === undefined) return true;
  if(value === null) return true;
  return false;
}

export {
  basename,
  isNone
}