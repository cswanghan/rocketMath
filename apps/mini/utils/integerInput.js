// Only edits the answer field; the engine continues to own scoring/progression.
function appendDigit(input, digit) {
  if (!/^\d$/.test(String(digit)) || !/^-?\d*$/.test(input)) return input;
  return input.replace('-', '').length < 5 ? input + digit : input;
}
function toggleSign(input) { return input.indexOf('-') === 0 ? input.slice(1) : '-' + input; }
function parse(input) {
  if (!/^-?\d+$/.test(input)) return null;
  const value = Number(input);
  return Number.isSafeInteger(value) ? value : null;
}
function allowsSign(track) {
  return track.levels.some((level) => level.new_facts.some((fact) => fact.answer < 0));
}
module.exports = { appendDigit, toggleSign, parse, allowsSign };
