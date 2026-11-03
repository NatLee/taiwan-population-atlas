import { geoMercator, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { useElementSize } from '../hooks/useElementSize.ts';
import { CLICK_DISTANCE, MAP_PADDING, NO_DATA_PATTERN, ZOOM_EXTENT, ZOOM_STEP } from '../lib/map.ts';

interface CountyProps {
  code: string;
  name: string;
}
type CountyFeature = Feature<Geometry, CountyProps>;

export interface MapCounty {
  /** Undefined when the county has no value: it gets the hatch pattern. */
  fill: string | undefined;
  /** Accessible and tooltip text, e.g. 「臺北市：2,603,076 人」. */
  label: string;
}

interface Props {
  topology: Topology;
  counties: Record<string, MapCounty>;
  selected: string | null;
  /** County code → outline colour, for compared counties. */
  outlines: Record<string, string>;
  onSelect: (code: string | null) => void;
  /** Rendered over the map's bottom-left corner (the legend). */
  overlay?: React.ReactNode;
}


export function ChoroplethMap({ topology, counties, selected, outlines, onSelect, overlay }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const { width, height } = useElementSize(wrapper);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);

  const features = useMemo(() => {
    const object = topology.objects['counties'] as GeometryCollection<CountyProps>;
    return (feature(topology, object) as FeatureCollection<Geometry, CountyProps>).features as CountyFeature[];
  }, [topology]);

  const paths = useMemo(() => {
    if (width === 0 || height === 0) return [];
    const collection: FeatureCollection<Geometry, CountyProps> = { type: 'FeatureCollection', features };
    const projection = geoMercator().fitExtent(
      [
        [MAP_PADDING, MAP_PADDING],
        [width - MAP_PADDING, height - MAP_PADDING],
      ],
      collection,
    );
    const path = geoPath(projection);
    return features.map((f) => ({ code: f.properties.code, d: path(f) ?? '', centroid: path.centroid(f) }));
  }, [features, width, height]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    const behaviour = zoom<SVGSVGElement, unknown>()
      .scaleExtent(ZOOM_EXTENT)
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .clickDistance(CLICK_DISTANCE)
      .on('zoom', (event: { transform: ZoomTransform }) => setTransform(event.transform));
    zoomRef.current = behaviour;
    select(svg).call(behaviour);
    return () => {
      select(svg).on('.zoom', null);
    };
  }, [width, height]);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    if (svg && zoomRef.current) select(svg).call(zoomRef.current.scaleBy, factor);
  };
  const resetZoom = () => {
    const svg = svgRef.current;
    if (svg && zoomRef.current) select(svg).call(zoomRef.current.transform, zoomIdentity);
  };

  const onKey = (code: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(code);
    }
  };

  const hovered = hover ? counties[hover.code] : undefined;
  const byCode = new Map(paths.map((p) => [p.code, p]));
  const highlight = (code: string) => byCode.get(code)?.d ?? '';

  return (
    <div ref={wrapper} className="relative h-full w-full overflow-hidden" onPointerLeave={() => setHover(null)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0 block touch-none select-none"
        role="group"
        aria-label="臺灣縣市地圖。點選縣市看詳細資料，可以縮放和拖曳。"
      >
        <defs>
          <pattern id={NO_DATA_PATTERN} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--surface)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted)" strokeWidth="1.5" />
          </pattern>
        </defs>
        {/* Clicking the sea clears the selection, as on the 2017 page. */}
        <rect width={width} height={height} fill="transparent" onClick={() => onSelect(null)} />
        <g transform={transform.toString()}>
          {paths.map((p) => {
            const county = counties[p.code];
            return (
              <path
                key={p.code}
                d={p.d}
                fill={county?.fill ?? `url(#${NO_DATA_PATTERN})`}
                stroke="var(--surface)"
                strokeWidth={0.75}
                vectorEffect="non-scaling-stroke"
                tabIndex={0}
                role="button"
                aria-label={county?.label}
                aria-pressed={selected === p.code}
                className="cursor-pointer outline-none transition-[fill] duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(p.code);
                }}
                onKeyDown={onKey(p.code)}
                onPointerMove={(e) => {
                  const box = wrapper.current?.getBoundingClientRect();
                  if (box) setHover({ code: p.code, x: e.clientX - box.left, y: e.clientY - box.top });
                }}
                onFocus={() => setHover({ code: p.code, x: transform.applyX(p.centroid[0]), y: transform.applyY(p.centroid[1]) })}
                onBlur={() => setHover(null)}
              />
            );
          })}
          {/* Outlines are drawn on top so neighbouring shapes never cover them. */}
          {Object.entries(outlines).map(([code, color]) => (
            <path key={`o-${code}`} d={highlight(code)} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          ))}
          {hover && hover.code !== selected && (
            <path d={highlight(hover.code)} fill="none" stroke="var(--ink)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
          {selected && (
            <path d={highlight(selected)} fill="none" stroke="var(--ink)" strokeWidth={3} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
        </g>
      </svg>

      {hover && hovered && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 max-w-56 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm shadow-md"
          style={{
            left: Math.min(hover.x + 12, Math.max(width - 200, 0)),
            top: Math.max(hover.y - 44, 4),
          }}
        >
          {hovered.label}
        </div>
      )}

      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        <MapButton label="放大" onClick={() => zoomBy(ZOOM_STEP)}>
          <Plus className="size-4" aria-hidden="true" />
        </MapButton>
        <MapButton label="縮小" onClick={() => zoomBy(1 / ZOOM_STEP)}>
          <Minus className="size-4" aria-hidden="true" />
        </MapButton>
        <MapButton label="重設縮放" onClick={resetZoom}>
          <Maximize2 className="size-4" aria-hidden="true" />
        </MapButton>
      </div>

      {overlay && <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)]">{overlay}</div>}
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      {children}
    </button>
  );
}
