# 推荐剧目列表API集成文档

---

## 功能

1. **轮播列表** - 获取首页轮播展示的剧目列表（上半部分）
2. **剧集分类列表** - 获取所有可用的剧集分类，用于中间分类筛选区域
3. **分类剧集列表** - 根据分类筛选获取剧集列表，用于下半部分分类剧集展示

---

## 1. 轮播列表

### 接口说明
获取首页轮播展示的剧目列表。该接口会自动筛选：
- 仅返回上架状态的剧目（`dramaStatus = "1"`）
- 仅返回授权时间有效的剧目（授权结束时间 >= 当前日期）
- 仅返回精选标识的剧目（`dramaSign = "2"`）
- 按 `sort` 字段升序排列
- 默认返回前10条，最多返回20条

### 接口地址
```
GET /api/appApi/carouselList
```

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `sysOrgCode` | String | 否 | 部门编号（支持模糊匹配，如传入"A01"会匹配"A01"开头的所有部门） |
| `tenantId` | Integer | 否 | 租户ID |
| `dramaName` | String | 否 | 剧目名称（模糊搜索） |
| `searchValue` | String | 否 | 搜索关键词（支持推荐语、剧名、描述、制作方名称的模糊搜索） |
| `dramaClassify` | String | 否 | 剧集分类ID（支持逗号分隔多个分类，如"1,2,3"） |
| `dramaChannel` | String | 否 | 所属频道（1-男生, 2-女生） |
| `dramaMode` | String | 否 | 短剧模式（0-免费模式, 1-付费模式） |
| `unlockMode` | String | 否 | 解锁模式（1-广告解锁, 2-付费解锁） |
| `totalEpisodesStart` | Integer | 否 | 集数查询开始集 |
| `totalEpisodesEnd` | Integer | 否 | 集数查询结束集 |
| `limit` | Integer | 否 | 返回数量限制（默认10，最多20） |

### 自动设置的筛选条件

以下条件由接口自动设置，无需传入（即使传入也会被覆盖）：

| 参数名 | 值 | 说明 |
|--------|-----|------|
| `dramaStatus` | `"1"` | 仅返回上架状态的剧目 |
| `dramaAuthTimeEnd` | 当前日期 | 仅返回授权时间有效的剧目 |
| `dramaSign` | `"2"` | 仅返回精选标识的剧目 |

### 返回数据格式
```json
{
  "success": true,
  "message": "操作成功!",
  "code": 200,
  "result": [
    {
      "dramaId": "剧目ID",
      "dramaName": "剧目名称",
      "dramaDescribe": "剧集描述",
      "dramaPoster": "剧目海报URL",
      "totalEpisodes": 30,
      "producerName": "制作方名称",
      "classifyName": "分类名称",
      "videoUrl": "第一集视频URL",
      "totalPlay": "10.5万",
      "dramaStatus": "1",
      "dramaSign": "2",
      "dramaChannel": "1",
      "dramaMode": "1",
      "unlockMode": "1",
      "sort": 1,
      "sysOrgCode": "A01",
      "tenantId": 1
    }
  ],
  "timestamp": 1234567890
}
```

### 返回字段说明

#### 基础字段
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `dramaId` | String | 剧目ID |
| `dramaName` | String | 剧目名称 |
| `dramaDescribe` | String | 剧集描述 |
| `dramaPoster` | String | 剧目海报URL（用于轮播展示） |
| `totalEpisodes` | Integer | 总集数 |
| `producerName` | String | 制作方名称 |
| `classifyName` | String | 分类名称（关联查询） |
| `videoUrl` | String | 第一集视频URL（关联查询） |

#### 计算字段
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `totalPlay` | String | 总播放量（格式：超过1万显示"X.X万"，否则显示具体数字，如"12345"） |

#### 配置字段
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `dramaStatus` | String | 短剧状态（1-上架, 0-下架） |
| `dramaSign` | String | 短剧标志（1-热门, 2-精选） |
| `dramaChannel` | String | 所属频道（1-男生, 2-女生） |
| `dramaMode` | String | 短剧模式（0-免费模式, 1-付费模式） |
| `unlockMode` | String | 解锁模式（1-广告解锁, 2-付费解锁） |
| `sort` | Integer | 排序值（升序排列） |

### 排序规则
- 结果按 `sort` 字段升序排列
- 后台需要正确设置排序值来控制轮播显示顺序

### 数量限制
- 默认返回前10条记录
- 可通过 `limit` 参数调整返回数量（最多20条）
- 如果结果数量超过限制，只返回前N条

### 总播放量计算逻辑
- 查询该剧目所有剧集的播放量总和
- 如果总播放量 >= 10000，显示为"X.X万"格式（保留一位小数，四舍五入）
- 如果总播放量 < 10000，显示具体数字

### 使用建议
1. **轮播展示**：使用 `dramaPoster` 字段作为轮播图片，点击后跳转到剧目详情页
2. **排序控制**：通过后台设置 `sort` 字段来控制轮播顺序
3. **数量控制**：建议使用默认的10条，如果轮播区域较大可以设置 `limit=15` 或 `limit=20`
4. **筛选条件**：可以根据业务需求传入相应的筛选参数，如按频道筛选等

---

## 2. 剧集分类列表

### 接口说明
获取所有可用的剧集分类列表，用于首页中间的分类筛选区域（如"全部"、"武侠"、"现代"、"悬疑"等分类按钮）。

### 接口地址
```
GET /api/basicsApi/filmDlassifyList
```

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `sysOrgCode` | String | 否 | 部门编号（支持模糊匹配） |
| `tenantId` | Integer | 否 | 租户ID |
| `classifyName` | String | 否 | 分类名称（模糊搜索） |

### 自动设置的筛选条件

以下条件由接口自动设置，无需传入：

| 参数名 | 值 | 说明 |
|--------|-----|------|
| `classifyStatus` | `"1"` | 仅返回启用状态（正常显示）的分类 |

### 返回数据格式
```json
{
  "success": true,
  "message": "操作成功!",
  "code": 200,
  "result": [
    {
      "id": "分类ID",
      "classifyName": "分类名称",
      "classifyDescribe": "分类描述",
      "sort": 1,
      "sysOrgCode": "A01",
      "tenantId": 1,
      "createTime": "2024-01-01 10:00:00"
    }
  ],
  "timestamp": 1234567890
}
```

### 返回字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | String | 分类ID（用于后续筛选） |
| `classifyName` | String | 分类名称（显示文本） |
| `classifyDescribe` | String | 分类描述 |
| `sort` | Integer | 排序值（升序排列） |
| `sysOrgCode` | String | 部门编号 |
| `tenantId` | Integer | 租户ID |

### 使用建议

1. **排序显示**：结果已按 `sort` 字段排序，直接按顺序显示即可
2. **添加"全部"选项**：前端可以手动添加一个"全部"分类选项，点击时不传分类ID
3. **分类按钮样式**：当前选中的分类可以高亮显示（如黄色背景）
4. **点击分类**：点击分类时，使用分类的 `id` 作为 `dramaClassify` 参数调用剧集列表接口

---

## 3. 分类剧集列表（支持分页）

### 接口说明
根据分类筛选获取剧集列表，支持分页。用于首页下半部分的分类剧集展示区域。该接口支持：
- 按分类筛选（`dramaClassify` 参数）
- 自动过滤授权时间有效的剧目
- 自动过滤上架状态的剧目（如果使用 `filmDramaList`）

### 接口地址
```
GET /api/appApi/filmDramaList
```

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `pageNo` | Integer | 是 | 页码，从1开始 |
| `pageSize` | Integer | 是 | 每页数量 |
| `sysOrgCode` | String | 是 | 部门编号 |
| `memberId` | String | 否 | 会员ID（如果提供会自动保存搜索历史） |
| `dramaClassify` | String | 否 | 剧集分类ID（单个分类ID，如"1"） |
| `dramaName` | String | 否 | 剧集名称（模糊搜索） |
| `searchValue` | String | 否 | 搜索关键词（支持剧名、简介、推荐语、制片人名称模糊搜索） |
| `specification` | String | 否 | 规格（如：横屏/竖屏） |

### 自动设置的筛选条件

以下条件由接口自动设置：

| 参数名 | 值 | 说明 |
|--------|-----|------|
| `dramaAuthTimeEnd` | 当前日期 | 仅返回授权时间有效的剧目 |
| `dramaStatus` | `"1"` | 仅返回上架状态的剧目（在SQL中硬编码） |

### 返回数据格式
```json
{
  "success": true,
  "message": "操作成功!",
  "code": 200,
  "result": {
    "records": [
      {
        "dramaId": "剧目ID",
        "dramaName": "剧目名称",
        "dramaDescribe": "剧集描述",
        "dramaPoster": "剧目海报URL",
        "totalEpisodes": 30,
        "producerName": "制作方名称",
        "classifyName": "分类名称",
        "videoUrl": "第一集视频URL",
        "dramaStatus": "1",
        "sysOrgCode": "A01",
        "tenantId": 1
      }
    ],
    "total": 100,
    "size": 20,
    "current": 1,
    "pages": 5
  },
  "timestamp": 1234567890
}
```

### 返回字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `records` | Array | 剧集列表数据 |
| `total` | Integer | 总记录数 |
| `size` | Integer | 每页数量 |
| `current` | Integer | 当前页码 |
| `pages` | Integer | 总页数 |

### 使用建议

1. **分页处理**：使用 `pageNo` 和 `pageSize` 进行分页，建议每页显示10-20条数据
2. **分类筛选**：点击分类按钮时，传入对应的分类ID作为 `dramaClassify` 参数
3. **"全部"选项**：当选择"全部"时，不传 `dramaClassify` 参数
4. **加载更多**：可以实现上拉加载更多功能，递增 `pageNo` 参数
5. **搜索历史**：如果用户已登录，建议传递 `memberId` 参数，这样搜索记录会自动保存

---

## 相关接口

- **轮播列表**：`GET /api/appApi/carouselList`（`dramaSign = "2"`，默认返回10条，最多20条）
- **剧目列表查询**：`GET /api/appApi/filmDramaList`（支持分页，支持分类筛选）
- **分类列表查询**：`GET /api/basicsApi/filmDlassifyList`（获取所有分类）

---

## 功能对照表

根据首页设计图，各功能对应的API接口如下：

| 页面区域 | 功能描述 | 对应接口 | 说明 |
|---------|---------|---------|------|
| 上半部分 | 视频轮播 | `GET /api/appApi/carouselList` | 返回精选剧目，默认10条，按sort排序 |
| 中间部分 | 分类筛选（全部、武侠、现代、悬疑等） | `GET /api/basicsApi/filmDlassifyList` | 获取所有分类列表 |
| 下半部分 | 分类剧集列表 | `GET /api/appApi/filmDramaList` | 支持分页和分类筛选 |

### 首页功能实现流程

1. **加载轮播数据**：调用 `carouselList` 接口获取轮播剧目列表
2. **加载分类列表**：调用 `filmDlassifyList` 接口获取所有分类，前端添加"全部"选项
3. **加载剧集列表**：调用 `filmDramaList` 接口，默认不传分类ID（显示全部），支持分页加载
4. **分类切换**：点击分类按钮时，调用 `filmDramaList` 接口并传入对应的 `dramaClassify` 参数
