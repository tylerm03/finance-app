'use client'

import { Sankey, Tooltip, Rectangle, Layer } from 'recharts'
import { CHART_COLORS } from '@/lib/categorization/chart-colors'

type Node = { name: string }
type Link = { source: number; target: number; value: number }

function CustomNode(props: any) {
  const { x, y, width, height, index, payload, containerWidth } = props
  const isOut = x + width + 6 > containerWidth
  const color = CHART_COLORS[index % CHART_COLORS.length]

  return (
    <Layer key={'node-' + index}>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.9} />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize={12}
        fill="#111827"
        dominantBaseline="middle"
      >
        {payload.name}
      </text>
    </Layer>
  )
}

export default function CashFlowSankey({ nodes, links }: { nodes: Node[]; links: Link[] }) {
  return (
    <Sankey
      width={800}
      height={Math.max(320, nodes.length * 32)}
      data={{ nodes, links }}
      node={<CustomNode />}
      link={{ stroke: '#3b82f6', strokeOpacity: 0.2 }}
      nodePadding={24}
      margin={{ left: 100, right: 140, top: 20, bottom: 20 }}
    >
      <Tooltip
        contentStyle={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          color: '#111827',
        }}
        formatter={(value: any) => '$' + Number(value).toFixed(2)}
      />
    </Sankey>
  )
}
