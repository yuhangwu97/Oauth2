-- ============================================
-- 测试数据 SQL 脚本
-- 用于测试推荐剧目列表相关 API（微信小程序 wxApi）
-- ============================================
use bx_video;
-- 1. 插入分类数据 (bx_film_classify)
-- 注意：需要先删除可能存在的测试数据，避免重复
DELETE FROM bx_film_classify WHERE classify_name IN ('武侠', '现代', '悬疑', '古装', '都市', '玄幻', '科幻', '历史');

INSERT INTO bx_film_classify (id, classify_name, classify_describe, classify_status, sort, sys_org_code, tenant_id, del_flag, create_time, create_by) VALUES
('test_classify_001', '武侠', '武侠类短剧', '1', 1, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_classify_002', '现代', '现代都市类短剧', '1', 2, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_classify_003', '悬疑', '悬疑推理类短剧', '1', 3, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_classify_004', '古装', '古装宫廷类短剧', '1', 4, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_classify_005', '都市', '都市情感类短剧', '1', 5, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_classify_006', '玄幻', '玄幻仙侠类短剧', '1', 6, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_classify_007', '科幻', '科幻未来类短剧', '1', 7, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_classify_008', '历史', '历史传记类短剧', '1', 8, 'A03A01', 1002, 0, NOW(), 'admin');

-- 2. 插入剧目数据 (bx_film_drama) - 微信小程序使用此表
-- 注意：需要先删除可能存在的测试数据
DELETE FROM bx_film_drama WHERE drama_id LIKE 'test_drama_%';

-- 获取当前日期和未来日期（用于授权时间）
SET @today = CURDATE();
SET @yesterday = DATE_SUB(@today, INTERVAL 1 DAY);  -- 昨天，确保授权开始时间在今天之前
SET @future_date = DATE_ADD(@today, INTERVAL 30 DAY);  -- 未来30天

INSERT INTO bx_film_drama (
    id, drama_id, drama_name, drama_describe, drama_poster, 
    total_episodes, producer_name, producer_id,
    drama_status, drama_sign, drama_channel, drama_mode, unlock_mode,
    drama_classify, sort, sys_org_code, tenant_id, del_flag,
    recommendation_language, drama_auth_type, drama_auth_time_start, drama_auth_time_end,
    auditing_status, create_time, create_by
) VALUES
-- 精选剧目（用于轮播和推荐列表）
('test_drama_001', 'test_drama_001', '霸道总裁爱上我', '现代都市爱情短剧，讲述霸道总裁与普通女孩的浪漫爱情故事', 'https://picsum.photos/800/1200?random=1', 
 30, '测试制作方A', 'producer_001',
 '1', '2', '2', '1', '1',  -- 上架、精选、女生频道、付费模式、广告解锁
 'test_classify_002', 1, 'A03A01', 1002, 0,
 '年度最甜爱情剧，不容错过！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),  -- auditing_status='2' 表示审核通过

('test_drama_002', 'test_drama_002', '江湖风云录', '武侠江湖恩怨情仇，英雄豪杰的传奇故事', 'https://picsum.photos/800/1200?random=2',
 40, '测试制作方B', 'producer_002',
 '1', '2', '1', '1', '2',  -- 上架、精选、男生频道、付费模式、付费解锁
 'test_classify_001', 2, 'A03A01', 1002, 0,
 '热血武侠，快意恩仇！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

('test_drama_003', 'test_drama_003', '悬疑迷案', '烧脑悬疑推理剧，层层递进的谜题等你解开', 'https://picsum.photos/800/1200?random=3',
 25, '测试制作方C', 'producer_003',
 '1', '2', '1', '0', '1',  -- 上架、精选、男生频道、免费模式、广告解锁
 'test_classify_003', 3, 'A03A01', 1002, 0,
 '真相只有一个！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

('test_drama_004', 'test_drama_004', '古装宫廷秘史', '宫廷权谋大戏，后宫风云变幻', 'https://picsum.photos/800/1200?random=4',
 35, '测试制作方D', 'producer_004',
 '1', '2', '2', '1', '1',  -- 上架、精选、女生频道、付费模式、广告解锁
 'test_classify_004', 4, 'A03A01', 1002, 0,
 '宫斗大戏，精彩纷呈！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

('test_drama_005', 'test_drama_005', '都市白领日记', '现代都市职场剧，白领生活的酸甜苦辣', 'https://picsum.photos/800/1200?random=5',
 20, '测试制作方E', 'producer_005',
 '1', '2', '2', '0', '1',  -- 上架、精选、女生频道、免费模式、广告解锁
 'test_classify_005', 5, 'A03A01', 1002, 0,
 '真实职场，感同身受！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

('test_drama_006', 'test_drama_006', '修仙传', '玄幻修仙题材，主角逆袭成仙', 'https://picsum.photos/800/1200?random=6',
 50, '测试制作方F', 'producer_006',
 '1', '2', '1', '1', '2',  -- 上架、精选、男生频道、付费模式、付费解锁
 'test_classify_006', 6, 'A03A01', 1002, 0,
 '修仙之路，永不止步！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

('test_drama_007', 'test_drama_007', '未来战士', '科幻未来题材，人类与AI的战争', 'https://picsum.photos/800/1200?random=7',
 28, '测试制作方G', 'producer_007',
 '1', '2', '1', '1', '1',  -- 上架、精选、男生频道、付费模式、广告解锁
 'test_classify_007', 7, 'A03A01', 1002, 0,
 '未来已来，科技改变一切！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

('test_drama_008', 'test_drama_008', '历史风云', '历史传记剧，还原真实历史事件', 'https://picsum.photos/800/1200?random=8',
 32, '测试制作方H', 'producer_008',
 '1', '2', '1', '1', '2',  -- 上架、精选、男生频道、付费模式、付费解锁
 'test_classify_008', 8, 'A03A01', 1002, 0,
 '历史重现，见证传奇！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

('test_drama_009', 'test_drama_009', '甜宠小娇妻', '现代甜宠剧，高甜撒糖不停', 'https://picsum.photos/800/1200?random=9',
 24, '测试制作方I', 'producer_009',
 '1', '2', '2', '0', '1',  -- 上架、精选、女生频道、免费模式、广告解锁
 'test_classify_002', 9, 'A03A01', 1002, 0,
 '甜到齁，宠到爆！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

('test_drama_010', 'test_drama_010', '逆袭人生', '都市励志剧，小人物逆袭成功', 'https://picsum.photos/800/1200?random=10',
 36, '测试制作方J', 'producer_010',
 '1', '2', '1', '1', '1',  -- 上架、精选、男生频道、付费模式、广告解锁
 'test_classify_005', 10, 'A03A01', 1002, 0,
 '逆袭人生，从今天开始！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

-- 热门剧目（用于热门列表测试）
('test_drama_011', 'test_drama_011', '热门剧集A', '热门推荐剧集A', 'https://picsum.photos/800/1200?random=11',
 30, '测试制作方K', 'producer_011',
 '1', '1', '1', '1', '1',  -- 上架、热门、男生频道、付费模式、广告解锁
 'test_classify_001', 1, 'A03A01', 1002, 0,
 '热门推荐！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin'),

('test_drama_012', 'test_drama_012', '热门剧集B', '热门推荐剧集B', 'https://picsum.photos/800/1200?random=12',
 30, '测试制作方L', 'producer_012',
 '1', '1', '2', '1', '1',  -- 上架、热门、女生频道、付费模式、广告解锁
 'test_classify_002', 2, 'A03A01', 1002, 0,
 '热门推荐！', '1', @yesterday, @future_date,
 '2', NOW(), 'admin');

-- 3. 插入剧集数据 (bx_film_drama_series) - 微信小程序使用此表
-- 注意：需要先删除可能存在的测试数据
DELETE FROM bx_film_drama_series WHERE film_drama_id LIKE 'test_drama_%';

-- 为每个剧目插入第一集（drama_series = 1）
INSERT INTO bx_film_drama_series (
    id, film_drama_id, foreign_key, drama_series, name,
    video_url, drama_status, sort, sys_org_code, tenant_id, del_flag,
    play_unreal, like_unreal, collect_unreal, transmit_unreal,
    create_time, create_by
) VALUES
('test_series_001', 'test_drama_001', 'test_drama_001', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 1, 1, 'A03A01', 1002, 0,
 1000, 100, 50, 20, NOW(), 'admin'),

('test_series_002', 'test_drama_002', 'test_drama_002', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 1, 1, 'A03A01', 1002, 0,
 2000, 200, 100, 40, NOW(), 'admin'),

('test_series_003', 'test_drama_003', 'test_drama_003', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 1, 1, 'A03A01', 1002, 0,
 1500, 150, 75, 30, NOW(), 'admin'),

('test_series_004', 'test_drama_004', 'test_drama_004', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 1, 1, 'A03A01', 1002, 0,
 1800, 180, 90, 35, NOW(), 'admin'),

('test_series_005', 'test_drama_005', 'test_drama_005', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 1, 1, 'A03A01', 1002, 0,
 1200, 120, 60, 25, NOW(), 'admin'),

('test_series_006', 'test_drama_006', 'test_drama_006', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 1, 1, 'A03A01', 1002, 0,
 2500, 250, 125, 50, NOW(), 'admin'),

('test_series_007', 'test_drama_007', 'test_drama_007', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 1, 1, 'A03A01', 1002, 0,
 2200, 220, 110, 45, NOW(), 'admin'),

('test_series_008', 'test_drama_008', 'test_drama_008', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 1, 1, 'A03A01', 1002, 0,
 1900, 190, 95, 38, NOW(), 'admin'),

('test_series_009', 'test_drama_009', 'test_drama_009', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', 1, 1, 'A03A01', 1002, 0,
 1600, 160, 80, 32, NOW(), 'admin'),

('test_series_010', 'test_drama_010', 'test_drama_010', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 1, 1, 'A03A01', 1002, 0,
 2100, 210, 105, 42, NOW(), 'admin'),

('test_series_011', 'test_drama_011', 'test_drama_011', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', 1, 1, 'A03A01', 1002, 0,
 3000, 300, 150, 60, NOW(), 'admin'),

('test_series_012', 'test_drama_012', 'test_drama_012', 1, '第1集',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', 1, 1, 'A03A01', 1002, 0,
 2800, 280, 140, 56, NOW(), 'admin');

-- 4. 插入剧集播放量统计数据 (bx_film_drama_series_second) - 微信小程序使用此表
-- 用于计算总播放量
-- 注意：需要先删除可能存在的测试数据
DELETE FROM bx_film_drama_series_second WHERE series_id LIKE 'test_series_%';

-- 为每个剧集插入播放量统计数据
INSERT INTO bx_film_drama_series_second (
    id, series_id, play_second, like_second, collect_second, transmit_second,
    sys_org_code, tenant_id, del_flag, create_time, create_by
) VALUES
('test_second_001', 'test_series_001', 5000, 500, 250, 100, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_002', 'test_series_002', 8000, 800, 400, 160, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_003', 'test_series_003', 6000, 600, 300, 120, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_004', 'test_series_004', 7000, 700, 350, 140, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_005', 'test_series_005', 5500, 550, 275, 110, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_006', 'test_series_006', 10000, 1000, 500, 200, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_007', 'test_series_007', 9000, 900, 450, 180, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_008', 'test_series_008', 7500, 750, 375, 150, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_009', 'test_series_009', 6500, 650, 325, 130, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_010', 'test_series_010', 8500, 850, 425, 170, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_011', 'test_series_011', 12000, 1200, 600, 240, 'A03A01', 1002, 0, NOW(), 'admin'),
('test_second_012', 'test_series_012', 11000, 1100, 550, 220, 'A03A01', 1002, 0, NOW(), 'admin');


