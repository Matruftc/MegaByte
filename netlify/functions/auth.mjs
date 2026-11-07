import adapter from '../../lib/netlify-adapter.js';
import handler from '../../api/auth.js';
export default adapter.adapt(handler, {maxBytes:12000});
export const config = {path:'/api/auth'};
