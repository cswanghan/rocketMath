"use strict";
// Core engine types. This file is the contract pinned down BEFORE the reducer
// (see SPEC.md §5). The engine is pure TypeScript: zero React, zero DOM, zero
// network/LLM. Nothing in src/engine/ may import a browser or fetch API.
Object.defineProperty(exports, "__esModule", { value: true });
