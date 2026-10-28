import login from '../pages/Login.dict.js';
import owner from '../pages/OwnerDashboard.dict.js';
import agent from '../pages/AgentFeed.dict.js';
import listings from '../pages/Listings.dict.js';

const LANGS = ['zh', 'en', 'fr', 'es'];
const merged = {};
for (const l of LANGS) {
  merged[l] = Object.assign({}, login[l] || {}, owner[l] || {}, agent[l] || {}, listings[l] || {});
}
export default merged;
