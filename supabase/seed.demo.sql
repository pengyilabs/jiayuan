-- GENERADO por scripts/generate-seed.ts — no editar a mano (npm run db:seed:generate).
-- Datos de DEMOSTRACIÓN: usuarios, propiedades y posts. Solo desarrollo local.
-- Contraseña de todos los usuarios demo: demo-password-123

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
select
  '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email,
  extensions.crypt('demo-password-123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, v.meta, now(), now(), '', '', '', ''
from (values
  ('00000000-0000-4000-8000-0000000000a1', 'zhuyan@homedirect.ca', '{"username":"zhuyan","full_name":"朱晏","locale":"zh"}'::jsonb),
  ('00000000-0000-4000-8000-0000000000a2', 'liming@homedirect.ca', '{"username":"liming","full_name":"李明","locale":"zh"}'::jsonb),
  ('00000000-0000-4000-8000-0000000000a3', 'wangfang@homedirect.ca', '{"username":"wangfang","full_name":"王芳","locale":"zh"}'::jsonb)
) as v (id, email, meta);

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) values
  (gen_random_uuid(), '00000000-0000-4000-8000-0000000000a1', '{"sub":"00000000-0000-4000-8000-0000000000a1","email":"zhuyan@homedirect.ca"}'::jsonb, 'email', '00000000-0000-4000-8000-0000000000a1', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-8000-0000000000a2', '{"sub":"00000000-0000-4000-8000-0000000000a2","email":"liming@homedirect.ca"}'::jsonb, 'email', '00000000-0000-4000-8000-0000000000a2', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-8000-0000000000a3', '{"sub":"00000000-0000-4000-8000-0000000000a3","email":"wangfang@homedirect.ca"}'::jsonb, 'email', '00000000-0000-4000-8000-0000000000a3', now(), now(), now());

-- En desarrollo local el administrador demo no tiene TOTP: se desactiva la exigencia de MFA.
-- (En staging/producción el valor por defecto es true y NO debe cambiarse.)
update public.organization_settings set require_admin_mfa = false;

-- El trigger on_auth_user_created crea los perfiles como "employee"; se eleva al administrador demo.
update public.profiles set role = 'admin' where id in ('00000000-0000-4000-8000-0000000000a1');

insert into public.listings (id, centris_id, title, description, address, price, currency, beds, baths, area_sqft, property_type, status, amenities, created_by) overriding system value values
  (1, '12345678', '{"zh":"市中心豪华公寓","en":"Downtown Luxury Condo","fr":"Condo de luxe centre-ville"}'::jsonb, '{"zh":"位于蒙特利尔市中心黄金地段，步行可达麦吉尔大学、地铁站和各大商圈。这套现代化公寓拥有开放式格局，配备全套不锈钢电器、大理石台面和硬木地板。","en":"Prime downtown Montreal location, walking distance to McGill University, metro stations and shopping centers. Modern open-concept condo with stainless steel appliances, marble countertops and hardwood floors.","fr":"Emplacement central à Montréal, à distance de marche de l''Université McGill, des stations de métro et des centres commerciaux. Condo moderne ouvert avec électroménagers en acier inoxydable."}'::jsonb, '123 Rue Sainte-Catherine O, Montréal', 850000, 'CAD', 3, 2, 1200, 'apartment', 'for_sale', array['parking', 'gym', 'pool', 'security', 'terrace', 'storage']::text[], '00000000-0000-4000-8000-0000000000a1'),
  (2, '23456789', '{"zh":"西山别墅","en":"Westmount Villa","fr":"Villa Westmount"}'::jsonb, '{"zh":"西山顶级地段独栋别墅，拥有4间宽敞卧室、私人花园和车库。周边环绕蒙特利尔最优质的学校和公园。","en":"Premium Westmount detached villa with 4 spacious bedrooms, private garden and garage. Surrounded by Montreal''s best schools and parks.","fr":"Villa détachée de luxe à Westmount avec 4 chambres spacieuses, jardin privé et garage. Entourée des meilleures écoles et parcs de Montréal."}'::jsonb, '456 Avenue Belvedere, Westmount', 1250000, 'CAD', 4, 3, 2800, 'villa', 'for_sale', array['parking', 'gym', 'security', 'terrace']::text[], '00000000-0000-4000-8000-0000000000a1'),
  (3, '34567890', '{"zh":"皇家山景观房","en":"Mount Royal View","fr":"Vue Mont Royal"}'::jsonb, '{"zh":"紧邻皇家山公园，享有绝美城市景观。2卧1卫精装公寓，适合年轻专业人士或小家庭。","en":"Adjacent to Mount Royal Park with stunning city views. 2-bed, 1-bath fully furnished apartment, perfect for young professionals or small families.","fr":"Adjacent au parc du Mont Royal avec vue imprenable sur la ville. Appartement 2 chambres, 1 salle de bain, meublé, parfait pour les jeunes professionnels."}'::jsonb, '789 Avenue du Parc, Montréal', 680000, 'CAD', 2, 1, 900, 'apartment', 'for_sale', array['gym', 'pool', 'security']::text[], '00000000-0000-4000-8000-0000000000a1'),
  (4, '45678901', '{"zh":"Westmount 联排","en":"Westmount Townhouse","fr":"Maison en rang Westmount"}'::jsonb, '{"zh":"Westmount核心地段联排别墅，3卧2卫，带私人车库和花园。步行可达商业街和优质学校。","en":"Westmount core townhouse, 3-bed, 2-bath with private garage and garden. Walking distance to shops and top schools.","fr":"Maison en rang au cœur de Westmount, 3 chambres, 2 salles de bain avec garage et jardin privé. À distance de marche des commerces."}'::jsonb, '321 Rue Green, Westmount', 920000, 'CAD', 3, 2, 1800, 'villa', 'sold', array['parking', 'security', 'terrace']::text[], '00000000-0000-4000-8000-0000000000a1'),
  (5, '56789012', '{"zh":"Outremont 花园洋房","en":"Outremont Garden House","fr":"Maison-jardin Outremont"}'::jsonb, '{"zh":"Outremont豪华花园洋房，5卧4卫，宽敞花园和露台。适合大家庭，周边环境优雅安静。","en":"Luxurious Outremont garden house, 5-bed, 4-bath with spacious garden and terrace. Ideal for large families in an elegant, quiet neighborhood.","fr":"Somptueuse maison-jardin à Outremont, 5 chambres, 4 salles de bain avec jardin et terrasse spacieux. Idéale pour les grandes familles."}'::jsonb, '654 Avenue Outremont, Montréal', 1450000, 'CAD', 5, 4, 3500, 'villa', 'for_rent', array['parking', 'gym', 'pool', 'security', 'terrace', 'storage']::text[], '00000000-0000-4000-8000-0000000000a1'),
  (6, '67890123', '{"zh":"Griffintown 工业风公寓","en":"Griffintown Loft","fr":"Loft Griffintown"}'::jsonb, '{"zh":"Griffintown时尚工业风Loft，高层城市景观，开放格局。步行可达Lachine运河和Old Port。","en":"Stylish Griffintown industrial loft with high-floor city views and open layout. Walking distance to Lachine Canal and Old Port.","fr":"Loft industriel élégant à Griffintown avec vue panoramique sur la ville et plan ouvert. À distance de marche du canal Lachine et du Vieux-Port."}'::jsonb, '987 Rue Peel, Montréal', 520000, 'CAD', 1, 1, 750, 'apartment', 'for_sale', array['gym', 'security']::text[], '00000000-0000-4000-8000-0000000000a1');

do $$ begin perform setval(pg_get_serial_sequence('public.listings', 'id'), (select coalesce(max(id), 1) from public.listings)); end $$;

insert into public.listing_media (listing_id, path, kind, position) values
  (1, 'images/listings/condo1.jpg', 'image', 0),
  (1, 'images/listings/condo2.jpg', 'image', 1),
  (1, 'images/listings/condo3.jpg', 'image', 2),
  (1, 'images/listings/condo4.jpg', 'image', 3),
  (2, 'images/listings/villa1.jpg', 'image', 0),
  (2, 'images/listings/villa2.jpg', 'image', 1),
  (2, 'images/listings/villa3.jpg', 'image', 2),
  (2, 'images/listings/villa4.jpg', 'image', 3),
  (3, 'images/listings/view1.jpg', 'image', 0),
  (3, 'images/listings/view2.jpg', 'image', 1),
  (3, 'images/listings/view3.jpg', 'image', 2),
  (4, 'images/listings/town1.jpg', 'image', 0),
  (4, 'images/listings/town2.jpg', 'image', 1),
  (4, 'images/listings/town3.jpg', 'image', 2),
  (5, 'images/listings/garden1.jpg', 'image', 0),
  (5, 'images/listings/garden2.jpg', 'image', 1),
  (5, 'images/listings/garden3.jpg', 'image', 2),
  (5, 'images/listings/garden4.jpg', 'image', 3),
  (6, 'images/listings/loft1.jpg', 'image', 0),
  (6, 'images/listings/loft2.jpg', 'image', 1),
  (6, 'images/listings/loft3.jpg', 'image', 2);

insert into public.posts (id, listing_id, author_id, platform_id, format, lang, title, body, hashtags, price, beds, baths, status, scheduled_at, approved_by, approved_at, published_at, rejection_reason) overriding system value values
  (1, 1, '00000000-0000-4000-8000-0000000000a2', 'facebook', 'carousel', 'zh', '市中心豪华公寓 · 好房推荐', '蒙特利尔市中心黄金地段，步行可达麦吉尔大学和地铁站。现代开放式格局，配备全套不锈钢电器。', '#蒙特利尔 #房产 #公寓 #市中心', 850000, 3, 2, 'published', '2026-08-22T09:00:00-04:00', '00000000-0000-4000-8000-0000000000a1', '2026-08-22T08:00:00-04:00', '2026-08-22T09:05:00-04:00', default),
  (2, 1, '00000000-0000-4000-8000-0000000000a2', 'wechat_official', 'single', 'zh', '市中心豪华公寓 · 好房推荐', '蒙特利尔市中心黄金地段，步行可达麦吉尔大学和地铁站。现代开放式格局，配备全套不锈钢电器。限时优惠！', '', 850000, 3, 2, 'published', '2026-08-22T09:00:00-04:00', '00000000-0000-4000-8000-0000000000a1', '2026-08-22T08:00:00-04:00', '2026-08-22T09:05:00-04:00', default),
  (3, 2, '00000000-0000-4000-8000-0000000000a2', 'facebook', 'single', 'en', 'Westmount Villa · Luxury Living', 'Prestigious Westmount estate with stunning mountain views. Renovated kitchen, private garden, and ample parking.', '#Westmount #LuxuryHome #MontrealRealEstate', 1250000, 5, 4, 'published', '2026-08-21T09:00:00-04:00', '00000000-0000-4000-8000-0000000000a1', '2026-08-21T08:00:00-04:00', '2026-08-21T09:05:00-04:00', default),
  (4, 3, '00000000-0000-4000-8000-0000000000a2', 'wechat_official', 'single', 'zh', '皇家山景观房 · 限时优惠', '皇家山脚下优质学区房，俯瞰城市天际线。全新装修，拎包入住。限时优惠中！', '', 720000, 3, 2, 'pending', '2026-08-22T09:00:00-04:00', default, default, default, default),
  (5, 3, '00000000-0000-4000-8000-0000000000a2', 'wechat_channels', 'video', 'zh', '皇家山景观房 · Mount Royal View', '皇家山脚下优质学区房，俯瞰城市天际线。全新装修，拎包入住。', '#皇家山 #蒙特利尔 #学区房', 720000, 3, 2, 'pending', '2026-08-22T09:00:00-04:00', default, default, default, default),
  (6, null, '00000000-0000-4000-8000-0000000000a3', 'facebook', 'carousel', 'zh', '蒙特利尔房产市场周报', '本周蒙特利尔房产市场数据分析：均价微涨3.2%，成交量回升。详解各区域热点趋势。', '#蒙特利尔 #房产市场 #数据分析', null, null, null, 'pending', '2026-08-22T09:00:00-04:00', default, default, default, default),
  (7, null, '00000000-0000-4000-8000-0000000000a3', 'wechat_official', 'single', 'zh', '蒙特利尔房产市场周报', '本周蒙特利尔房产市场数据分析：均价微涨3.2%，成交量回升。详解各区域热点趋势。', '', null, null, null, 'pending', '2026-08-22T09:00:00-04:00', default, default, default, default),
  (8, 5, '00000000-0000-4000-8000-0000000000a2', 'facebook', 'single', 'en', 'Outremont Garden House · Exclusive', 'Rare Outremont gem with private garden oasis. Classic architecture meets modern comfort in this boutique residence.', '#Outremont #GardenHome #Montreal', 980000, 4, 3, 'draft', '2026-08-20T09:00:00-04:00', default, default, default, default),
  (9, 6, '00000000-0000-4000-8000-0000000000a3', 'facebook', 'carousel', 'bilingual', 'Griffintown Loft · Studio Living', 'Industrial-chic loft in Griffintown. Exposed brick, 14ft ceilings, and open-concept living. Steps from the Lachine Canal.', '#Griffintown #Loft #IndustrialChic', 425000, 1, 1, 'rejected', '2026-08-19T09:00:00-04:00', default, default, default, 'Please use higher-resolution photos and add the price.'),
  (10, 6, '00000000-0000-4000-8000-0000000000a3', 'wechat_official', 'single', 'zh', 'Griffintown 工业风公寓 · 精品推荐', 'Griffintown时尚工业风Loft，高层城市景观，开放格局。步行可达Lachine运河和Old Port。', '', 425000, 1, 1, 'rejected', '2026-08-19T09:00:00-04:00', default, default, default, '照片分辨率不足，请更换后重新提交。'),
  (11, null, '00000000-0000-4000-8000-0000000000a2', 'wechat_official', 'single', 'zh', '加园地产 · 品牌宣传', '加园地产 — 蒙特利尔华人信赖的房产服务团队。专注买房、卖房、租赁一站式服务。', '', null, null, null, 'pending', '2026-08-22T09:00:00-04:00', default, default, default, default),
  (12, 1, '00000000-0000-4000-8000-0000000000a2', 'instagram', 'single', 'en', '市中心豪华公寓 · Downtown Living', 'Modern downtown living at its finest. Steps from McGill, metro, and all amenities. Open concept, stainless steel appliances.', '#MontrealRealEstate #DowntownLiving #CondoLife #Montreal', 850000, 3, 2, 'published', '2026-08-20T09:00:00-04:00', '00000000-0000-4000-8000-0000000000a1', '2026-08-20T08:00:00-04:00', '2026-08-20T09:05:00-04:00', default),
  (13, 5, '00000000-0000-4000-8000-0000000000a2', 'instagram', 'carousel', 'zh', 'Outremont 花园洋房 · Garden Oasis', 'Rare Outremont gem with private garden oasis. Classic architecture meets modern comfort.', '#Outremont #GardenHome #Montreal #LuxuryLiving', 980000, 4, 3, 'draft', '2026-08-19T09:00:00-04:00', default, default, default, default),
  (14, 3, '00000000-0000-4000-8000-0000000000a3', 'xiaohongshu', 'single', 'zh', '皇家山景观房 · 高层视野', '皇家山脚下优质学区房，俯瞰城市天际线。全新装修，拎包入住。', '#蒙特利尔买房 #皇家山 #学区房 #加拿大房产', 720000, 3, 2, 'published', '2026-08-21T09:00:00-04:00', '00000000-0000-4000-8000-0000000000a1', '2026-08-21T08:00:00-04:00', '2026-08-21T09:05:00-04:00', default),
  (15, 2, '00000000-0000-4000-8000-0000000000a3', 'xiaohongshu', 'carousel', 'zh', '西山别墅 · 品质生活', '西山豪宅区，私家花园， mountain views。蒙特利尔顶级社区，适合家庭定居。', '#蒙特利尔豪宅 #西山 #加拿大生活 #房产', 1250000, 5, 4, 'published', '2026-08-22T09:00:00-04:00', '00000000-0000-4000-8000-0000000000a1', '2026-08-22T08:00:00-04:00', '2026-08-22T09:05:00-04:00', default),
  (16, 1, '00000000-0000-4000-8000-0000000000a3', 'douyin', 'video', 'zh', '市中心公寓 · 看房vlog', '蒙特利尔市中心豪华公寓实拍！步行5分钟到McGill大学，地铁直达。', '#蒙特利尔 #看房 #公寓 #加拿大生活', 850000, 3, 2, 'published', '2026-08-21T09:00:00-04:00', '00000000-0000-4000-8000-0000000000a1', '2026-08-21T08:00:00-04:00', '2026-08-21T09:05:00-04:00', default),
  (17, 5, '00000000-0000-4000-8000-0000000000a3', 'douyin', 'video', 'zh', 'Outremont花园洋房 · 房源展示', 'Outremont稀有花园洋房，私家花园，古典建筑。蒙特利尔最适合居住的社区之一。', '#Outremont #花园洋房 #蒙特利尔房产 #加拿大', 980000, 4, 3, 'draft', '2026-08-22T09:00:00-04:00', default, default, default, default);

do $$ begin perform setval(pg_get_serial_sequence('public.posts', 'id'), (select coalesce(max(id), 1) from public.posts)); end $$;

insert into public.post_media (post_id, path, kind, position) values
  (1, 'images/listings/condo1.jpg', 'image', 0),
  (1, 'images/listings/condo2.jpg', 'image', 1),
  (1, 'images/listings/condo3.jpg', 'image', 2),
  (2, 'images/listings/condo1.jpg', 'image', 0),
  (3, 'images/listings/villa1.jpg', 'image', 0),
  (4, 'images/listings/view1.jpg', 'image', 0),
  (5, 'images/listings/view1.jpg', 'image', 0),
  (6, 'images/listings/condo2.jpg', 'image', 0),
  (6, 'images/listings/loft1.jpg', 'image', 1),
  (7, 'images/listings/condo2.jpg', 'image', 0),
  (8, 'images/listings/garden1.jpg', 'image', 0),
  (9, 'images/listings/loft1.jpg', 'image', 0),
  (9, 'images/listings/loft2.jpg', 'image', 1),
  (10, 'images/listings/loft1.jpg', 'image', 0),
  (11, 'images/listings/condo3.jpg', 'image', 0),
  (12, 'images/listings/condo1.jpg', 'image', 0),
  (13, 'images/listings/garden1.jpg', 'image', 0),
  (13, 'images/listings/garden2.jpg', 'image', 1),
  (13, 'images/listings/garden3.jpg', 'image', 2),
  (14, 'images/listings/view1.jpg', 'image', 0),
  (15, 'images/listings/villa1.jpg', 'image', 0),
  (15, 'images/listings/villa2.jpg', 'image', 1),
  (15, 'images/listings/villa3.jpg', 'image', 2),
  (16, 'images/listings/condo1.jpg', 'image', 0),
  (17, 'images/listings/garden1.jpg', 'image', 0);

-- Administrador demo: 00000000-0000-4000-8000-0000000000a1
