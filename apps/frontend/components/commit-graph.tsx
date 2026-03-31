'use client';

import type { FunctionComponent } from 'react';
import type { GraphNode } from '@/lib/graph-layout';

const LANE_WIDTH = 16;
const ROW_HEIGHT = 36;
const DOT_RADIUS = 4;
const LINE_WIDTH = 2;

const LANE_COLORS = [
  '#4dabf7',
  '#51cf66',
  '#ff6b6b',
  '#ffd43b',
  '#cc5de8',
  '#ff922b',
  '#20c997',
  '#e599f7',
] as const;

const laneColor = (lane: number): string =>
  LANE_COLORS[lane % LANE_COLORS.length];

const laneX = (lane: number): number => lane * LANE_WIDTH + LANE_WIDTH / 2;

export { ROW_HEIGHT };

export const CommitGraphRow: FunctionComponent<{
  node: GraphNode;
  maxLane: number;
}> = ({ node, maxLane }) => {
  const svgWidth = (maxLane + 1) * LANE_WIDTH + 4;
  const centerY = ROW_HEIGHT / 2;

  const aboveSet = new Set(node.lanesAbove);
  const belowSet = new Set(node.lanesBelow);

  // All lanes that appear either above or below
  const allLanes = new Set([...node.lanesAbove, ...node.lanesBelow]);

  return (
    <svg
      width={svgWidth}
      height={ROW_HEIGHT}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Vertical lane lines with correct start/end */}
      {[...allLanes].map((laneIdx) => {
        const fromAbove = aboveSet.has(laneIdx);
        const goesBelow = belowSet.has(laneIdx);
        const isCommitLane = laneIdx === node.lane;

        // Lanes newly created at this row (not from above) are connected
        // by a curve edge, so skip the vertical line entirely.
        if (!fromAbove && !isCommitLane) return null;

        // For the commit's own lane, split into two segments around the dot
        if (isCommitLane) {
          return (
            <g key={`lane-${laneIdx}`}>
              {fromAbove && (
                <line
                  x1={laneX(laneIdx)}
                  y1={0}
                  x2={laneX(laneIdx)}
                  y2={centerY - DOT_RADIUS - 1}
                  stroke={laneColor(laneIdx)}
                  strokeWidth={LINE_WIDTH}
                />
              )}
              {goesBelow && (
                <line
                  x1={laneX(laneIdx)}
                  y1={centerY + DOT_RADIUS + 1}
                  x2={laneX(laneIdx)}
                  y2={ROW_HEIGHT}
                  stroke={laneColor(laneIdx)}
                  strokeWidth={LINE_WIDTH}
                />
              )}
            </g>
          );
        }

        // Passing-through lane: always has fromAbove=true here
        return (
          <line
            key={`lane-${laneIdx}`}
            x1={laneX(laneIdx)}
            y1={0}
            x2={laneX(laneIdx)}
            y2={ROW_HEIGHT}
            stroke={laneColor(laneIdx)}
            strokeWidth={LINE_WIDTH}
          />
        );
      })}

      {/* Edges: merge/fork curves */}
      {node.edges.map((edge, i) => {
        if (edge.fromLane === edge.toLane) return null;

        const x1 = laneX(edge.fromLane);
        const x2 = laneX(edge.toLane);

        const path = `M ${x1} ${centerY} C ${x1} ${centerY + ROW_HEIGHT * 0.4}, ${x2} ${ROW_HEIGHT * 0.6}, ${x2} ${ROW_HEIGHT}`;

        return (
          <path
            key={`edge-${i}`}
            d={path}
            stroke={laneColor(edge.toLane)}
            strokeWidth={LINE_WIDTH}
            fill="none"
          />
        );
      })}

      {/* Commit dot */}
      <circle
        cx={laneX(node.lane)}
        cy={centerY}
        r={DOT_RADIUS}
        fill={laneColor(node.lane)}
        stroke="var(--mantine-color-body)"
        strokeWidth={1.5}
      />
    </svg>
  );
};
