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
exports.initTrackState = exports.step = exports.pickFact = exports.factById = exports.poolForPhase = exports.learnedPool = exports.universePool = exports.orbitPool = exports.takeOffPool = exports.nextLevel = exports.newFactsOf = exports.getEnabledTracks = exports.getTrack = exports.computeLatencyGateMs = exports.computeFromPrompt = exports.validatePack = exports.ContentPackError = exports.mulberry32 = void 0;
// Public engine barrel. The UI imports ONLY from here.
__exportStar(require("./types"), exports);
var rng_1 = require("./rng");
Object.defineProperty(exports, "mulberry32", { enumerable: true, get: function () { return rng_1.mulberry32; } });
var contentPack_1 = require("./contentPack");
Object.defineProperty(exports, "ContentPackError", { enumerable: true, get: function () { return contentPack_1.ContentPackError; } });
Object.defineProperty(exports, "validatePack", { enumerable: true, get: function () { return contentPack_1.validatePack; } });
Object.defineProperty(exports, "computeFromPrompt", { enumerable: true, get: function () { return contentPack_1.computeFromPrompt; } });
Object.defineProperty(exports, "computeLatencyGateMs", { enumerable: true, get: function () { return contentPack_1.computeLatencyGateMs; } });
Object.defineProperty(exports, "getTrack", { enumerable: true, get: function () { return contentPack_1.getTrack; } });
Object.defineProperty(exports, "getEnabledTracks", { enumerable: true, get: function () { return contentPack_1.getEnabledTracks; } });
Object.defineProperty(exports, "newFactsOf", { enumerable: true, get: function () { return contentPack_1.newFactsOf; } });
Object.defineProperty(exports, "nextLevel", { enumerable: true, get: function () { return contentPack_1.nextLevel; } });
Object.defineProperty(exports, "takeOffPool", { enumerable: true, get: function () { return contentPack_1.takeOffPool; } });
Object.defineProperty(exports, "orbitPool", { enumerable: true, get: function () { return contentPack_1.orbitPool; } });
Object.defineProperty(exports, "universePool", { enumerable: true, get: function () { return contentPack_1.universePool; } });
Object.defineProperty(exports, "learnedPool", { enumerable: true, get: function () { return contentPack_1.learnedPool; } });
Object.defineProperty(exports, "poolForPhase", { enumerable: true, get: function () { return contentPack_1.poolForPhase; } });
Object.defineProperty(exports, "factById", { enumerable: true, get: function () { return contentPack_1.factById; } });
var select_1 = require("./select");
Object.defineProperty(exports, "pickFact", { enumerable: true, get: function () { return select_1.pickFact; } });
var engine_1 = require("./engine");
Object.defineProperty(exports, "step", { enumerable: true, get: function () { return engine_1.step; } });
Object.defineProperty(exports, "initTrackState", { enumerable: true, get: function () { return engine_1.initTrackState; } });
