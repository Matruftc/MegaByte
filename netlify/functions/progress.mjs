import adapter from '../../lib/netlify-adapter.js';
import handler from '../../api/progress.js';
export default adapter.adapt(handler);
export const config = {path:'/api/progress'};
