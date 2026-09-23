import type { TablesInsert } from '../../types/db';

export const platformsSeed: TablesInsert<'platforms'>[] = [
  {
    id: 'facebook',
    name: {
      zh: 'Facebook',
    },
    color: '#1877F2',
    description: {
      zh: '全球最大的社交媒体平台',
      en: "World's largest social network",
      fr: 'Le plus grand réseau social au monde',
    },
    publish_mode: 'manual',
    connected: true,
    account_label: 'HOME DIRECT · 加园地产',
    sort_order: 0,
  },
  {
    id: 'instagram',
    name: {
      zh: 'Instagram',
    },
    color: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
    description: {
      zh: '图片和短视频社交平台',
      en: 'Photo and short-video social platform',
      fr: 'Plateforme sociale photo et vidéo courte',
    },
    publish_mode: 'manual',
    connected: false,
    account_label: '',
    sort_order: 1,
  },
  {
    id: 'wechat_official',
    name: {
      zh: '微信公众号',
      en: 'WeChat Official',
      fr: 'WeChat Officiel',
    },
    color: '#07C160',
    description: {
      zh: '微信公众号 — 图文推送、品牌宣传',
      en: 'WeChat Official Account — articles, brand content',
      fr: 'Compte officiel WeChat — articles, contenu de marque',
    },
    note: {
      zh: '公众号适合长文推送、品牌故事、政策解读等深度内容。粉丝通过订阅查看，内容永久保留。',
      en: 'WeChat Official Account — articles, brand content',
      fr: 'Compte officiel WeChat — articles, contenu de marque',
    },
    publish_mode: 'manual',
    connected: true,
    account_label: '蒙特利尔小朱',
    sort_order: 2,
  },
  {
    id: 'wechat_channels',
    name: {
      zh: '微信视频号',
      en: 'WeChat Channels',
      fr: 'WeChat Vidéos',
    },
    color: '#FF6B2C',
    description: {
      zh: '微信视频号 — 短视频、直播',
      en: 'WeChat Channels — short videos, live streaming',
      fr: 'Vidéos WeChat — vidéos courtes, direct',
    },
    note: {
      zh: '视频号适合短视频和直播，内容以推荐分发为主，适合获取新流量。与公众号可互相导流。',
      en: 'WeChat Channels — short videos, live streaming',
      fr: 'Vidéos WeChat — vidéos courtes, direct',
    },
    publish_mode: 'manual',
    connected: true,
    account_label: '蒙特利尔小朱',
    sort_order: 3,
  },
  {
    id: 'xiaohongshu',
    name: {
      zh: '小红书',
    },
    color: '#FE2C55',
    description: {
      zh: '小红书 — 种草笔记、生活方式分享',
      en: 'Xiaohongshu — lifestyle notes, product reviews',
      fr: 'Xiaohongshu — notes lifestyle, avis produits',
    },
    note: {
      zh: '小红书以「种草」为核心，图文笔记是主力格式。内容偏生活化、真实感，适合房产生活分享。',
      en: 'Xiaohongshu — lifestyle notes, product reviews',
      fr: 'Xiaohongshu — notes lifestyle, avis produits',
    },
    publish_mode: 'manual',
    connected: false,
    account_label: '',
    sort_order: 4,
  },
  {
    id: 'douyin',
    name: {
      zh: '抖音',
    },
    color: '#010101',
    description: {
      zh: '抖音 — 短视频、直播带货',
      en: 'Douyin — short videos, live commerce',
      fr: 'Douyin — vidéos courtes, commerce en direct',
    },
    note: {
      zh: '抖音以短视频为核心，算法推荐分发。适合房产展示、看房vlog、生活场景内容。',
      en: 'Douyin — short videos, live commerce',
      fr: 'Douyin — vidéos courtes, commerce en direct',
    },
    publish_mode: 'manual',
    connected: false,
    account_label: '',
    sort_order: 5,
  },
  {
    id: 'tiktok',
    name: {
      zh: 'TikTok',
    },
    color: '#010101',
    description: {
      zh: 'TikTok — global short-video platform',
      en: 'TikTok — global short-video platform',
      fr: 'TikTok — plateforme mondiale de vidéos courtes',
    },
    publish_mode: 'manual',
    connected: false,
    account_label: '',
    sort_order: 6,
  },
  {
    id: 'youtube',
    name: {
      zh: 'YouTube',
    },
    color: '#FF0000',
    description: {
      zh: 'YouTube — 视频内容平台',
      en: 'YouTube — video content platform',
      fr: 'YouTube — plateforme de contenu vidéo',
    },
    publish_mode: 'manual',
    connected: false,
    account_label: '',
    sort_order: 7,
  },
  {
    id: 'twitter',
    name: {
      zh: 'X (Twitter)',
    },
    color: '#000000',
    description: {
      zh: 'X (Twitter) — 短文、图文、话题讨论',
      en: 'X (Twitter) — short posts, images, threads',
      fr: 'X (Twitter) — posts courts, images, fils',
    },
    publish_mode: 'manual',
    connected: false,
    account_label: '',
    sort_order: 8,
  },
];

export const postTypesSeed: TablesInsert<'post_types'>[] = [
  {
    platform_id: 'facebook',
    id: 'single',
    name: {
      zh: '单图',
      en: 'Single Image',
      fr: 'Image unique',
    },
    format_group: 'image',
    ratio_label: '1:1 · 4:5 · 16:9',
    sort_order: 0,
  },
  {
    platform_id: 'facebook',
    id: 'carousel',
    name: {
      zh: '轮播',
      en: 'Carousel',
      fr: 'Carrousel',
    },
    format_group: 'carousel',
    ratio_label: '1:1 · 4:5 × 2-10',
    sort_order: 1,
  },
  {
    platform_id: 'facebook',
    id: 'video',
    name: {
      zh: '视频',
      en: 'Video',
      fr: 'Vidéo',
    },
    format_group: 'video',
    ratio_label: '16:9 · 9:16 · 1:1',
    sort_order: 2,
  },
  {
    platform_id: 'facebook',
    id: 'reels',
    name: {
      zh: 'Reels短视频',
      en: 'Reels',
      fr: 'Reels',
    },
    format_group: 'short_video',
    ratio_label: '9:16 ≤ 90s',
    sort_order: 3,
  },
  {
    platform_id: 'facebook',
    id: 'stories',
    name: {
      zh: 'Stories',
      en: 'Stories',
      fr: 'Stories',
    },
    format_group: 'story',
    ratio_label: '9:16 ≤ 24h',
    sort_order: 4,
  },
  {
    platform_id: 'facebook',
    id: 'text',
    name: {
      zh: '纯文字',
      en: 'Text Post',
      fr: 'Publication texte',
    },
    format_group: 'text',
    ratio_label: '—',
    sort_order: 5,
  },
  {
    platform_id: 'instagram',
    id: 'single',
    name: {
      zh: '单图',
      en: 'Single Image',
      fr: 'Image unique',
    },
    format_group: 'image',
    ratio_label: '1:1 · 4:5',
    sort_order: 0,
  },
  {
    platform_id: 'instagram',
    id: 'carousel',
    name: {
      zh: '轮播',
      en: 'Carousel',
      fr: 'Carrousel',
    },
    format_group: 'carousel',
    ratio_label: '1:1 · 4:5 × 2-10',
    sort_order: 1,
  },
  {
    platform_id: 'instagram',
    id: 'video',
    name: {
      zh: '视频',
      en: 'Video',
      fr: 'Vidéo',
    },
    format_group: 'video',
    ratio_label: '16:9 · 4:5',
    sort_order: 2,
  },
  {
    platform_id: 'instagram',
    id: 'reels',
    name: {
      zh: 'Reels',
      en: 'Reels',
      fr: 'Reels',
    },
    format_group: 'short_video',
    ratio_label: '9:16 ≤ 90s',
    sort_order: 3,
  },
  {
    platform_id: 'instagram',
    id: 'stories',
    name: {
      zh: 'Stories',
      en: 'Stories',
      fr: 'Stories',
    },
    format_group: 'story',
    ratio_label: '9:16 ≤ 24h',
    sort_order: 4,
  },
  {
    platform_id: 'wechat_official',
    id: 'article',
    name: {
      zh: '图文消息',
      en: 'Article',
      fr: 'Article',
    },
    format_group: 'article',
    ratio_label: '封面 2.35:1',
    sort_order: 0,
  },
  {
    platform_id: 'wechat_official',
    id: 'single',
    name: {
      zh: '单图',
      en: 'Single Image',
      fr: 'Image unique',
    },
    format_group: 'image',
    ratio_label: '1:1 · 原图',
    sort_order: 1,
  },
  {
    platform_id: 'wechat_official',
    id: 'video',
    name: {
      zh: '视频',
      en: 'Video',
      fr: 'Vidéo',
    },
    format_group: 'video',
    ratio_label: '16:9 · 3:4',
    sort_order: 2,
  },
  {
    platform_id: 'wechat_channels',
    id: 'short_video',
    name: {
      zh: '短视频',
      en: 'Short Video',
      fr: 'Vidéo courte',
    },
    format_group: 'short_video',
    ratio_label: '9:16 ≤ 60min',
    sort_order: 0,
  },
  {
    platform_id: 'wechat_channels',
    id: 'live',
    name: {
      zh: '直播',
      en: 'Live Stream',
      fr: 'Direct',
    },
    format_group: 'live',
    ratio_label: '9:16',
    sort_order: 1,
  },
  {
    platform_id: 'wechat_channels',
    id: 'link_post',
    name: {
      zh: '链接图文',
      en: 'Link Post',
      fr: 'Publication lien',
    },
    format_group: 'article',
    ratio_label: '封面 2.35:1',
    sort_order: 2,
  },
  {
    platform_id: 'xiaohongshu',
    id: 'note',
    name: {
      zh: '图文笔记',
      en: 'Image Note',
      fr: 'Note image',
    },
    format_group: 'image',
    ratio_label: '3:4 · 1:1',
    sort_order: 0,
  },
  {
    platform_id: 'xiaohongshu',
    id: 'video_note',
    name: {
      zh: '视频笔记',
      en: 'Video Note',
      fr: 'Note vidéo',
    },
    format_group: 'short_video',
    ratio_label: '3:4 · 9:16',
    sort_order: 1,
  },
  {
    platform_id: 'xiaohongshu',
    id: 'carousel',
    name: {
      zh: '轮播笔记',
      en: 'Carousel Note',
      fr: 'Note carrousel',
    },
    format_group: 'carousel',
    ratio_label: '3:4 × 2-18',
    sort_order: 2,
  },
  {
    platform_id: 'douyin',
    id: 'short_video',
    name: {
      zh: '短视频',
      en: 'Short Video',
      fr: 'Vidéo courte',
    },
    format_group: 'short_video',
    ratio_label: '9:16 ≤ 15min',
    sort_order: 0,
  },
  {
    platform_id: 'douyin',
    id: 'live',
    name: {
      zh: '直播',
      en: 'Live Stream',
      fr: 'Direct',
    },
    format_group: 'live',
    ratio_label: '9:16',
    sort_order: 1,
  },
  {
    platform_id: 'douyin',
    id: 'graphic_video',
    name: {
      zh: '图文视频',
      en: 'Slideshow Video',
      fr: 'Vidéo diaporama',
    },
    format_group: 'short_video',
    ratio_label: '9:16',
    sort_order: 2,
  },
  {
    platform_id: 'tiktok',
    id: 'short_video',
    name: {
      zh: '短视频',
      en: 'Short Video',
      fr: 'Vidéo courte',
    },
    format_group: 'short_video',
    ratio_label: '9:16 ≤ 10min',
    sort_order: 0,
  },
  {
    platform_id: 'tiktok',
    id: 'photo_mode',
    name: {
      zh: '照片模式',
      en: 'Photo Mode',
      fr: 'Mode photo',
    },
    format_group: 'carousel',
    ratio_label: '1:1 · 9:16 × up to 35',
    sort_order: 1,
  },
  {
    platform_id: 'tiktok',
    id: 'live',
    name: {
      zh: '直播',
      en: 'Live Stream',
      fr: 'Direct',
    },
    format_group: 'live',
    ratio_label: '9:16',
    sort_order: 2,
  },
  {
    platform_id: 'youtube',
    id: 'video',
    name: {
      zh: '视频',
      en: 'Video',
      fr: 'Vidéo',
    },
    format_group: 'video',
    ratio_label: '16:9',
    sort_order: 0,
  },
  {
    platform_id: 'youtube',
    id: 'shorts',
    name: {
      zh: 'Shorts',
      en: 'Shorts',
      fr: 'Shorts',
    },
    format_group: 'short_video',
    ratio_label: '9:16 ≤ 60s',
    sort_order: 1,
  },
  {
    platform_id: 'youtube',
    id: 'community',
    name: {
      zh: '社区帖子',
      en: 'Community Post',
      fr: 'Publication communautaire',
    },
    format_group: 'text',
    ratio_label: '图文/投票',
    sort_order: 2,
  },
  {
    platform_id: 'twitter',
    id: 'text',
    name: {
      zh: '纯文字',
      en: 'Text Post',
      fr: 'Publication texte',
    },
    format_group: 'text',
    ratio_label: '≤ 280字符',
    sort_order: 0,
  },
  {
    platform_id: 'twitter',
    id: 'single',
    name: {
      zh: '单图',
      en: 'Single Image',
      fr: 'Image unique',
    },
    format_group: 'image',
    ratio_label: '16:9 · 1:1',
    sort_order: 1,
  },
  {
    platform_id: 'twitter',
    id: 'multi_image',
    name: {
      zh: '多图',
      en: 'Multi Image',
      fr: 'Image multiple',
    },
    format_group: 'image',
    ratio_label: '最多4张',
    sort_order: 2,
  },
  {
    platform_id: 'twitter',
    id: 'video',
    name: {
      zh: '视频',
      en: 'Video',
      fr: 'Vidéo',
    },
    format_group: 'video',
    ratio_label: '16:9 · 1:1',
    sort_order: 3,
  },
  {
    platform_id: 'twitter',
    id: 'thread',
    name: {
      zh: '长推文串',
      en: 'Thread',
      fr: 'Fil',
    },
    format_group: 'text',
    ratio_label: '多条串联',
    sort_order: 4,
  },
];

export const postTypeGroupsSeed: TablesInsert<'post_type_groups'>[] = [
  {
    id: 'image',
    name: '单图 / Single Image',
    description: {
      zh: '适用于各平台的静态图片发布',
      en: 'Static image posts across platforms',
      fr: "Publications d'images statiques",
    },
    sort_order: 0,
  },
  {
    id: 'carousel',
    name: '轮播 / Carousel',
    description: {
      zh: '多图滑动展示，适合房源多角度展示',
      en: 'Multi-image swipe, great for property showcase',
      fr: 'Diaporama multi-images',
    },
    sort_order: 1,
  },
  {
    id: 'video',
    name: '视频 / Video',
    description: {
      zh: '标准横屏或竖屏视频',
      en: 'Standard horizontal or vertical video',
      fr: 'Vidéo horizontale ou verticale',
    },
    sort_order: 2,
  },
  {
    id: 'short_video',
    name: '短视频 / Short Video',
    description: {
      zh: '竖屏短视频，适合移动端沉浸式浏览',
      en: 'Vertical short video for mobile-first feeds',
      fr: 'Vidéo courte verticale',
    },
    sort_order: 3,
  },
  {
    id: 'story',
    name: 'Stories / 限时动态',
    description: {
      zh: '24小时后消失的临时内容',
      en: 'Ephemeral content, disappears after 24h',
      fr: 'Contenu éphémère, disparaît après 24h',
    },
    sort_order: 4,
  },
  {
    id: 'live',
    name: '直播 / Live Stream',
    description: {
      zh: '实时直播，适合看房、问答',
      en: 'Real-time streaming, great for tours & Q&A',
      fr: 'Diffusion en direct',
    },
    sort_order: 5,
  },
  {
    id: 'article',
    name: '图文文章 / Article',
    description: {
      zh: '长文推送，适合深度内容',
      en: 'Long-form articles for in-depth content',
      fr: 'Articles longs pour contenu approfondi',
    },
    sort_order: 6,
  },
  {
    id: 'text',
    name: '纯文字 / Text Post',
    description: {
      zh: '文字为主的短帖',
      en: 'Text-focused short posts',
      fr: 'Publications courtes en texte',
    },
    sort_order: 7,
  },
];

export const postTypeGroupPlatformsSeed: TablesInsert<'post_type_group_platforms'>[] = [
  {
    group_id: 'image',
    platform_id: 'facebook',
  },
  {
    group_id: 'image',
    platform_id: 'instagram',
  },
  {
    group_id: 'image',
    platform_id: 'wechat_official',
  },
  {
    group_id: 'image',
    platform_id: 'xiaohongshu',
  },
  {
    group_id: 'image',
    platform_id: 'twitter',
  },
  {
    group_id: 'carousel',
    platform_id: 'facebook',
  },
  {
    group_id: 'carousel',
    platform_id: 'instagram',
  },
  {
    group_id: 'carousel',
    platform_id: 'xiaohongshu',
  },
  {
    group_id: 'carousel',
    platform_id: 'tiktok',
  },
  {
    group_id: 'video',
    platform_id: 'facebook',
  },
  {
    group_id: 'video',
    platform_id: 'instagram',
  },
  {
    group_id: 'video',
    platform_id: 'wechat_official',
  },
  {
    group_id: 'video',
    platform_id: 'youtube',
  },
  {
    group_id: 'video',
    platform_id: 'twitter',
  },
  {
    group_id: 'short_video',
    platform_id: 'facebook',
  },
  {
    group_id: 'short_video',
    platform_id: 'instagram',
  },
  {
    group_id: 'short_video',
    platform_id: 'wechat_channels',
  },
  {
    group_id: 'short_video',
    platform_id: 'xiaohongshu',
  },
  {
    group_id: 'short_video',
    platform_id: 'douyin',
  },
  {
    group_id: 'short_video',
    platform_id: 'tiktok',
  },
  {
    group_id: 'short_video',
    platform_id: 'youtube',
  },
  {
    group_id: 'story',
    platform_id: 'facebook',
  },
  {
    group_id: 'story',
    platform_id: 'instagram',
  },
  {
    group_id: 'live',
    platform_id: 'wechat_channels',
  },
  {
    group_id: 'live',
    platform_id: 'douyin',
  },
  {
    group_id: 'live',
    platform_id: 'tiktok',
  },
  {
    group_id: 'article',
    platform_id: 'wechat_official',
  },
  {
    group_id: 'article',
    platform_id: 'wechat_channels',
  },
  {
    group_id: 'text',
    platform_id: 'facebook',
  },
  {
    group_id: 'text',
    platform_id: 'twitter',
  },
  {
    group_id: 'text',
    platform_id: 'youtube',
  },
];
