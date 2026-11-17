// 知识地图的取数辅助。逐字对应 Web 端 src/map/map.ts 的三个纯函数。
//
// 为什么不编译进 vendor: map.ts 顶部硬 import 了 grade3 的 JSON (历史遗留),
// 小程序的内容由 content/index.js 按年级提供, 所以只搬这几个无状态函数。

const PEDAGOGY_LABEL = {
  fluency: '口算',
  procedure: '竖式',
  formula: '公式',
  concept: '概念',
  logic: '推理',
  data: '数据',
};

function unitsByTerm(map, term) {
  return map.units.filter((u) => u.term === term).sort((a, b) => a.index - b.index);
}

function topicsOf(map, unit) {
  return unit.topicIds
    .map((id) => map.topics.filter((t) => t.id === id)[0])
    .filter((t) => Boolean(t));
}

function topicById(map, id) {
  return map.topics.filter((t) => t.id === id)[0];
}

module.exports = { PEDAGOGY_LABEL, unitsByTerm, topicsOf, topicById };
