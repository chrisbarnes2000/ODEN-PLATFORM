import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Circle, Line, Text, Group, Rect } from 'react-konva';
import * as d3 from 'd3-force';
import { 
  Layers, 
  X, 
  Sparkles, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown,
  Maximize2,
  Minimize2,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { NodeData, EdgeData, NodeType, ProjectData } from '../types';
import { COLORS, EDGE_COLORS } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GraphViewProps {
  nodes: NodeData[];
  edges: EdgeData[];
  onSelectNode: (id: string) => void;
  selectedNodeIds: Set<string>;
  simulationTrigger: number;
  onReLayout: () => void;
  hiddenNodeTypes: Set<string>;
  setHiddenNodeTypes: React.Dispatch<React.SetStateAction<Set<string>>>;
  allNodes: NodeData[];
}

export default function GraphView({ 
  nodes, 
  edges, 
  onSelectNode, 
  selectedNodeIds, 
  simulationTrigger, 
  onReLayout,
  hiddenNodeTypes,
  setHiddenNodeTypes,
  allNodes
}: GraphViewProps) {
  const stageRef = useRef<any>(null);
  const simulationRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [graphNodes, setGraphNodes] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(window.innerWidth < 768);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(window.innerWidth < 768);
  const [spotlightedTypes, setSpotlightedTypes] = useState<Set<string>>(new Set());
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [timelineIndex, setTimelineIndex] = useState<number | null>(null);

  const dates = useMemo(() => {
    const d = allNodes.map(n => n.date).concat(edges.map(e => e.date)).filter(Boolean) as string[];
    return Array.from(new Set(d)).sort();
  }, [allNodes, edges]);

  useEffect(() => {
    if (dates.length > 0 && timelineIndex === null) {
      setTimelineIndex(dates.length - 1);
    }
  }, [dates]);

  const filteredNodes = useMemo(() => {
    if (timelineIndex === null || dates.length === 0) return nodes;
    const currentDate = dates[timelineIndex];
    return nodes.filter(n => !n.date || n.date <= currentDate);
  }, [nodes, timelineIndex, dates]);

  const filteredEdges = useMemo(() => {
    if (timelineIndex === null || dates.length === 0) return edges;
    const currentDate = dates[timelineIndex];
    return edges.filter(e => !e.date || e.date <= currentDate);
  }, [edges, timelineIndex, dates]);

  useEffect(() => {
    let frame: number;
    const animate = (time: number) => {
      setPulse(Math.sin(time / 300) * 0.5 + 0.5);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setDimensions({ 
        width: width, 
        height: width < 768 ? height - 120 : height - 80 
      });
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fitToScreen = () => {
    if (!stageRef.current || graphNodes.length === 0) return;
    
    const stage = stageRef.current;
    const padding = 50;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    graphNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    });

    const graphWidth = maxX - minX + padding * 2;
    const graphHeight = maxY - minY + padding * 2;
    
    const scale = Math.min(
      dimensions.width / graphWidth,
      dimensions.height / graphHeight,
      1
    );

    stage.scale({ x: scale, y: scale });
    stage.position({
      x: (dimensions.width - (maxX + minX) * scale) / 2,
      y: (dimensions.height - (maxY + minY) * scale) / 2
    });
    setZoom(scale);
    stage.batchDraw();
  };

  useEffect(() => {
    if (graphNodes.length > 0) {
      const timer = setTimeout(fitToScreen, 500);
      return () => clearTimeout(timer);
    }
  }, [simulationTrigger, graphNodes.length === 0]);

  useEffect(() => {
    const isValid = (val: any) => typeof val === 'number' && !isNaN(val);
    
    const d3Nodes = nodes.map(n => {
      const existing = graphNodes.find(gn => gn.id === n.id);
      return {
        ...n,
        x: isValid(existing?.x) ? existing.x : (isValid(n.x) ? n.x : dimensions.width / 2 + (Math.random() - 0.5) * 100),
        y: isValid(existing?.y) ? existing.y : (isValid(n.y) ? n.y : dimensions.height / 2 + (Math.random() - 0.5) * 100),
        fx: existing?.fx,
        fy: existing?.fy
      };
    });

    const d3Edges = edges
      .filter(e => nodes.some(n => n.id === e.from) && nodes.some(n => n.id === e.to))
      .map(e => ({
        source: e.from,
        target: e.to,
        weight: e.weight
      }));

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3.forceSimulation(d3Nodes)
      .force('link', d3.forceLink(d3Edges).id((d: any) => d.id).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius(60))
      .force('x', d3.forceX(dimensions.width / 2).strength(0.05))
      .force('y', d3.forceY(dimensions.height / 2).strength(0.05));

    if (simulationTrigger > 0) {
      d3Nodes.forEach(n => {
        n.fx = null;
        n.fy = null;
      });
    }

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      setGraphNodes([...d3Nodes]);
    });

    return () => { simulation.stop(); };
  }, [nodes, edges, dimensions.width, dimensions.height, simulationTrigger]);

  const displayNodes = useMemo(() => {
    return graphNodes.filter(gn => filteredNodes.some(fn => fn.id === gn.id));
  }, [graphNodes, filteredNodes]);

  const displayEdges = useMemo(() => {
    return filteredEdges.filter(e => {
      return graphNodes.some(n => n.id === e.from) && graphNodes.some(n => n.id === e.to);
    });
  }, [filteredEdges, graphNodes]);

  const handleRecenter = () => {
    if (stageRef.current) {
      const stage = stageRef.current;
      stage.to({
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 0.5,
        easing: 'EaseInOut'
      });
      setZoom(1);
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 0.002;
    const newScale = e.evt.deltaY > 0 ? oldScale / (1 + speed * Math.abs(e.evt.deltaY)) : oldScale * (1 + speed * Math.abs(e.evt.deltaY));
    
    stage.scale({ x: newScale, y: newScale });
    setZoom(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
  };

  return (
    <div className="w-full h-full bg-bg overflow-hidden relative">
      <Stage 
        width={dimensions.width} 
        height={dimensions.height} 
        draggable
        ref={stageRef}
        onDblClick={handleRecenter}
        onWheel={handleWheel}
        className="cursor-grab active:cursor-grabbing"
      >
        <Layer>
          {/* Grid lines */}
          {Array.from({ length: 40 }).map((_, i) => (
            <React.Fragment key={i}>
              <Line 
                points={[(i - 20) * 100, -2000, (i - 20) * 100, 2000]} 
                stroke="#1a1a1a" 
                strokeWidth={1} 
              />
              <Line 
                points={[-2000, (i - 20) * 100, 2000, (i - 20) * 100]} 
                stroke="#1a1a1a" 
                strokeWidth={1} 
              />
            </React.Fragment>
          ))}

          {/* Edges */}
          {displayEdges.map((edge, i) => {
            const from = graphNodes.find(n => n.id === edge.from);
            const to = graphNodes.find(n => n.id === edge.to);
            if (!from || !to) return null;
            
            const isHighlighted = selectedNodeIds.has(edge.from) || selectedNodeIds.has(edge.to);
            const isContradiction = edge.type === 'conflict';
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const edgeColor = EDGE_COLORS[edge.type] || "#444";
            
            return (
              <Group key={i}>
                <Line
                  points={[from.x, from.y, to.x, to.y]}
                  stroke={isHighlighted ? "#c8923f" : edgeColor}
                  strokeWidth={isHighlighted ? (edge.weight * 1.5) + 1 : edge.weight * 1.5}
                  opacity={isContradiction ? 0.5 + (pulse * 0.2) : (isHighlighted ? 1 : 0.4)}
                  shadowBlur={isHighlighted || isContradiction ? 8 : 0}
                  shadowColor={isContradiction ? "#ff4444" : (isHighlighted ? "#c8923f" : "transparent")}
                />
                <Circle 
                  x={from.x} 
                  y={from.y} 
                  radius={2} 
                  fill={isHighlighted ? "#c8923f" : edgeColor} 
                  opacity={isHighlighted ? 1 : 0.4}
                />
                <Circle 
                  x={to.x} 
                  y={to.y} 
                  radius={2} 
                  fill={isHighlighted ? "#c8923f" : edgeColor} 
                  opacity={isHighlighted ? 1 : 0.4}
                />
                {isHighlighted && edge.label && (
                  <Group x={midX} y={midY}>
                    <Rect 
                      fill="#1a1a1a"
                      stroke="#c8923f"
                      strokeWidth={0.5}
                      width={edge.label.length * 6 + 10}
                      height={14}
                      offsetX={(edge.label.length * 6 + 10) / 2}
                      offsetY={7}
                      cornerRadius={2}
                    />
                    <Text 
                      text={edge.label}
                      fill="#c8923f"
                      fontSize={8}
                      fontFamily="JetBrains Mono"
                      align="center"
                      width={edge.label.length * 6 + 10}
                      offsetX={(edge.label.length * 6 + 10) / 2}
                      offsetY={4}
                    />
                  </Group>
                )}
              </Group>
            );
          })}

          {/* Nodes */}
          {displayNodes.map(node => (
            <Group 
              key={node.id} 
              x={node.x} 
              y={node.y}
              draggable
              onDragStart={() => {
                if (simulationRef.current) {
                  simulationRef.current.alphaTarget(0.3).restart();
                }
                node.fx = node.x;
                node.fy = node.y;
              }}
              onDragMove={(e) => {
                node.fx = e.target.x();
                node.fy = e.target.y();
              }}
              onDragEnd={() => {
                if (simulationRef.current) {
                  simulationRef.current.alphaTarget(0);
                }
              }}
              onClick={() => onSelectNode(node.id)}
              onTap={() => onSelectNode(node.id)}
              className="cursor-pointer"
            >
              <Circle
                radius={15 + (filteredEdges.filter(e => e.from === node.id || e.to === node.id).length * 2)}
                fill={COLORS[node.type as NodeType] || '#888'}
                stroke={selectedNodeIds.has(node.id) ? '#fff' : 'transparent'}
                strokeWidth={2}
                dash={node.placeholder ? [5, 5] : undefined}
                shadowBlur={selectedNodeIds.has(node.id) || (isHeatmapMode && node.placeholder) ? 15 : 0}
                shadowColor={isHeatmapMode && node.placeholder ? "#ff8800" : COLORS[node.type as NodeType]}
                opacity={
                  isHeatmapMode 
                    ? (node.placeholder ? 1 : 0.2) 
                    : (spotlightedTypes.size > 0 
                        ? (spotlightedTypes.has(node.type) ? 1 : 0.1) 
                        : (node.placeholder ? 0.6 : 1))
                }
              />
              {node.sectionId && (
                <Circle 
                  radius={4}
                  x={12}
                  y={-12}
                  fill="#7a9e7e"
                />
              )}
              <Text
                text={node.label}
                y={25}
                align="center"
                width={120}
                offsetX={60}
                fill={selectedNodeIds.has(node.id) ? '#fff' : '#aaa'}
                fontSize={10}
                fontFamily="JetBrains Mono"
              />
            </Group>
          ))}
        </Layer>
      </Stage>

      {/* Map Controls - Collapsible on Mobile */}
      <div className="absolute top-5 right-5 flex flex-col gap-2 z-30 items-end">
        <button 
          onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
          className="md:hidden bg-panel/90 border border-border p-2 rounded-full text-accent shadow-lg"
        >
          {isControlsCollapsed ? <Settings size={20} /> : <X size={20} />}
        </button>

        <div className={cn(
          "flex flex-col gap-2 transition-all duration-300",
          isControlsCollapsed ? "opacity-0 pointer-events-none translate-x-10 md:opacity-100 md:pointer-events-auto md:translate-x-0" : "opacity-100 translate-x-0"
        )}>
          <div className="bg-panel/90 border border-border p-2 text-[9px] text-muted max-w-[150px] leading-tight mb-1 text-right hidden md:block">
            <strong className="text-accent block mb-1 uppercase tracking-tighter">Heatmap Mode</strong>
            Highlights "Gap" nodes and unverified placeholders to visualize structural silence.
          </div>
          <button 
            onClick={() => setIsHeatmapMode(!isHeatmapMode)}
            className={cn(
              "bg-panel/90 border border-border p-2 transition-colors shadow-lg flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold",
              isHeatmapMode ? "text-accent border-accent" : "text-muted hover:text-accent"
            )}
          >
            <AlertTriangle size={14} />
            {isHeatmapMode ? "HEATMAP ON" : "HEATMAP"}
          </button>
          <button 
            onClick={onReLayout}
            className="bg-panel/90 border border-border p-2 text-accent hover:bg-white/5 transition-colors shadow-lg flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold"
          >
            <Sparkles size={14} />
            RESET LAYOUT
          </button>
          
          <div className="flex flex-col gap-1">
            <button 
              onClick={fitToScreen}
              className="bg-panel/90 border border-border p-2 text-muted hover:text-accent transition-colors shadow-lg flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold"
              title="Fit to Screen"
            >
              <Maximize2 size={14} />
              FIT TO SCREEN
            </button>
            <div className="flex gap-1">
              <button 
                onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
                className="flex-1 bg-panel/90 border border-border p-2 text-muted hover:text-accent transition-colors shadow-lg text-[10px] font-bold"
              >
                +
              </button>
              <button 
                onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))}
                className="flex-1 bg-panel/90 border border-border p-2 text-muted hover:text-accent transition-colors shadow-lg text-[10px] font-bold"
              >
                -
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map Legend - Collapsible */}
      <div className={cn(
        "absolute top-5 left-5 bg-panel/95 border border-border backdrop-blur-md z-30 pointer-events-auto transition-all duration-300 shadow-2xl overflow-hidden flex flex-col",
        isLegendCollapsed ? "w-10 h-10 rounded-full items-center justify-center p-0" : "w-48 md:w-56 max-h-[85%] p-3"
      )}>
        {isLegendCollapsed ? (
          <button 
            onClick={() => setIsLegendCollapsed(false)}
            className="w-full h-full flex items-center justify-center text-accent hover:bg-white/5 transition-colors"
          >
            <Layers size={18} />
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 border-b border-border pb-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <Layers size={10} className="text-accent" />
                <div className="text-[10px] tracking-[2px] text-muted uppercase font-bold">Layers</div>
              </div>
              <button 
                onClick={() => setIsLegendCollapsed(true)}
                className="text-muted hover:text-accent p-1"
              >
                <X size={12} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <p className="text-[9px] text-muted mb-3 leading-tight italic">
                Select one or more types to spotlight. Click again to undo.
              </p>

              <div className="space-y-4">
                <LegendSection 
                  title="Investigation Core" 
                  types={['case', 'event', 'gap', 'suspect']} 
                  allNodes={allNodes}
                  spotlightedTypes={spotlightedTypes}
                  setSpotlightedTypes={setSpotlightedTypes}
                  hiddenNodeTypes={hiddenNodeTypes}
                  setHiddenNodeTypes={setHiddenNodeTypes}
                />
                <LegendSection 
                  title="Entities" 
                  types={['actor', 'institution', 'location', 'document', 'media', 'financial', 'witness', 'law', 'science', 'family', 'network', 'period', 'alias', 'rumor', 'pattern', 'concept', 'object', 'relation']} 
                  allNodes={allNodes}
                  spotlightedTypes={spotlightedTypes}
                  setSpotlightedTypes={setSpotlightedTypes}
                  hiddenNodeTypes={hiddenNodeTypes}
                  setHiddenNodeTypes={setHiddenNodeTypes}
                />
              </div>
              <div className="mt-4 pt-4 border-t border-border/30">
                <button 
                  onClick={() => setSpotlightedTypes(new Set())}
                  className="text-[9px] text-accent hover:underline uppercase tracking-widest font-bold"
                >
                  Clear Spotlight
                </button>
              </div>

              {/* Visual Key - Explaining the Language */}
              <div className="mt-6 pt-4 border-t border-border/30">
                <div className="text-[8px] text-muted uppercase tracking-widest mb-2 opacity-50">Visual Language</div>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent flex-shrink-0 mt-0.5" />
                    <div className="text-[10px] text-muted leading-tight">
                      <span className="text-text font-bold block mb-0.5">Node Color</span>
                      Represents the entity type.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-dashed border-muted flex-shrink-0 mt-0.5" />
                    <div className="text-[10px] text-muted leading-tight">
                      <span className="text-text font-bold block mb-0.5">Dashed Border</span>
                      Indicates a "Hunch" or unverified entity.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Temporal Playback Slider */}
      {dates.length > 1 && timelineIndex !== null && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-8 z-30">
          <div className="bg-panel/90 border border-border p-4 backdrop-blur-md shadow-2xl rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] uppercase tracking-[2px] text-accent font-bold">Temporal</div>
              <div className="text-[12px] font-mono text-text">{dates[timelineIndex]}</div>
            </div>
            <input 
              type="range" 
              min={0} 
              max={dates.length - 1} 
              value={timelineIndex}
              onChange={(e) => setTimelineIndex(parseInt(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
          </div>
        </div>
      )}

      <div className="absolute bottom-5 left-5 text-[10px] text-muted pointer-events-none z-20 hidden md:block">
        DRAG to pan | SCROLL to zoom | CLICK to highlight | DOUBLE CLICK to recenter
      </div>
    </div>
  );
}

function LegendSection({ title, types, allNodes, spotlightedTypes, setSpotlightedTypes, hiddenNodeTypes, setHiddenNodeTypes }: any) {
  const availableTypes = types.filter((t: string) => allNodes.some((n: any) => n.type === t));
  if (availableTypes.length === 0) return null;

  return (
    <div>
      <div className="text-[8px] text-muted/50 uppercase tracking-widest mb-2 font-bold">{title}</div>
      <div className="grid grid-cols-2 gap-1.5">
        {availableTypes.map((type: string) => (
          <div key={type} className="flex items-center gap-1">
            <button
              onClick={() => {
                setSpotlightedTypes((prev: Set<string>) => {
                  const next = new Set(prev);
                  if (next.has(type)) next.delete(type);
                  else next.add(type);
                  return next;
                });
              }}
              className={cn(
                "flex-1 flex items-center gap-2 p-1.5 rounded border transition-all text-left",
                spotlightedTypes.has(type) ? "bg-accent/10 border-accent" : "bg-bg/50 border-border hover:border-muted",
                hiddenNodeTypes.has(type) && "opacity-30 grayscale"
              )}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[type as NodeType] }} />
              <span className="text-[9px] uppercase tracking-tighter truncate text-muted">{type}</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setHiddenNodeTypes((prev: Set<string>) => {
                  const next = new Set(prev);
                  if (next.has(type)) next.delete(type);
                  else next.add(type);
                  return next;
                });
              }}
              className={cn(
                "p-1 rounded hover:bg-white/5 transition-colors",
                hiddenNodeTypes.has(type) ? "text-muted" : "text-accent"
              )}
              title={hiddenNodeTypes.has(type) ? "Show Layer" : "Hide Layer"}
            >
              {hiddenNodeTypes.has(type) ? <EyeOff size={10} /> : <Eye size={10} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
