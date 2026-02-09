/**
 * Enemy entity factories – barrel re-export for backwards compatibility.
 * Each enemy type lives in its own file to stay under the 250-line limit.
 */

export { createWalkerEnemy } from './create-walker.js';
export { createFlyerEnemy } from './create-flyer.js';
export { createTurretEnemy } from './create-turret.js';
export { createSentryEnemy } from './create-sentry.js';
export { createCrawlerEnemy } from './create-crawler.js';
