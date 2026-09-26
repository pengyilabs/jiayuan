-- GENERADO por scripts/generate-seed.ts — no editar a mano (npm run db:seed:generate).
-- Catálogo: plataformas, formatos, templates y configuración (re-ejecutable: ignora duplicados).

update public.organization_settings set name = 'HOME DIRECT', timezone = 'America/Toronto',
  undo_window_seconds = 8, deleted_retention_days = 30;

insert into public.platforms (id, name, color, description, publish_mode, connected, account_label, sort_order, note) values
  ('facebook', '{"zh":"Facebook"}'::jsonb, '#1877F2', '{"zh":"全球最大的社交媒体平台","en":"World''s largest social network","fr":"Le plus grand réseau social au monde"}'::jsonb, 'manual', true, 'HOME DIRECT · 加园地产', 0, default),
  ('instagram', '{"zh":"Instagram"}'::jsonb, 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', '{"zh":"图片和短视频社交平台","en":"Photo and short-video social platform","fr":"Plateforme sociale photo et vidéo courte"}'::jsonb, 'manual', false, '', 1, default),
  ('wechat_official', '{"zh":"微信公众号","en":"WeChat Official","fr":"WeChat Officiel"}'::jsonb, '#07C160', '{"zh":"微信公众号 — 图文推送、品牌宣传","en":"WeChat Official Account — articles, brand content","fr":"Compte officiel WeChat — articles, contenu de marque"}'::jsonb, 'manual', true, '蒙特利尔小朱', 2, '{"zh":"公众号适合长文推送、品牌故事、政策解读等深度内容。粉丝通过订阅查看，内容永久保留。","en":"WeChat Official Account — articles, brand content","fr":"Compte officiel WeChat — articles, contenu de marque"}'::jsonb),
  ('wechat_channels', '{"zh":"微信视频号","en":"WeChat Channels","fr":"WeChat Vidéos"}'::jsonb, '#FF6B2C', '{"zh":"微信视频号 — 短视频、直播","en":"WeChat Channels — short videos, live streaming","fr":"Vidéos WeChat — vidéos courtes, direct"}'::jsonb, 'manual', true, '蒙特利尔小朱', 3, '{"zh":"视频号适合短视频和直播，内容以推荐分发为主，适合获取新流量。与公众号可互相导流。","en":"WeChat Channels — short videos, live streaming","fr":"Vidéos WeChat — vidéos courtes, direct"}'::jsonb),
  ('xiaohongshu', '{"zh":"小红书"}'::jsonb, '#FE2C55', '{"zh":"小红书 — 种草笔记、生活方式分享","en":"Xiaohongshu — lifestyle notes, product reviews","fr":"Xiaohongshu — notes lifestyle, avis produits"}'::jsonb, 'manual', false, '', 4, '{"zh":"小红书以「种草」为核心，图文笔记是主力格式。内容偏生活化、真实感，适合房产生活分享。","en":"Xiaohongshu — lifestyle notes, product reviews","fr":"Xiaohongshu — notes lifestyle, avis produits"}'::jsonb),
  ('douyin', '{"zh":"抖音"}'::jsonb, '#010101', '{"zh":"抖音 — 短视频、直播带货","en":"Douyin — short videos, live commerce","fr":"Douyin — vidéos courtes, commerce en direct"}'::jsonb, 'manual', false, '', 5, '{"zh":"抖音以短视频为核心，算法推荐分发。适合房产展示、看房vlog、生活场景内容。","en":"Douyin — short videos, live commerce","fr":"Douyin — vidéos courtes, commerce en direct"}'::jsonb),
  ('tiktok', '{"zh":"TikTok"}'::jsonb, '#010101', '{"zh":"TikTok — global short-video platform","en":"TikTok — global short-video platform","fr":"TikTok — plateforme mondiale de vidéos courtes"}'::jsonb, 'manual', false, '', 6, default),
  ('youtube', '{"zh":"YouTube"}'::jsonb, '#FF0000', '{"zh":"YouTube — 视频内容平台","en":"YouTube — video content platform","fr":"YouTube — plateforme de contenu vidéo"}'::jsonb, 'manual', false, '', 7, default),
  ('twitter', '{"zh":"X (Twitter)"}'::jsonb, '#000000', '{"zh":"X (Twitter) — 短文、图文、话题讨论","en":"X (Twitter) — short posts, images, threads","fr":"X (Twitter) — posts courts, images, fils"}'::jsonb, 'manual', false, '', 8, default)
on conflict do nothing;

insert into public.post_types (platform_id, id, name, format_group, ratio_label, sort_order) values
  ('facebook', 'single', '{"zh":"单图","en":"Single Image","fr":"Image unique"}'::jsonb, 'image', '1:1 · 4:5 · 16:9', 0),
  ('facebook', 'carousel', '{"zh":"轮播","en":"Carousel","fr":"Carrousel"}'::jsonb, 'carousel', '1:1 · 4:5 × 2-10', 1),
  ('facebook', 'video', '{"zh":"视频","en":"Video","fr":"Vidéo"}'::jsonb, 'video', '16:9 · 9:16 · 1:1', 2),
  ('facebook', 'reels', '{"zh":"Reels短视频","en":"Reels","fr":"Reels"}'::jsonb, 'short_video', '9:16 ≤ 90s', 3),
  ('facebook', 'stories', '{"zh":"Stories","en":"Stories","fr":"Stories"}'::jsonb, 'story', '9:16 ≤ 24h', 4),
  ('facebook', 'text', '{"zh":"纯文字","en":"Text Post","fr":"Publication texte"}'::jsonb, 'text', '—', 5),
  ('instagram', 'single', '{"zh":"单图","en":"Single Image","fr":"Image unique"}'::jsonb, 'image', '1:1 · 4:5', 0),
  ('instagram', 'carousel', '{"zh":"轮播","en":"Carousel","fr":"Carrousel"}'::jsonb, 'carousel', '1:1 · 4:5 × 2-10', 1),
  ('instagram', 'video', '{"zh":"视频","en":"Video","fr":"Vidéo"}'::jsonb, 'video', '16:9 · 4:5', 2),
  ('instagram', 'reels', '{"zh":"Reels","en":"Reels","fr":"Reels"}'::jsonb, 'short_video', '9:16 ≤ 90s', 3),
  ('instagram', 'stories', '{"zh":"Stories","en":"Stories","fr":"Stories"}'::jsonb, 'story', '9:16 ≤ 24h', 4),
  ('wechat_official', 'article', '{"zh":"图文消息","en":"Article","fr":"Article"}'::jsonb, 'article', '封面 2.35:1', 0),
  ('wechat_official', 'single', '{"zh":"单图","en":"Single Image","fr":"Image unique"}'::jsonb, 'image', '1:1 · 原图', 1),
  ('wechat_official', 'video', '{"zh":"视频","en":"Video","fr":"Vidéo"}'::jsonb, 'video', '16:9 · 3:4', 2),
  ('wechat_channels', 'short_video', '{"zh":"短视频","en":"Short Video","fr":"Vidéo courte"}'::jsonb, 'short_video', '9:16 ≤ 60min', 0),
  ('wechat_channels', 'live', '{"zh":"直播","en":"Live Stream","fr":"Direct"}'::jsonb, 'live', '9:16', 1),
  ('wechat_channels', 'link_post', '{"zh":"链接图文","en":"Link Post","fr":"Publication lien"}'::jsonb, 'article', '封面 2.35:1', 2),
  ('xiaohongshu', 'note', '{"zh":"图文笔记","en":"Image Note","fr":"Note image"}'::jsonb, 'image', '3:4 · 1:1', 0),
  ('xiaohongshu', 'video_note', '{"zh":"视频笔记","en":"Video Note","fr":"Note vidéo"}'::jsonb, 'short_video', '3:4 · 9:16', 1),
  ('xiaohongshu', 'carousel', '{"zh":"轮播笔记","en":"Carousel Note","fr":"Note carrousel"}'::jsonb, 'carousel', '3:4 × 2-18', 2),
  ('douyin', 'short_video', '{"zh":"短视频","en":"Short Video","fr":"Vidéo courte"}'::jsonb, 'short_video', '9:16 ≤ 15min', 0),
  ('douyin', 'live', '{"zh":"直播","en":"Live Stream","fr":"Direct"}'::jsonb, 'live', '9:16', 1),
  ('douyin', 'graphic_video', '{"zh":"图文视频","en":"Slideshow Video","fr":"Vidéo diaporama"}'::jsonb, 'short_video', '9:16', 2),
  ('tiktok', 'short_video', '{"zh":"短视频","en":"Short Video","fr":"Vidéo courte"}'::jsonb, 'short_video', '9:16 ≤ 10min', 0),
  ('tiktok', 'photo_mode', '{"zh":"照片模式","en":"Photo Mode","fr":"Mode photo"}'::jsonb, 'carousel', '1:1 · 9:16 × up to 35', 1),
  ('tiktok', 'live', '{"zh":"直播","en":"Live Stream","fr":"Direct"}'::jsonb, 'live', '9:16', 2),
  ('youtube', 'video', '{"zh":"视频","en":"Video","fr":"Vidéo"}'::jsonb, 'video', '16:9', 0),
  ('youtube', 'shorts', '{"zh":"Shorts","en":"Shorts","fr":"Shorts"}'::jsonb, 'short_video', '9:16 ≤ 60s', 1),
  ('youtube', 'community', '{"zh":"社区帖子","en":"Community Post","fr":"Publication communautaire"}'::jsonb, 'text', '图文/投票', 2),
  ('twitter', 'text', '{"zh":"纯文字","en":"Text Post","fr":"Publication texte"}'::jsonb, 'text', '≤ 280字符', 0),
  ('twitter', 'single', '{"zh":"单图","en":"Single Image","fr":"Image unique"}'::jsonb, 'image', '16:9 · 1:1', 1),
  ('twitter', 'multi_image', '{"zh":"多图","en":"Multi Image","fr":"Image multiple"}'::jsonb, 'image', '最多4张', 2),
  ('twitter', 'video', '{"zh":"视频","en":"Video","fr":"Vidéo"}'::jsonb, 'video', '16:9 · 1:1', 3),
  ('twitter', 'thread', '{"zh":"长推文串","en":"Thread","fr":"Fil"}'::jsonb, 'text', '多条串联', 4)
on conflict do nothing;

insert into public.post_type_groups (id, name, description, sort_order) values
  ('image', '单图 / Single Image', '{"zh":"适用于各平台的静态图片发布","en":"Static image posts across platforms","fr":"Publications d''images statiques"}'::jsonb, 0),
  ('carousel', '轮播 / Carousel', '{"zh":"多图滑动展示，适合房源多角度展示","en":"Multi-image swipe, great for property showcase","fr":"Diaporama multi-images"}'::jsonb, 1),
  ('video', '视频 / Video', '{"zh":"标准横屏或竖屏视频","en":"Standard horizontal or vertical video","fr":"Vidéo horizontale ou verticale"}'::jsonb, 2),
  ('short_video', '短视频 / Short Video', '{"zh":"竖屏短视频，适合移动端沉浸式浏览","en":"Vertical short video for mobile-first feeds","fr":"Vidéo courte verticale"}'::jsonb, 3),
  ('story', 'Stories / 限时动态', '{"zh":"24小时后消失的临时内容","en":"Ephemeral content, disappears after 24h","fr":"Contenu éphémère, disparaît après 24h"}'::jsonb, 4),
  ('live', '直播 / Live Stream', '{"zh":"实时直播，适合看房、问答","en":"Real-time streaming, great for tours & Q&A","fr":"Diffusion en direct"}'::jsonb, 5),
  ('article', '图文文章 / Article', '{"zh":"长文推送，适合深度内容","en":"Long-form articles for in-depth content","fr":"Articles longs pour contenu approfondi"}'::jsonb, 6),
  ('text', '纯文字 / Text Post', '{"zh":"文字为主的短帖","en":"Text-focused short posts","fr":"Publications courtes en texte"}'::jsonb, 7)
on conflict do nothing;

insert into public.post_type_group_platforms (group_id, platform_id) values
  ('image', 'facebook'),
  ('image', 'instagram'),
  ('image', 'wechat_official'),
  ('image', 'xiaohongshu'),
  ('image', 'twitter'),
  ('carousel', 'facebook'),
  ('carousel', 'instagram'),
  ('carousel', 'xiaohongshu'),
  ('carousel', 'tiktok'),
  ('video', 'facebook'),
  ('video', 'instagram'),
  ('video', 'wechat_official'),
  ('video', 'youtube'),
  ('video', 'twitter'),
  ('short_video', 'facebook'),
  ('short_video', 'instagram'),
  ('short_video', 'wechat_channels'),
  ('short_video', 'xiaohongshu'),
  ('short_video', 'douyin'),
  ('short_video', 'tiktok'),
  ('short_video', 'youtube'),
  ('story', 'facebook'),
  ('story', 'instagram'),
  ('live', 'wechat_channels'),
  ('live', 'douyin'),
  ('live', 'tiktok'),
  ('article', 'wechat_official'),
  ('article', 'wechat_channels'),
  ('text', 'facebook'),
  ('text', 'twitter'),
  ('text', 'youtube')
on conflict do nothing;

insert into public.templates (id, name_key, layout, scene, lang_label, color, description, platform_tags) overriding system value values
  (1, 'tpl_sale_zh_name', 'hero', '出售', '中文', '#fde8e5', '{"zh":"全幅房源照片背景，叠加价格和标题文字，底部品牌标识","en":"Full-width property photo background with price and title overlay, brand logo at bottom"}'::jsonb, array['微信', 'Facebook']::text[]),
  (2, 'tpl_sale_en_name', 'split', 'Sale', 'English', '#e8d5f0', '{"zh":"左侧大图，右侧房源信息和亮点标签","en":"Left large image, right side property info and highlight badges"}'::jsonb, array['Facebook']::text[]),
  (3, 'tpl_rent_zh_name', 'hero', '出租', '中文', '#d5e8f0', '{"zh":"全幅房源照片背景，叠加租金和设施图标","en":"Full-width property photo background with rent price and amenity icons"}'::jsonb, array['微信', 'Facebook']::text[]),
  (4, 'tpl_brand_zh_name', 'split', 'Brand', '中文', '#f0e8d5', '{"zh":"左侧团队照片，右侧品牌标语和联系方式","en":"Left team photo, right side brand tagline and contact info"}'::jsonb, array['微信']::text[]),
  (5, 'tpl_sale_bilingual_name', 'hero', 'Sale', '双语', '#d5f0e8', '{"zh":"全幅房源照片，中英双语标题和价格","en":"Full-width property photo, bilingual title and price"}'::jsonb, array['Facebook', '微信']::text[]),
  (6, 'tpl_rent_en_name', 'split', 'Rent', 'English', '#e8f0d5', '{"zh":"左侧房源照片，右侧租金和位置信息","en":"Left property photo, right side rent and location info"}'::jsonb, array['Facebook']::text[]),
  (7, 'tpl_gallery_name', 'gallery', 'Sale', '双语', '#f5e6d0', '{"zh":"2×2图片网格，中央叠加价格标签","en":"2×2 image grid with centered price badge overlay"}'::jsonb, array['Facebook', 'Instagram']::text[]),
  (8, 'tpl_magazine_name', 'magazine', 'Sale', 'English', '#e0e0e0', '{"zh":"杂志编辑风格，大图配侧边栏文字","en":"Editorial magazine style with large hero and sidebar text panel"}'::jsonb, array['微信公众号', 'Facebook']::text[]),
  (9, 'tpl_story_name', 'story', 'Sale', '双语', '#d5d0f0', '{"zh":"竖屏全幅格式，适合Instagram Stories","en":"Vertical full-bleed format for Instagram Stories and Reels"}'::jsonb, array['Instagram', '微信视频号']::text[]),
  (10, 'tpl_minimal_name', 'minimal', 'Sale', 'English', '#f0f0f0', '{"zh":"极简白底，左侧细红线强调，右侧信息","en":"Minimalist white with red accent border, clean info layout"}'::jsonb, array['Facebook', 'Instagram']::text[]),
  (11, 'tpl_diagonal_name', 'diagonal', 'Sale', '双语', '#ffe0e5', '{"zh":"对角线分割图片与文字区域，动感设计","en":"Diagonal split between image and text, dynamic modern design"}'::jsonb, array['Facebook', 'Instagram']::text[]),
  (12, 'tpl_features_name', 'features', 'Sale', '中文', '#e5f0e8', '{"zh":"大图配浮动特色标签（泳池、车库等）","en":"Large hero image with floating feature badges (pool, garage, etc.)"}'::jsonb, array['微信', 'Facebook']::text[])
on conflict do nothing;

do $$ begin perform setval(pg_get_serial_sequence('public.templates', 'id'), (select coalesce(max(id), 1) from public.templates)); end $$;
