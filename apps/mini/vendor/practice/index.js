"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correctText = exports.responseText = exports.FLUENCY_XP = exports.xpToReachLevel = exports.levelFromXp = exports.xpForCorrect = exports.practiceStep = exports.practiceInit = exports.checkAnswer = void 0;
__exportStar(require("./types"), exports);
var check_1 = require("./check");
Object.defineProperty(exports, "checkAnswer", { enumerable: true, get: function () { return check_1.checkAnswer; } });
var engine_1 = require("./engine");
Object.defineProperty(exports, "practiceInit", { enumerable: true, get: function () { return engine_1.practiceInit; } });
Object.defineProperty(exports, "practiceStep", { enumerable: true, get: function () { return engine_1.practiceStep; } });
var xp_1 = require("./xp");
Object.defineProperty(exports, "xpForCorrect", { enumerable: true, get: function () { return xp_1.xpForCorrect; } });
Object.defineProperty(exports, "levelFromXp", { enumerable: true, get: function () { return xp_1.levelFromXp; } });
Object.defineProperty(exports, "xpToReachLevel", { enumerable: true, get: function () { return xp_1.xpToReachLevel; } });
Object.defineProperty(exports, "FLUENCY_XP", { enumerable: true, get: function () { return xp_1.FLUENCY_XP; } });
var answerText_1 = require("./answerText");
Object.defineProperty(exports, "responseText", { enumerable: true, get: function () { return answerText_1.responseText; } });
Object.defineProperty(exports, "correctText", { enumerable: true, get: function () { return answerText_1.correctText; } });
