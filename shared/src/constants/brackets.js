"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BRACKETS = void 0;
/**
 * Default time brackets for offline / first-run. Order matters: post_lunch before
 * deep_work so 12–14 matches post_lunch first (overlaps 10–22).
 */
exports.DEFAULT_BRACKETS = [
    { start: 6, end: 10, mood: 'morning', theme: 'GitHub Light' },
    { start: 12, end: 14, mood: 'post_lunch', theme: 'One Dark Pro' },
    { start: 10, end: 22, mood: 'deep_work', theme: 'Tokyo Night' },
    { start: 22, end: 6, mood: 'late_night', theme: 'Dracula' },
];
