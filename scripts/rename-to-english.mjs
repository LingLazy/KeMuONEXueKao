/**
 * 重命名脚本：将 assets/images/ 下的纯数字命名图片改为英文描述性名称
 *
 * 功能：
 * 1. 读取 scripts/rename-map.json 获取"数字编号 → 中文描述"映射
 * 2. 使用内置的中英翻译映射表，将中文描述转为英文基础名（kebab-case）
 * 3. 处理重名冲突（相同英文基础名追加 -2、-3 后缀）
 * 4. 物理重命名 assets/images/ 下的文件
 * 5. 更新 src/data/questions.json 中所有 image 字段
 * 6. 检查并清理无效图片引用（引用了不存在文件的字段置为空字符串）
 *
 * 脚本幂等：重复执行不会报错，已重命名的文件自动跳过
 *
 * 用法：node scripts/rename-to-english.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* =========================================================================
 * 中文描述 → 英文基础名映射表（kebab-case，全小写 + 连字符）
 * 覆盖全部 506 个唯一中文描述
 * ========================================================================= */
const CN_TO_EN = {
  /* --- 场景题（1-39） --- */
  场景1: 'scene-1', 场景2: 'scene-2', 场景3: 'scene-3', 场景4: 'scene-4',
  场景5: 'scene-5', 场景6: 'scene-6', 场景7: 'scene-7', 场景8: 'scene-8',
  场景9: 'scene-9', 场景10: 'scene-10', 场景11: 'scene-11', 场景12: 'scene-12',
  场景13: 'scene-13', 场景14: 'scene-14', 场景15: 'scene-15', 场景16: 'scene-16',
  场景17: 'scene-17', 场景18: 'scene-18', 场景19: 'scene-19', 场景20: 'scene-20',
  场景21: 'scene-21', 场景22: 'scene-22', 场景23: 'scene-23', 场景24: 'scene-24',
  场景25: 'scene-25', 场景26: 'scene-26', 场景27: 'scene-27', 场景28: 'scene-28',
  场景29: 'scene-29', 场景30: 'scene-30', 场景31: 'scene-31', 场景32: 'scene-32',
  场景33: 'scene-33', 场景34: 'scene-34', 场景35: 'scene-35', 场景36: 'scene-36',
  场景37: 'scene-37', 场景38: 'scene-38', 场景39: 'scene-39',

  /* --- 色觉测试（1-20） --- */
  色觉测试1: 'color-test-1', 色觉测试2: 'color-test-2', 色觉测试3: 'color-test-3',
  色觉测试4: 'color-test-4', 色觉测试5: 'color-test-5', 色觉测试6: 'color-test-6',
  色觉测试7: 'color-test-7', 色觉测试8: 'color-test-8', 色觉测试9: 'color-test-9',
  色觉测试10: 'color-test-10', 色觉测试11: 'color-test-11', 色觉测试12: 'color-test-12',
  色觉测试13: 'color-test-13', 色觉测试14: 'color-test-14', 色觉测试15: 'color-test-15',
  色觉测试16: 'color-test-16', 色觉测试17: 'color-test-17', 色觉测试18: 'color-test-18',
  色觉测试19: 'color-test-19', 色觉测试20: 'color-test-20',

  /* --- 禁止类标志 --- */
  停车让行: 'stop-and-yield',
  减速让行: 'yield',
  会车让行: 'yield-to-oncoming',
  会车先行: 'oncoming-priority',
  禁止通行: 'no-thoroughfare',
  禁止驶入: 'no-entry',
  禁止机动车驶入: 'no-motor-vehicles',
  禁止载货汽车驶入: 'no-trucks',
  禁止电动三轮车驶入: 'no-electric-tricycles',
  禁止大型客车驶入: 'no-large-buses',
  禁止小型客车驶入: 'no-small-buses',
  禁止小客车向右转弯: 'no-small-cars-right-turn',
  禁止载货汽车左转: 'no-trucks-left-turn',
  禁止二轮摩托车驶入: 'no-motorcycles',
  禁止三轮机动车通行: 'no-three-wheel-motor-vehicles',
  禁止畜力车进入: 'no-animal-drawn-carts',
  禁止非机动车进入: 'no-non-motor-vehicles',
  禁止人力车进入: 'no-handcarts',
  禁止人力货运三轮车进入: 'no-freight-tricycles',
  禁止人力客运三轮车进入: 'no-passenger-tricycles',
  禁止某两种车驶入: 'no-certain-vehicles',
  禁止运输危险物品车辆驶入: 'no-hazardous-materials-vehicles',
  禁止行人进入: 'no-pedestrians',
  禁止掉头: 'no-u-turn',
  禁止掉头标记: 'no-u-turn-marking',
  禁止直行: 'no-straight',
  禁止直行和向右转弯: 'no-straight-or-right-turn',
  禁止直行和向左转弯: 'no-straight-or-left-turn',
  禁止向左转弯: 'no-left-turn',
  禁止向右转弯: 'no-right-turn',
  禁止向左向右转弯: 'no-left-or-right-turn',
  禁止转弯标记: 'no-turn-marking',
  禁止超车: 'no-overtaking',
  禁止鸣喇叭: 'no-horn',
  禁止车辆临时或长时停放: 'no-stopping-or-parking',
  禁止车辆长时停车: 'no-parking',
  禁止路边临时或长时停放车辆线: 'no-roadside-stopping-or-parking-line',
  禁止路边长时停放车辆线: 'no-roadside-parking-line',
  禁止拖拉机驶入: 'no-tractors',
  解除禁止超车: 'end-of-no-overtaking',
  解除限制速度: 'end-of-speed-limit',
  限制速度: 'speed-limit',
  限制高度: 'height-limit',
  限制宽度: 'width-limit',
  限制质量: 'weight-limit',
  限制轴重: 'axle-weight-limit',
  最低限速: 'minimum-speed',
  区域禁止停车: 'zone-no-parking',
  区域禁止停车解除: 'end-of-zone-no-parking',
  区域禁止长时停车: 'zone-no-long-parking',
  区域禁止长时停车解除: 'end-of-zone-no-long-parking',
  区域限制速度: 'zone-speed-limit',
  区域限制速度解除: 'end-of-zone-speed-limit',

  /* --- 警告类标志 --- */
  注意危险: 'hazard-ahead',
  注意行人: 'pedestrian-ahead',
  注意儿童: 'children-ahead',
  注意牲畜: 'livestock-ahead',
  注意野生动物: 'wild-animals-ahead',
  注意非机动车: 'non-motor-vehicles-ahead',
  注意残疾人: 'disabled-ahead',
  注意信号灯: 'traffic-signals-ahead',
  注意落石: 'falling-rocks',
  注意横风: 'crosswinds',
  注意雾天: 'foggy-weather',
  注意不利气象条件: 'adverse-weather',
  '注意雨（雪）天': 'rain-or-snow',
  注意路面结冰: 'icy-road',
  注意潮汐车道: 'tidal-lane-ahead',
  注意合流: 'merging-traffic',
  注意保持车距: 'keep-distance',
  注意前方车辆排队: 'queue-ahead',
  注意前方路面状况标记: 'road-condition-ahead-marking',
  右侧绕行: 'detour-right',
  左侧绕行: 'detour-left',
  左右绕行: 'detour-both-sides',
  绕行标志: 'detour-sign',
  施工: 'construction',
  道路施工: 'road-construction',
  道路封闭: 'road-closed',
  // 前方距离类标志（含数字单位）
  '前方1km道路封闭': 'road-closed-1km-ahead',
  '前方300m道路封闭': 'road-closed-300m-ahead',
  '前方1km道路施工': 'road-construction-1km-ahead',
  '前方300m道路施工': 'road-construction-300m-ahead',
  '前方1km右道封闭': 'right-lane-closed-1km-ahead',
  '前方300m右道封闭': 'right-lane-closed-300m-ahead',
  '前方1km左道封闭': 'left-lane-closed-1km-ahead',
  '前方300m左道封闭': 'left-lane-closed-300m-ahead',
  '前方1km中间封闭': 'center-closed-1km-ahead',
  '前方300m中间封闭': 'center-closed-300m-ahead',
  右道封闭: 'right-lane-closed',
  左道封闭: 'left-lane-closed',
  中间封闭: 'center-closed',
  向右改道: 'detour-right-route',
  向左改道: 'detour-left-route',
  施工路栏: 'construction-barrier',
  移动性施工标志: 'mobile-construction-sign',
  事故: 'accident',
  事故易发路段: 'accident-prone-section',
  易滑: 'slippery-road',
  傍山险路: 'winding-mountain-road',
  堤坝路: 'dam-road',
  渡口: 'ferry',
  隧道: 'tunnel',
  隧道开车灯: 'tunnel-lights-on',
  隧道出口距离预告: 'tunnel-exit-distance',
  窄桥: 'narrow-bridge',
  两侧变窄: 'narrowing-both-sides',
  右侧变窄: 'narrowing-right',
  左侧变窄: 'narrowing-left',
  双向交通: 'two-way-traffic',
  上陡坡: 'steep-ascent',
  下陡坡: 'steep-descent',
  连续下坡: 'continuous-descent',
  反向弯路: 'reverse-curve',
  连续弯路: 'continuous-curves',
  向左急弯路: 'sharp-left-curve',
  向右急转弯: 'sharp-right-turn',
  向左急转弯: 'sharp-left-turn',
  急弯减速慢行标志: 'sharp-curve-slow-down',
  急弯下坡减速慢行标志: 'sharp-curve-descent-slow-down',
  T形交叉: 't-intersection',
  T形交叉口导流线设置示例: 't-intersection-channelization-example',
  Y形交叉: 'y-intersection',
  Y形交叉路口: 'y-junction',
  丁字平面交叉: 't-junction',
  丁字交叉路口: 't-junction-intersection',
  十字平面交叉: 'cross-intersection',
  十字交叉: 'crossroads',
  十字交叉路口: 'crossroad-intersection',
  十字交叉口导流线设置示例: 'cross-intersection-channelization-example',
  环形交叉: 'roundabout-intersection',
  环形交叉路口: 'roundabout-junction',
  环岛行驶: 'roundabout-driving',
  互通式立体交叉: 'interchange',
  铁路平交道口标线: 'railway-crossing-marking',
  无人看守铁路道口: 'railway-crossing-unmanned',
  有人看守铁路道口: 'railway-crossing-manned',
  道口标柱: 'crossing-marker',
  路面不平: 'uneven-road',
  路面低洼: 'road-dip',
  路面高突: 'road-bump',
  过水路面: 'water-on-road',
  塌方: 'landslide',
  驼峰桥: 'hump-bridge',
  车辆慢行: 'vehicles-slow-down',
  慢行: 'slow-down',
  错车道: 'passing-place',
  避险车道: 'emergency-escape-ramp',
  爬坡车道: 'climbing-lane',
  紧急停车带: 'emergency-parking-strip',
  村庄: 'village',
  学校: 'school',

  /* --- 指示类标志 --- */
  直行: 'straight-only',
  指示直行: 'go-straight',
  向左转弯: 'turn-left',
  向右转弯: 'turn-right',
  向左和向右转弯: 'turn-left-or-right',
  向左行驶: 'keep-left',
  向右行驶: 'keep-right',
  直行和向右转弯: 'straight-or-right-turn',
  直行和向左转弯: 'straight-or-left-turn',
  直行和右转合用车道: 'straight-or-right-turn-lane',
  直行和左转合用车道: 'straight-or-left-turn-lane',
  靠左侧道路行驶: 'drive-on-left',
  靠右侧道路行驶: 'drive-on-right',
  允许掉头: 'u-turn-permitted',
  立体交叉直行和右转弯行驶: 'interchange-straight-or-right',
  立体交叉直行和左转弯行驶: 'interchange-straight-or-left',
  提示前方道路有右弯或需向右合流: 'right-curve-or-merge-right',
  提示前方道路有左弯或需向左合流: 'left-curve-or-merge-left',
  指示前方右转: 'turn-right-ahead',
  指示前方左转: 'turn-left-ahead',
  指示前方掉头: 'u-turn-ahead',
  指示前方可直行或掉头: 'straight-or-u-turn-ahead',
  指示前方可直行或右转: 'straight-or-right-turn-ahead',
  指示前方可直行或左转: 'straight-or-left-turn-ahead',
  指示前方可左转或掉头: 'left-turn-or-u-turn-ahead',
  指示前方道路仅可左右转弯: 'left-or-right-turn-only-ahead',
  机动车行驶: 'motor-vehicle-driving',
  非机动车行驶: 'non-motor-vehicle-driving',
  步行: 'walking',
  徒步: 'hiking',
  人行地下通道: 'pedestrian-underpass',
  人行天桥: 'pedestrian-bridge',
  人行横道: 'pedestrian-crossing',
  两侧通行: 'traffic-both-sides',
  右侧通行: 'traffic-right',
  左侧通行: 'traffic-left',
  鸣喇叭: 'sound-horn',
  路口优先通行: 'intersection-priority',
  校车停靠点: 'school-bus-stop',
  校车停靠站点: 'school-bus-station',
  机动车车道: 'motor-vehicle-lane',
  非机动车车道: 'non-motor-vehicle-lane',
  公交线路专用车道: 'bus-lane',
  快速公交系统专用车道: 'brt-lane',
  多乘员车辆专用车道: 'hov-lane',
  大型车专用车道线: 'large-vehicle-lane-marking',
  大型车靠右: 'large-vehicles-keep-right',
  小型车专用车道线: 'small-vehicle-lane-marking',
  掉头车道: 'u-turn-lane',
  掉头和左转合用车道: 'u-turn-or-left-turn-lane',
  直行车道: 'straight-lane',
  右转车道: 'right-turn-lane',
  左转车道: 'left-turn-lane',
  '应急避难设施( 场所)': 'emergency-shelter',
  系安全带标志: 'fasten-seat-belt-sign',
  严禁酒后驾车标志: 'no-drunk-driving-sign',
  严禁乱扔弃物标志: 'no-littering-sign',
  驾驶时禁用手机标志: 'no-phone-while-driving-sign',
  货车: 'truck',
  '货车、拖拉机': 'truck-tractor',
  机动车: 'motor-vehicle',

  /* --- 交通信号/手势 --- */
  停止信号: 'stop-signal',
  直行信号: 'straight-signal',
  左转弯信号: 'left-turn-signal',
  右转弯信号: 'right-turn-signal',
  左转弯待转信号: 'left-turn-wait-signal',
  减速慢行信号: 'slow-down-signal',
  示意车辆靠边停车信号: 'pull-over-signal',
  变道信号: 'lane-change-signal',

  /* --- 指路标志 --- */
  入口预告: 'entrance-preview',
  出口编号标志: 'exit-number-sign',
  下一出口预告: 'next-exit-preview',
  右侧出口预告: 'right-exit-preview',
  左侧出口预告: 'left-exit-preview',
  终点预告: 'destination-preview',
  终点提示标志: 'destination-hint-sign',
  地点距离: 'place-distance',
  地名标志: 'place-name-sign',
  著名地点标志: 'famous-place-sign',
  路名标志: 'road-name-sign',
  路名牌: 'road-name-plate',
  街道名称: 'street-name',
  行政区划分界: 'administrative-boundary',
  道路管理分界: 'road-management-boundary',
  编号标志: 'number-sign',
  命名编号标志: 'named-number-sign',
  国道编号: 'national-highway-number',
  省道编号: 'provincial-highway-number',
  县道编号: 'county-road-number',
  乡道编号: 'township-road-number',
  驾驶考试路线: 'driving-test-route',
  教练车行驶路线: 'training-vehicle-route',
  行驶方向标志: 'direction-sign',
  设置在指路标志版面外的方向: 'direction-outside-guide-sign',
  设置在指路标志版面中的方向: 'direction-in-guide-sign',
  分岔处: 'fork',
  城市区域多个出口时的地点距离: 'urban-multi-exit-distance',
  出口标志及出口地点方向: 'exit-sign-and-direction',
  大交通量的四车道以上公路交叉路口预告: 'high-volume-highway-intersection-preview',
  四车道及以上公路交叉路口预告: 'four-lane-highway-intersection-preview',
  两条高速公路共线时入口预告: 'two-expressways-shared-entrance-preview',
  无统一编号的高速公路或城市快速路起点: 'unnumbered-expressway-start',
  无统一编号的高速公路或城市快速路终点: 'unnumbered-expressway-end',
  无统一编号的高速公路或城市快速路终点预告: 'unnumbered-expressway-end-preview',
  无统一编号高速公路或城市快速路入口预告: 'unnumbered-expressway-entrance-preview',
  '国家高速公路、省级高速公路终点': 'national-provincial-expressway-end',
  高速公路起点: 'expressway-start',
  无统一编号的高速公路或城市快速路里程牌: 'unnumbered-expressway-milestone',
  交通监控设备: 'traffic-monitoring-device',

  /* --- 服务/旅游设施 --- */
  服务区预告: 'service-area-preview',
  休息区: 'rest-area',
  停车场: 'parking',
  '停车场(区)': 'parking-zone',
  停车场预告: 'parking-preview',
  停车区预告: 'parking-zone-preview',
  停车位: 'parking-space',
  紧急电话: 'emergency-phone',
  救援电话: 'rescue-phone',
  电话位置指示: 'phone-location-sign',
  加油站: 'gas-station',
  问讯处: 'information',
  观景台: 'viewing-platform',
  索道: 'cableway',
  野营地: 'campground',
  营火: 'campfire',
  滑雪: 'skiing',
  滑冰: 'ice-skating',
  划船: 'boating',
  游泳: 'swimming',
  钓鱼: 'fishing',
  骑马: 'horseback-riding',
  潜水: 'diving',
  高尔夫球: 'golf',
  游戏场: 'playground',
  冬季游览区: 'winter-resort',
  旅游区方向: 'tourist-area-direction',
  旅游区距离: 'tourist-area-distance',
  私人专属: 'private-only',
  此路不通: 'dead-end',

  /* --- 收费站 --- */
  计重收费: 'weigh-station',
  停车检查: 'stop-for-inspection',
  停车领卡: 'stop-for-ticket',
  'ETC 车道指示': 'etc-lane-indicator',
  超限超载检测站: 'overload-inspection-station',
  海关: 'customs',

  /* --- 标线 --- */
  停止线: 'stop-line',
  停车让行线: 'stop-and-yield-line',
  减速让行线: 'yield-line',
  路口导向线: 'intersection-guide-line',
  导向车道线: 'directional-lane-line',
  可跨越同向车行道分界线: 'crossable-same-direction-lane-line',
  可跨越对向车行道分界线: 'crossable-opposite-direction-lane-line',
  禁止跨越同向车行道分界线: 'uncrossable-same-direction-lane-line',
  双黄实线禁止跨越对向车行道分界线: 'double-yellow-solid-uncrossable-line',
  黄色单实线禁止跨越对向车行道分界线: 'yellow-solid-uncrossable-line',
  黄色虚实线禁止跨越对向车行道分界线: 'yellow-dashed-solid-uncrossable-line',
  车行道边缘白色实线: 'road-edge-white-solid-line',
  车行道边缘白色虚线: 'road-edge-white-dashed-line',
  车行道边缘白色虚实线: 'road-edge-white-solid-dashed-line',
  黄色单实线车行道边缘线: 'yellow-solid-road-edge-line',
  左弯待转区线: 'left-turn-waiting-area-line',
  路面限速标记字符: 'road-speed-limit-char-marking',
  网状线: 'grid-line',
  简化网状线: 'simplified-grid-line',
  车行道横向减速标线: 'transverse-speed-reduction-marking',
  车行道纵向减速标线: 'longitudinal-speed-reduction-marking',
  车行道纵向减速标线渐变段: 'longitudinal-speed-reduction-taper',
  减速丘标线: 'speed-hump-marking',
  立面标记: 'facade-marking',
  突起路标与标线配合设置示例: 'raised-marker-with-marking-example',
  突起路标组成的单实线示例: 'raised-marker-single-solid-line-example',
  突起路标组成的双实线示例: 'raised-marker-double-solid-line-example',
  突起路标组成的虚线标线示例: 'raised-marker-dashed-line-example',
  收费岛地面标线: 'toll-island-road-marking',
  收费广场减速标线: 'toll-plaza-speed-reduction-marking',
  港湾式停靠站标线: 'bus-bay-marking',
  车种专用港湾式停靠站标线: 'vehicle-specific-bus-bay-marking',
  出口标线设置示例: 'exit-marking-example',
  入口标线设置示例: 'entrance-marking-example',
  接近车行道中障碍物标线设置示例: 'approach-obstacle-marking-example',
  接近实体中央分隔带标线设置示例: 'approach-solid-median-marking-example',
  双向两车行道道路接近道路中心障碍物标线设置示例: 'two-way-two-lane-approach-center-obstacle-example',
  双向四车行道道路接近道路中心障碍物标线设置示例: 'two-way-four-lane-approach-center-obstacle-example',
  平面环形交叉口导流线设置示例: 'roundabout-channelization-example',
  出口匝道突起路标布设示例: 'exit-ramp-raised-marker-example',
  曲线段轮廓标设置间隔示例: 'curve-outline-marker-spacing-example',
  基本单元组合使用: 'basic-unit-combination',
  线形诱导标基本单元: 'alignment-guide-basic-unit',
  人行横道预告标识线: 'pedestrian-crossing-preview-marking',
  行人左右分道的人行横道线: 'pedestrian-separating-crossing-marking',
  与道路中心线垂直的人行横道线: 'perpendicular-centerline-crossing-marking',
  与道路中心线斜交的人行横道线: 'oblique-centerline-crossing-marking',
  平行式停车位标线: 'parallel-parking-marking',
  倾斜式停车位标线: 'angled-parking-marking',
  垂直式停车位标线: 'perpendicular-parking-marking',
  平行式机动车限时停车位标线: 'parallel-time-limited-parking-marking',
  倾斜式机动车限时停车位标线: 'angled-time-limited-parking-marking',
  垂直式机动车限时停车位标线: 'perpendicular-time-limited-parking-marking',
  固定停车方向停车位标线: 'fixed-direction-parking-marking',
  中心圈: 'center-circle',
  潮汐车道线: 'tidal-lane-line',
  锥形交通标: 'conical-traffic-marker',
  三车行道变为双车行道渐变段标线设置示例: 'three-to-two-lane-taper-example',
  三车行道道路填充线渐变段标线设置示例: 'three-lane-fill-line-taper-example',
  四车行道变为三车行道渐变段标线设置示例: 'four-to-three-lane-taper-example',
  四车行道变为双车行道渐变段标线设置示例: 'four-to-two-lane-taper-example',
  两车行道变为四车行道填充线渐变段标线设置示例: 'two-to-four-lane-fill-line-taper-example',
  车道数变少: 'lanes-decrease',
  车道数增加: 'lanes-increase',

  /* --- 车距确认线 --- */
  白色半圆状车距确认线: 'white-semicircle-distance-confirmation-line',
  白色折线车距确认线: 'white-polyline-distance-confirmation-line',
  车距确认: 'distance-confirmation',

  /* --- 里程碑/百米牌 --- */
  里程碑: 'milestone',
  里程牌: 'mileage-sign',
  百米牌: 'hundred-meter-marker',
  百米桩: 'hundred-meter-post',
  公路界碑: 'highway-boundary-marker',

  /* --- 施工设施布设例 --- */
  改道施工时设施布设例: 'detour-construction-facility-example',
  高速公路出口减速车道施工时的设施布设例: 'expressway-exit-deceleration-lane-construction-example',
  高速公路出口三角地带附近施工时的设施布设例: 'expressway-exit-triangle-zone-construction-example',
  高速公路入口加速车道边缘施工时的设施布设例: 'expressway-entrance-acceleration-lane-edge-construction-example',
  高速公路入口加速车道施工时的设施布设例: 'expressway-entrance-acceleration-lane-construction-example',
  '高速公路一侧施工，利用中央分隔带紧急开口绕行时的设施布设例': 'expressway-one-side-construction-median-crossover-example',
  '市区道路交叉口，有一侧路面施工时的设施布设例': 'urban-intersection-one-side-construction-example',
  市区道路交叉口中心线附近施工时的设施布设例: 'urban-intersection-centerline-construction-example',
  市区道路两侧施工只能单向行驶时的设施布设例: 'urban-road-both-sides-one-way-construction-example',
  视距不良双车道路面局部施工时设施布设例: 'poor-sight-distance-two-lane-local-construction-example',
  双车道路面局部施工时设施布设例: 'two-lane-local-construction-example',
  四车道以上道路一侧路面施工时设施布设例: 'four-lane-one-side-construction-example',
  同向车道中有两条车道以上路面施工时设施布设例: 'same-direction-two-or-more-lane-construction-example',
  同向车道中有一条车道路面施工时设施布设例: 'same-direction-one-lane-construction-example',

  /* --- 指示灯 --- */
  制动器指示灯: 'brake-indicator',
  ABS指示灯: 'abs-indicator',
  EPC指示灯: 'epc-indicator',
  ESP开关: 'esp-switch',
  TCS指示灯: 'tcs-indicator',
  VSC指示灯: 'vsc-indicator',
  O_D挡指示灯: 'od-gear-indicator',
  电瓶指示灯: 'battery-indicator',
  机油指示灯: 'oil-indicator',
  水温指示灯: 'coolant-temp-indicator',
  燃油指示灯: 'fuel-indicator',
  清洗液指示灯: 'washer-fluid-indicator',
  安全带指示灯: 'seat-belt-indicator',
  车门指示灯: 'door-indicator',
  气囊指示灯: 'airbag-indicator',
  示宽指示灯: 'width-indicator',
  远光指示灯: 'high-beam-indicator',
  转向灯指示灯: 'turn-signal-indicator',
  雾灯指示灯: 'fog-light-indicator',
  内循环指示灯: 'recirculation-indicator',
  刹车盘指示灯: 'brake-disc-indicator',
  发动机自检灯: 'engine-check-indicator',

  /* --- 按键/开关 --- */
  油箱开启键: 'fuel-cap-key',
  倒车雷达键: 'parking-radar-key',
  前大灯清洗键: 'headlight-washer-key',
  中控锁键: 'central-lock-key',
  后遮阳帘键: 'rear-sunshade-key',

  /* --- 其他/方向距离标志 --- */
  距离某地200m: 'distance-200m',
  向前200m: 'forward-200m',
  向左100m: 'left-100m',
  向右100m: 'right-100m',
  '向左、向右各50m': 'left-right-50m',
  时间范围: 'time-range',
  某区域内: 'within-area',
  组合辅助: 'combination-auxiliary',
  叉形符号: 'fork-symbol',
  特殊天气建议速度: 'special-weather-advisory-speed',
  建议速度: 'advisory-speed',
  道路交通信息: 'traffic-information',
  除公共汽车外: 'except-buses',
};

/* =========================================================================
 * 特殊符号描述的补充映射
 * 部分中文描述含特殊符号（顿号、括号等），单独处理
 * ========================================================================= */
const CN_TO_EN_SPECIAL = {
  '禁止汽车拖、挂车通行': 'no-trailers',
  '单行路(向左或向右)': 'one-way-left-or-right',
  '单行路(直行)': 'one-way-straight',
  '地点识别标志-飞机场': 'airport-sign',
  '地点识别标志-急救站': 'first-aid-station-sign',
  '地点识别标志-多个重要场所': 'multiple-places-sign',
  '带编号标识的地点、方向': 'place-direction-with-number',
  '不带编号标识的地点、方向': 'place-direction-without-number',
  '箭头杆上标识公路编号、道路名称的公路交叉路口预告': 'highway-intersection-preview-with-road-number',
  '不设电子不停车收费(ETC) 车道的收费站预告': 'toll-station-no-etc-preview',
  '不设电子不停车收费(ETC) 车道的收费站预告及收费站': 'toll-station-no-etc-preview-and-station',
  '设有电子不停车收费(ETC) 车道的收费站预告': 'toll-station-with-etc-preview',
  '设有电子不停车收费(ETC) 车道的收费站预告及收费站': 'toll-station-with-etc-preview-and-station',
  '出租车专用待客停车位标线': 'taxi-stand-marking',
  '出租车专用上下客停车位标线': 'taxi-pickup-dropoff-marking',
  '公交专用车道线': 'bus-lane-marking',
  '快速公交专用车道线': 'brt-lane-marking',
  '多乘员车辆专用车道线': 'hov-lane-marking',
  '非机动车专用车道线': 'non-motor-vehicle-lane-marking',
  '残疾人专用停车位标线': 'disabled-parking-marking',
  '残疾人专用停车位路面标记': 'disabled-parking-road-marking',
  '残疾人专用设施': 'disabled-facility',
  '非机动车道路面标记': 'non-motor-vehicle-road-marking',
  '非机动车停车位标线': 'non-motor-vehicle-parking-marking',
  '非机动车禁驶区标线': 'non-motor-vehicle-restricted-area-marking',
};

/* =========================================================================
 * 合并翻译表：先查特殊符号表，再查主表
 * ========================================================================= */
function translateDesc(desc) {
  if (CN_TO_EN_SPECIAL[desc]) return CN_TO_EN_SPECIAL[desc];
  if (CN_TO_EN[desc]) return CN_TO_EN[desc];
  return null;
}

/** 导出翻译表供其他脚本复用（如 rename-categories.mjs） */
export { CN_TO_EN, CN_TO_EN_SPECIAL, translateDesc };

/* =========================================================================
 * 主流程
 * ========================================================================= */
function main() {
  console.log('=== 图片英文重命名脚本启动 ===\n');

  // 1. 读取 rename-map.json
  const renameMapPath = path.join(__dirname, 'rename-map.json');
  const renameMap = JSON.parse(fs.readFileSync(renameMapPath, 'utf8'));
  const mapKeys = Object.keys(renameMap);
  console.log(`[1] 读取 rename-map.json: ${mapKeys.length} 个条目`);

  // 2. 校验翻译表覆盖所有唯一描述
  const allDescs = new Set(mapKeys.map(k => renameMap[k].desc));
  const missing = [];
  for (const desc of allDescs) {
    if (!translateDesc(desc)) missing.push(desc);
  }
  if (missing.length > 0) {
    console.error(`\n[ERROR] 以下 ${missing.length} 个中文描述缺少英文翻译:`);
    missing.forEach(d => console.error(`  - ${d}`));
    process.exit(1);
  }
  console.log(`[2] 翻译表校验通过: ${allDescs.size} 个唯一描述全部覆盖`);

  // 3. 构建旧文件名 → 新文件名映射，处理重名冲突
  //    按数字大小排序，确保重名后缀稳定可复现
  const sortedKeys = mapKeys.sort((a, b) => parseInt(a) - parseInt(b));
  const oldToNew = {};
  const usedEnglishCount = {}; // 记录每个英文基础名已分配次数

  for (const oldFile of sortedKeys) {
    const desc = renameMap[oldFile].desc;
    const base = translateDesc(desc);
    const count = (usedEnglishCount[base] || 0) + 1;
    usedEnglishCount[base] = count;
    // 第一次使用不加后缀，后续追加 -2、-3
    oldToNew[oldFile] = count === 1 ? `${base}.jpg` : `${base}-${count}.jpg`;
  }

  const conflictCount = Object.values(usedEnglishCount).filter(c => c > 1).length;
  const conflictFiles = Object.values(usedEnglishCount).reduce((s, c) => s + (c > 1 ? c - 1 : 0), 0);
  console.log(`[3] 构建映射完成: ${mapKeys.length} 个映射，${conflictCount} 个基础名有重名，${conflictFiles} 个文件追加了数字后缀`);

  // 4. 物理重命名文件
  const imgDir = path.join(ROOT, 'assets', 'images');
  const existingFiles = new Set(fs.readdirSync(imgDir));
  let renamed = 0, skipped = 0, alreadyDone = 0;

  for (const [oldFile, newFile] of Object.entries(oldToNew)) {
    const oldPath = path.join(imgDir, oldFile);
    const newPath = path.join(imgDir, newFile);

    if (!existingFiles.has(oldFile)) {
      // 旧文件不存在
      if (existingFiles.has(newFile)) {
        alreadyDone++; // 已重命名过（幂等）
      } else {
        skipped++; // 旧文件确实不存在且新文件也不存在
      }
      continue;
    }

    // 旧文件存在
    if (existingFiles.has(newFile)) {
      alreadyDone++; // 新文件已存在，跳过避免覆盖
      continue;
    }

    fs.renameSync(oldPath, newPath);
    renamed++;
  }
  console.log(`[4] 物理重命名: ${renamed} 成功, ${alreadyDone} 已完成(跳过), ${skipped} 源文件不存在`);

  // 5. 更新 questions.json 中所有 image 字段
  const qPath = path.join(ROOT, 'src', 'data', 'questions.json');
  const questions = JSON.parse(fs.readFileSync(qPath, 'utf8'));
  let updatedFields = 0;

  for (const q of questions) {
    if (q.image && oldToNew[q.image]) {
      q.image = oldToNew[q.image];
      updatedFields++;
    }
  }
  console.log(`[5] questions.json 字段更新: ${updatedFields} 个`);

  // 6. 检查并清理无效引用（引用了不存在的文件）
  const currentFiles = new Set(fs.readdirSync(imgDir));
  let invalidRefs = 0;
  const invalidDetails = [];

  for (const q of questions) {
    if (q.image && !currentFiles.has(q.image)) {
      invalidDetails.push({ id: q.id, image: q.image });
      q.image = '';
      invalidRefs++;
    }
  }

  if (invalidRefs > 0) {
    console.log(`[6] 无效引用清理: ${invalidRefs} 个`);
    invalidDetails.forEach(d => console.log(`     id=${d.id} → "${d.image}" 已置空`));
  } else {
    console.log(`[6] 无效引用检查: 0 个（全部引用有效）`);
  }

  // 7. 写回 questions.json（保持 2 空格缩进）
  const output = JSON.stringify(questions, null, 2) + '\n';
  fs.writeFileSync(qPath, output, 'utf8');
  console.log(`[7] questions.json 已写回`);

  // 汇总报告
  console.log('\n=== 重命名汇总报告 ===');
  console.log(`物理重命名成功:     ${renamed}`);
  console.log(`已完成(幂等跳过):   ${alreadyDone}`);
  console.log(`源文件不存在跳过:   ${skipped}`);
  console.log(`JSON 字段更新:      ${updatedFields}`);
  console.log(`无效引用清理:       ${invalidRefs}`);
  console.log(`重名冲突基础名数:   ${conflictCount}`);
  console.log(`追加分号文件数:     ${conflictFiles}`);
  console.log('=== 完成 ===\n');
}

// 仅在直接执行时运行 main，被 import 时不自动执行
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}
