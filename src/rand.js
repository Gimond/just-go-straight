exports.int = function (max) {
  return Math.random() * (max || 0xfffffff) | 0;
};
exports.range = function (min, max) {
  return this.int(max - min) + min;
};
