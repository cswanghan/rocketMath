"use strict";
// Persistence data model (SPEC §6). Single-user/single-device MVP uses one
// implicit student id ('local'), but the schema already keys everything by
// studentId so a real multi-user backend can drop in behind StorageAdapter.
Object.defineProperty(exports, "__esModule", { value: true });
