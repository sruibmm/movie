import base from './arabicBulkCatalog.json';
import alternate from './publisherMegaAlternates.json';
export const extendedDailymotionCatalog={...base,series:[...base.series,...alternate]};
