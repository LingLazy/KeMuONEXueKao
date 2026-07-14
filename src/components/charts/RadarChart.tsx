/**
 * 雷达图组件（SVG 自绘）
 * - 根据传入数据绘制多边形雷达图
 * - 支持自定义尺寸与最大半径
 * - 包含网格圈、轴线、数据多边形、数据点与标签
 */

/** 雷达图内部常量配置 */
const RADAR_CONFIG = {
  size: 320,
  center: 160, // size / 2
  maxRadius: 110,
  labelOffset: 30, // maxRadius + 30
  dotRadius: 4,
  labelYOffset: 14
};

/** 雷达图单条数据项 */
interface RadarDatum {
  /** 标签文本 */
  label: string;
  /** 数值（0-100） */
  value: number;
  /** 数据点颜色 */
  color: string;
}

/** 雷达图组件属性 */
interface RadarChartProps {
  /** 数据集合，每项包含标签、数值与颜色 */
  data: RadarDatum[];
  /** 画布尺寸（正方形边长，像素），默认取 RADAR_CONFIG.size */
  size?: number;
  /** 最大半径（像素），默认取 RADAR_CONFIG.maxRadius */
  maxRadius?: number;
}

/**
 * 雷达图组件
 *
 * 输入参数：
 * @param data - 数据集合，每项包含 label/value/color
 * @param size - 画布尺寸，默认 320
 * @param maxRadius - 最大半径，默认 110
 *
 * 核心执行流程：
 * 1. 由 size 派生 center（圆心坐标），由 maxRadius 派生 labelDistance（标签距离）
 * 2. 按数据数量等分圆周，计算各数据点的极坐标并转换为直角坐标
 * 3. 依次绘制网格圈（4 级）、轴线、数据多边形、数据点与标签
 *
 * @returns 渲染的 SVG 雷达图元素
 */
export function RadarChart({ data, size = RADAR_CONFIG.size, maxRadius = RADAR_CONFIG.maxRadius }: RadarChartProps) {
  const center = size / 2;
  const count = data.length;
  const angleStep = (Math.PI * 2) / count;
  /** 标签距圆心的距离 = 最大半径 + 偏移量 */
  const labelDistance = maxRadius + RADAR_CONFIG.labelOffset;

  // 计算各数据点坐标（含标签位置）
  const points = data.map((d, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (d.value / 100) * maxRadius;
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      labelX: center + Math.cos(angle) * labelDistance,
      labelY: center + Math.sin(angle) * labelDistance,
      ...d
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // 网格圈层级（25% / 50% / 75% / 100%）
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart" aria-label="分类正确率雷达图">
      {/* 网格圈 */}
      {gridLevels.map((level) => {
        const r = level * maxRadius;
        const polyPoints = data
          .map((_, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
          })
          .join(' ');
        return <polygon key={level} points={polyPoints} className="radar-grid" />;
      })}
      {/* 轴线 */}
      {data.map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + Math.cos(angle) * maxRadius}
            y2={center + Math.sin(angle) * maxRadius}
            className="radar-axis"
          />
        );
      })}
      {/* 数据多边形 */}
      <polygon points={polygonPoints} className="radar-polygon" />
      {/* 数据点 */}
      {points.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r={RADAR_CONFIG.dotRadius} fill={p.color} className="radar-point" />
      ))}
      {/* 标签 */}
      {points.map((p) => (
        <text
          key={p.label}
          x={p.labelX}
          y={p.labelY}
          className="radar-label"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {p.label}
          <tspan x={p.labelX} y={p.labelY + RADAR_CONFIG.labelYOffset} className="radar-label-val">
            {p.value}%
          </tspan>
        </text>
      ))}
    </svg>
  );
}
