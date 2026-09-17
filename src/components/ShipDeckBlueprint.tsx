import React, { useState, useEffect, useRef } from 'react';
import { BaseShipModel, CustomShipConfig } from '../types/ship';
import { COMPONENT_MAP } from '../data/components';
import { TRAILER_MAP } from '../data/trailers';
import {
  Bomb,
  Compass,
  Crosshair,
  Flame,
  Gauge,
  Rocket,
  Shield,
  Target,
  Wrench,
  Zap,
  Radio,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Move,
} from 'lucide-react';

interface ShipDeckBlueprintProps {
  model: BaseShipModel;
  config: CustomShipConfig;
  selectedHardpointId: string | null;
  onSelectHardpoint: (hardpointId: string) => void;
}

export const ShipDeckBlueprint: React.FC<ShipDeckBlueprintProps> = ({
  model,
  config,
  selectedHardpointId,
  onSelectHardpoint,
}) => {
  // Interactive Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const hardpointPressPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Automatically reset pan and zoom when switching to a different vehicle model
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [model.id]);

  // Prevent page scrolling and perform blueprint zoom when cursor is inside window
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoom(z => Math.max(0.4, Math.min(3.5, +(z + delta).toFixed(2))));
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // Global window pointer listeners while panning the canvas
  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 3) {
        hasMovedRef.current = true;
      }
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging]);

  // SVG view coordinates centered at 0,0
  const width = 360;
  const height = 480;
  const cx = width / 2;
  const cy = height / 2;

  const trailer = config.trailerId && config.trailerId !== 'none' ? TRAILER_MAP.get(config.trailerId) : null;

  // Adaptive base scale: ensures small vehicles have ample space and large ships fit comfortably
  const totalLength = model.hullLength + (trailer ? trailer.length * 0.85 + 25 : 0);
  const targetPixelLength = 260;
  const scale = Math.max(1.4, Math.min(3.8, targetPixelLength / Math.max(45, totalLength)));
  const halfL = (model.hullLength * scale) * 0.5;
  const halfW = (model.hullWidth * scale) * 0.5;
  const chassis = model.chassisType || 'tracked';

  const renderIcon = (iconName?: string) => {
    const props = { className: 'w-4 h-4' };
    switch (iconName) {
      case 'Bomb': return <Bomb {...props} />;
      case 'Crosshair': return <Crosshair {...props} />;
      case 'Target': return <Target {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Rocket': return <Rocket {...props} />;
      case 'Flame': return <Flame {...props} />;
      case 'Shield': return <Shield {...props} />;
      case 'Gauge': return <Gauge {...props} />;
      case 'Compass': return <Compass {...props} />;
      case 'Wrench': return <Wrench {...props} />;
      case 'Radio': return <Radio {...props} />;
      default: return <Zap {...props} />;
    }
  };

  const getArcLabel = (arc: string) => {
    switch (arc) {
      case 'bow': return 'Forward Arc (Glacis)';
      case 'stern': return 'Rear Arc (Aft)';
      case 'broadside-left': return 'Left Flank (90°)';
      case 'broadside-right': return 'Right Flank (90°)';
      case 'all': return '360° Turret Arc';
      default: return arc;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[460px] bg-zinc-950/95 rounded-2xl border border-zinc-800/80 overflow-hidden flex flex-col items-center justify-center p-4 select-none shadow-xl shadow-black/40 overscroll-contain"
    >
      {/* Blueprint grid background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #71717a 1px, transparent 1px),
            linear-gradient(to bottom, #71717a 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Header: Title & Pan/Zoom Controls Bar */}
      <div className="absolute top-2.5 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800/60 shadow">
            Chassis Blueprint
          </span>
          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
            Front ↑
          </span>
        </div>

        {/* Pan and Zoom Toolbar */}
        <div className="flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md p-1 rounded-xl border border-zinc-700/80 shadow-lg pointer-events-auto">
          {/* Pan Directional Controls */}
          <div className="flex items-center bg-zinc-950/80 rounded-lg p-0.5 border border-zinc-800">
            <button
              type="button"
              onClick={() => setPan(p => ({ ...p, x: p.x + 35 }))}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              title="Pan Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setPan(p => ({ ...p, y: p.y + 35 }))}
                className="p-0.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                title="Pan Up"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setPan(p => ({ ...p, y: p.y - 35 }))}
                className="p-0.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                title="Pan Down"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPan(p => ({ ...p, x: p.x - 35 }))}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              title="Pan Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-700/80 my-auto" />

          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.4, +(z - 0.25).toFixed(2)))}
            disabled={zoom <= 0.4}
            className="p-1.5 hover:bg-zinc-800 disabled:opacity-40 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Current Zoom Level / Reset Fit */}
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-950/80 rounded border border-amber-800/40 transition cursor-pointer"
            title="Reset to Default Fit (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(3.5, +(z + 0.25).toFixed(2)))}
            disabled={zoom >= 3.5}
            className="p-1.5 hover:bg-zinc-800 disabled:opacity-40 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Reset View Button */}
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-amber-400 transition cursor-pointer"
            title="Reset Pan & Zoom (Center View)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Ship Canvas */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        onPointerDown={handlePointerDown}
        className={`w-full h-full max-w-[360px] max-h-[440px] drop-shadow-2xl select-none transition-cursor ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <defs>
          <radialGradient id="tacticalGaze" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Pannable and Zoomable Scene Group */}
        <g transform={`translate(${cx + pan.x}, ${cy + pan.y}) scale(${zoom}) translate(${-cx}, ${-cy})`}>
          {/* Ambient chassis glow */}
          <circle cx={cx} cy={cy - (trailer ? 25 : 0)} r={140} fill="url(#tacticalGaze)" />

          {/* Center line axes */}
          <line
            x1={cx}
            y1={30}
            x2={cx}
            y2={height - 30}
            stroke="#71717a"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.3"
          />
          <line
            x1={30}
            y1={cy - (trailer ? 25 : 0)}
            x2={width - 30}
            y2={cy - (trailer ? 25 : 0)}
            stroke="#71717a"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.3"
          />

        {/* Vehicle Chassis Group - Rotated 90 deg so Forward points UP */}
        <g transform={`translate(${cx}, ${cy - (trailer ? 25 : 0)}) rotate(-90)`}>
          
          {/* Treads, Wheels, Air Wings, or Marine Rudders underneath */}
          {model.domain === 'air' ? (
            <>
              {/* Aircraft wing pods and engine exhausts */}
              <circle cx={-halfL * 0.7} cy={-halfW * 0.3} r="6" fill="#18181b" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx={-halfL * 0.7} cy={halfW * 0.3} r="6" fill="#18181b" stroke="#38bdf8" strokeWidth="1.5" />
              {/* Rotor blade circle if helicopter */}
              {model.spriteStyle.bodyStyle === 'chopper' && (
                <circle cx="0" cy="0" r={halfL * 0.9} fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.45" />
              )}
            </>
          ) : model.domain === 'water' ? (
            <>
              {/* Naval twin screws / rudders */}
              <rect x={-halfL * 0.96} y={-halfW * 0.6} width="14" height="5" rx="1.5" fill="#38bdf8" opacity="0.8" />
              <rect x={-halfL * 0.96} y={halfW * 0.6 - 5} width="14" height="5" rx="1.5" fill="#38bdf8" opacity="0.8" />
              <line x1={-halfL * 0.95} y1="0" x2={-halfL * 1.06} y2="0" stroke="#94a3b8" strokeWidth="3" />
            </>
          ) : chassis === 'tracked' ? (
            <>
              {/* Left caterpillar track */}
              <rect
                x={-halfL * 0.95}
                y={-halfW - 5}
                width={model.hullLength * scale * 0.95}
                height={Math.max(12, halfW * 0.45)}
                rx="4"
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth="1.5"
              />
              {/* Right caterpillar track */}
              <rect
                x={-halfL * 0.95}
                y={halfW - Math.max(12, halfW * 0.45) + 5}
                width={model.hullLength * scale * 0.95}
                height={Math.max(12, halfW * 0.45)}
                rx="4"
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth="1.5"
              />
            </>
          ) : chassis === 'half-track' ? (
            <>
              {/* Front Steer Wheels */}
              <rect
                x={halfL * 0.45}
                y={-halfW - 7}
                width="20"
                height="8"
                rx="3"
                fill="#18181b"
                stroke="#52525b"
                strokeWidth="1.5"
              />
              <rect
                x={halfL * 0.45}
                y={halfW - 1}
                width="20"
                height="8"
                rx="3"
                fill="#18181b"
                stroke="#52525b"
                strokeWidth="1.5"
              />
              {/* Rear Caterpillar Tracks */}
              <rect
                x={-halfL * 0.9}
                y={-halfW - 5}
                width={model.hullLength * scale * 0.58}
                height={Math.max(11, halfW * 0.42)}
                rx="3"
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth="1.5"
              />
              <rect
                x={-halfL * 0.9}
                y={halfW - Math.max(11, halfW * 0.42) + 5}
                width={model.hullLength * scale * 0.58}
                height={Math.max(11, halfW * 0.42)}
                rx="3"
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth="1.5"
              />
            </>
          ) : chassis === 'dune-buggy' ? (
            <>
              {/* Protruding A-arms and Wide Knobby Tires */}
              <line x1={halfL * 0.5} y1={-halfW * 0.5} x2={halfL * 0.5} y2={-halfW - 8} stroke="#52525b" strokeWidth="2.5" />
              <line x1={halfL * 0.5} y1={halfW * 0.5} x2={halfL * 0.5} y2={halfW + 8} stroke="#52525b" strokeWidth="2.5" />
              <line x1={-halfL * 0.55} y1={-halfW * 0.5} x2={-halfL * 0.55} y2={-halfW - 8} stroke="#52525b" strokeWidth="2.5" />
              <line x1={-halfL * 0.55} y1={halfW * 0.5} x2={-halfL * 0.55} y2={halfW + 8} stroke="#52525b" strokeWidth="2.5" />
              {/* 4 Knobby Tires */}
              <rect x={halfL * 0.38} y={-halfW - 12} width="22" height="9" rx="3" fill="#09090b" stroke="#71717a" strokeWidth="1.5" />
              <rect x={halfL * 0.38} y={halfW + 3} width="22" height="9" rx="3" fill="#09090b" stroke="#71717a" strokeWidth="1.5" />
              <rect x={-halfL * 0.65} y={-halfW - 12} width="24" height="10" rx="3" fill="#09090b" stroke="#71717a" strokeWidth="1.5" />
              <rect x={-halfL * 0.65} y={halfW + 2} width="24" height="10" rx="3" fill="#09090b" stroke="#71717a" strokeWidth="1.5" />
            </>
          ) : chassis === 'truck-flatbed' || chassis === 'wheeled-6x6' ? (
            // 6-wheel running gear (1 front pair, 2 tandem rear pairs)
            <>
              {/* Front pair */}
              <rect x={halfL * 0.55} y={-halfW - 6} width="20" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
              <rect x={halfL * 0.55} y={halfW - 1} width="20" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
              {/* Rear tandem pair 1 */}
              <rect x={-halfL * 0.3} y={-halfW - 6} width="20" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
              <rect x={-halfL * 0.3} y={halfW - 1} width="20" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
              {/* Rear tandem pair 2 */}
              <rect x={-halfL * 0.72} y={-halfW - 6} width="20" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
              <rect x={-halfL * 0.72} y={halfW - 1} width="20" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
            </>
          ) : chassis === 'wheeled-8x8' ? (
            // 8-wheel running gear
            [...Array(4)].map((_, i) => (
              <g key={`wheel-8x8-${i}`}>
                <rect
                  x={-halfL * 0.75 + i * (model.hullLength * scale * 0.5 / 1.5)}
                  y={-halfW - 7}
                  width="18"
                  height="7"
                  rx="2"
                  fill="#18181b"
                  stroke="#52525b"
                  strokeWidth="1.5"
                />
                <rect
                  x={-halfL * 0.75 + i * (model.hullLength * scale * 0.5 / 1.5)}
                  y={halfW}
                  width="18"
                  height="7"
                  rx="2"
                  fill="#18181b"
                  stroke="#52525b"
                  strokeWidth="1.5"
                />
              </g>
            ))
          ) : (
            // 4-wheel running gear (technical-pickup, car-patrol, armored-van)
            <>
              {/* Front pair */}
              <rect x={halfL * 0.45} y={-halfW - 6} width="18" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
              <rect x={halfL * 0.45} y={halfW - 1} width="18" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
              {/* Rear pair */}
              <rect x={-halfL * 0.65} y={-halfW - 6} width="18" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
              <rect x={-halfL * 0.65} y={halfW - 1} width="18" height="7" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
            </>
          )}

          {/* Main armored hull */}
          <path
            d={getHullSvgPath(model.id, model.hullLength * scale, model.hullWidth * scale, model.spriteStyle.bodyStyle, model.domain)}
            fill={config.primaryColor}
            stroke="#09090b"
            strokeWidth="3.5"
            className="transition-colors duration-300"
          />

          {/* Inner cabin / deck overlay */}
          <path
            d={getHullSvgPath(model.id, model.hullLength * scale * 0.86, model.hullWidth * scale * 0.8, model.spriteStyle.bodyStyle, model.domain)}
            fill={model.spriteStyle.deckColor}
            opacity="0.88"
          />

          {/* Domain-specific deck visual features */}
          {model.domain === 'land' && (
            <>
              {/* Accent side skirts */}
              <line
                x1={-halfL * 0.75}
                y1={-halfW * 0.8}
                x2={halfL * 0.65}
                y2={-halfW * 0.8}
                stroke={config.accentColor}
                strokeWidth="3.5"
              />
              <line
                x1={-halfL * 0.75}
                y1={halfW * 0.8}
                x2={halfL * 0.65}
                y2={halfW * 0.8}
                stroke={config.accentColor}
                strokeWidth="3.5"
              />
            </>
          )}

          {/* Air vehicle blueprint deck features */}
          {model.domain === 'air' && (
            <>
              {/* Cockpit Canopy */}
              <path
                d={`M ${halfL * 0.45},0 L ${halfL * 0.15},${-halfW * 0.14} L ${-halfL * 0.1},${-halfW * 0.14} L ${-halfL * 0.15},0 L ${-halfL * 0.1},${halfW * 0.14} L ${halfL * 0.15},${halfW * 0.14} Z`}
                fill="#0284c7"
                opacity="0.8"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              {/* Apache attack helicopter main rotor hub and blades */}
              {(model.spriteStyle.bodyStyle === 'chopper-apache' || model.spriteStyle.bodyStyle === 'chopper') && (
                <g>
                  <circle cx="0" cy="0" r={halfL * 0.88} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.6" />
                  <line x1={-halfL * 0.85} y1="0" x2={halfL * 0.85} y2="0" stroke="#71717a" strokeWidth="3" />
                  <line x1="0" y1={-halfL * 0.85} x2="0" y2={halfL * 0.85} stroke="#71717a" strokeWidth="3" />
                  <circle cx="0" cy="0" r="7" fill="#09090b" stroke="#e4e4e7" strokeWidth="2" />
                  {/* Chin gun 30mm chain gun */}
                  <line x1={halfL * 0.75} y1="0" x2={halfL * 1.08} y2="0" stroke="#a1a1aa" strokeWidth="3.5" />
                </g>
              )}
              {/* A-10 Avenger 30mm rotary cannon */}
              {model.spriteStyle.bodyStyle === 'attacker-warthog' && (
                <g>
                  <line x1={halfL * 0.75} y1={-halfW * 0.05} x2={halfL * 1.14} y2={-halfW * 0.05} stroke="#a1a1aa" strokeWidth="4.5" />
                  {/* Twin high-mounted TF34 engine nacelles */}
                  <rect x={-halfL * 0.65} y={-halfW * 0.42} width={halfL * 0.35} height={halfW * 0.28} rx="3" fill="#18181b" stroke="#71717a" strokeWidth="1.5" />
                  <rect x={-halfL * 0.65} y={halfW * 0.14} width={halfL * 0.35} height={halfW * 0.28} rx="3" fill="#18181b" stroke="#71717a" strokeWidth="1.5" />
                </g>
              )}
              {/* B-2 Spirit internal weapon bay doors */}
              {model.spriteStyle.bodyStyle === 'bomber-spirit' && (
                <g>
                  <rect x={-halfL * 0.1} y={-halfW * 0.24} width={halfL * 0.35} height={halfW * 0.2} rx="2" fill="#09090b" stroke="#52525b" strokeWidth="1.5" strokeDasharray="3 3" />
                  <rect x={-halfL * 0.1} y={halfW * 0.04} width={halfL * 0.35} height={halfW * 0.2} rx="2" fill="#09090b" stroke="#52525b" strokeWidth="1.5" strokeDasharray="3 3" />
                </g>
              )}
              {/* AC-130 Ghostrider 4 turboprop engines & port artillery */}
              {model.spriteStyle.bodyStyle === 'gunship-spectre' && (
                <g>
                  {/* Port 105mm artillery barrel protruding left */}
                  <line x1={-halfL * 0.1} y1={halfW * 0.25} x2={-halfL * 0.1} y2={halfW * 0.45} stroke="#f59e0b" strokeWidth="3" />
                  {/* 4 Turboprop engine pods on wings */}
                  {[-halfW * 0.72, -halfW * 0.42, halfW * 0.42, halfW * 0.72].map((ey, ei) => (
                    <rect key={`nacelle-${ei}`} x={halfL * 0.05} y={ey - 3} width={halfL * 0.2} height="6" rx="2" fill="#18181b" stroke="#a1a1aa" strokeWidth="1" />
                  ))}
                </g>
              )}
            </>
          )}

          {/* Water vehicle blueprint deck features */}
          {model.domain === 'water' && (
            <>
              {/* Carrier Flight Deck Runway Lines & Island Superstructure */}
              {model.spriteStyle.bodyStyle === 'carrier' && (
                <g>
                  {/* Runway dashed center line */}
                  <line x1={-halfL * 0.9} y1="0" x2={halfL * 0.9} y2="0" stroke="#facc15" strokeWidth="2" strokeDasharray="6 6" />
                  {/* Runway border lines */}
                  <line x1={-halfL * 0.92} y1={-halfW * 0.5} x2={halfL * 0.92} y2={-halfW * 0.5} stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
                  <line x1={-halfL * 0.92} y1={halfW * 0.5} x2={halfL * 0.92} y2={halfW * 0.5} stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
                  {/* Starboard Island Tower */}
                  <rect x={-halfL * 0.15} y={-halfW * 0.92} width={halfL * 0.45} height={halfW * 0.22} rx="2" fill="#09090b" stroke="#e4e4e7" strokeWidth="1.5" />
                </g>
              )}
              {/* Battleship Iowa Teak Deck and Turret Rings */}
              {model.spriteStyle.bodyStyle === 'battleship' && (
                <g>
                  {/* Forward Superfiring Triple 16" Turrets */}
                  <circle cx={halfL * 0.48} cy="0" r={halfW * 0.38} fill="#18181b" stroke="#71717a" strokeWidth="2" />
                  <line x1={halfL * 0.48} y1="0" x2={halfL * 0.88} y2="0" stroke="#d4d4d8" strokeWidth="3.5" />
                  <circle cx={halfL * 0.22} cy="0" r={halfW * 0.38} fill="#18181b" stroke="#71717a" strokeWidth="2" />
                  <line x1={halfL * 0.22} y1="0" x2={halfL * 0.62} y2="0" stroke="#d4d4d8" strokeWidth="3.5" />
                  {/* Aft Triple 16" Turret */}
                  <circle cx={-halfL * 0.45} cy="0" r={halfW * 0.38} fill="#18181b" stroke="#71717a" strokeWidth="2" />
                  <line x1={-halfL * 0.45} y1="0" x2={-halfL * 0.85} y2="0" stroke="#d4d4d8" strokeWidth="3.5" />
                  {/* Heavy Armored Conning Tower */}
                  <rect x={-halfL * 0.08} y={-halfW * 0.25} width={halfL * 0.22} height={halfW * 0.5} rx="3" fill="#27272a" stroke="#a1a1aa" strokeWidth="1.5" />
                </g>
              )}
              {/* Destroyer / Cruiser / Frigate VLS and Helipad */}
              {(model.spriteStyle.bodyStyle === 'destroyer' || model.spriteStyle.bodyStyle === 'cruiser' || model.spriteStyle.bodyStyle === 'frigate') && (
                <g>
                  {/* Stern Helipad landing circle with 'H' */}
                  <circle cx={-halfL * 0.65} cy="0" r={halfW * 0.38} fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
                  <text x={-halfL * 0.65} y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" opacity="0.8">H</text>
                  {/* Fore VLS cells */}
                  <rect x={halfL * 0.32} y={-halfW * 0.28} width={halfL * 0.16} height={halfW * 0.56} rx="2" fill="#09090b" stroke="#38bdf8" strokeWidth="1.2" />
                  {/* Bridge superstructure */}
                  <polygon points={`${halfL * 0.18},${-halfW * 0.45} ${halfL * 0.18},${halfW * 0.45} ${-halfL * 0.12},${halfW * 0.5} ${-halfL * 0.12},${-halfW * 0.5}`} fill="#18181b" stroke="#71717a" strokeWidth="1.5" />
                </g>
              )}
              {/* Submarine Sail and missile hatches */}
              {model.spriteStyle.bodyStyle === 'submarine' && (
                <g>
                  {/* Streamlined Sail / Conning Tower */}
                  <rect x={halfL * 0.05} y={-halfW * 0.2} width={halfL * 0.3} height={halfW * 0.4} rx="4" fill="#09090b" stroke="#94a3b8" strokeWidth="2" />
                  {/* Horizontal dive planes */}
                  <line x1={halfL * 0.2} y1={-halfW * 0.65} x2={halfL * 0.2} y2={halfW * 0.65} stroke="#94a3b8" strokeWidth="3.5" />
                  {/* VLS missile hatch circles */}
                  {[-halfL * 0.08, -halfL * 0.24, -halfL * 0.4].map((hx, hi) => (
                    <circle key={`vls-sub-${hi}`} cx={hx} cy="0" r={halfW * 0.18} fill="#09090b" stroke="#38bdf8" strokeWidth="1" />
                  ))}
                </g>
              )}
            </>
          )}

          {/* Land vehicle specific deck visual features */}
          {model.domain === 'land' && model.spriteStyle.bodyStyle === 'pickup' ? (
            <>
              {/* Cabin windshield */}
              <rect x={halfL * 0.05} y={-halfW * 0.55} width="12" height={halfW * 1.1} rx="2" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
              {/* Cargo Bed Slats */}
              {[-halfL * 0.25, -halfL * 0.45, -halfL * 0.65].map((bx, bi) => (
                <line key={`slat-${bi}`} x1={bx} y1={-halfW * 0.5} x2={bx} y2={halfW * 0.5} stroke="#27272a" strokeWidth="1.5" />
              ))}
            </>
          ) : model.spriteStyle.bodyStyle === 'car' ? (
            <>
              {/* Front windshield */}
              <path d={`M ${halfL * 0.3},${-halfW * 0.55} L ${halfL * 0.1},${-halfW * 0.65} L ${halfL * 0.1},${halfW * 0.65} L ${halfL * 0.3},${halfW * 0.55} Z`} fill="#18181b" />
              {/* Rear windshield */}
              <path d={`M ${-halfL * 0.25},${-halfW * 0.6} L ${-halfL * 0.42},${-halfW * 0.52} L ${-halfL * 0.42},${halfW * 0.52} L ${-halfL * 0.25},${halfW * 0.6} Z`} fill="#18181b" />
            </>
          ) : model.spriteStyle.bodyStyle === 'buggy' ? (
            <>
              {/* Tubular Roll Cage Cross Members */}
              <line x1={halfL * 0.2} y1={-halfW * 0.6} x2={-halfL * 0.4} y2={halfW * 0.6} stroke="#3f3f46" strokeWidth="2" />
              <line x1={halfL * 0.2} y1={halfW * 0.6} x2={-halfL * 0.4} y2={-halfW * 0.6} stroke="#3f3f46" strokeWidth="2" />
              {/* Twin bucket seats */}
              <rect x={-halfL * 0.15} y={-halfW * 0.5} width="14" height="10" rx="2" fill="#27272a" />
              <rect x={-halfL * 0.15} y={halfW * 0.5 - 10} width="14" height="10" rx="2" fill="#27272a" />
            </>
          ) : model.spriteStyle.bodyStyle === 'flatbed' ? (
            <>
              {/* COE Cabin Divider */}
              <line x1={halfL * 0.3} y1={-halfW * 0.75} x2={halfL * 0.3} y2={halfW * 0.75} stroke="#3f3f46" strokeWidth="2" />
              {/* Flatbed timber deck slats */}
              {[-halfL * 0.1, -halfL * 0.35, -halfL * 0.6, -halfL * 0.8].map((lx, li) => (
                <line key={`flatbed-${li}`} x1={lx} y1={-halfW * 0.65} x2={lx} y2={halfW * 0.65} stroke="#27272a" strokeWidth="1.5" />
              ))}
            </>
          ) : (
            // Tank / SPH / APC Turret Ring
            <circle
              cx={model.spriteStyle.bodyStyle === 'sph' ? -halfL * 0.2 : 0}
              cy="0"
              r={halfW * 0.55}
              fill="#18181b"
              stroke="#3f3f46"
              strokeWidth="1.5"
            />
          )}

          {/* Engine louvers at rear */}
          <rect
            x={-halfL * 0.8}
            y={-halfW * 0.35}
            width={halfL * 0.35}
            height={halfW * 0.7}
            fill="#09090b"
            stroke="#27272a"
            strokeWidth="1"
          />

          {/* Hardpoint weapon firing arc indicators if selected */}
          {model.hardpoints.map((hp) => {
            const isSelected = hp.id === selectedHardpointId;
            if (!isSelected) return null;

            const hpX = hp.x * halfL;
            const hpY = hp.y * halfW;

            return (
              <g key={`arc-${hp.id}`} transform={`translate(${hpX}, ${hpY})`}>
                <circle
                  r="34"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
              </g>
            );
          })}
        </g>

        {/* Towed Trailer connected at rear (if equipped) */}
        {trailer && (
          <g transform={`translate(${cx}, ${cy + halfL + 30})`}>
            {/* Tow Drawbar hitch */}
            <line
              x1="0"
              y1={-30}
              x2="0"
              y2="-5"
              stroke="#64748b"
              strokeWidth="4"
            />
            <circle cx="0" cy="-30" r="3.5" fill="#e2e8f0" />
            <circle cx="0" cy="-5" r="3.5" fill="#e2e8f0" />

            {/* Trailer Body */}
            <rect
              x={-trailer.width * 0.7}
              y="-4"
              width={trailer.width * 1.4}
              height={trailer.length * 0.9}
              rx="4"
              fill={trailer.color}
              stroke="#0f172a"
              strokeWidth="2.5"
            />
            {/* Trailer wheels */}
            <rect x={-trailer.width * 0.7 - 5} y={trailer.length * 0.3} width="5" height="14" rx="1" fill="#0f172a" />
            <rect x={trailer.width * 0.7} y={trailer.length * 0.3} width="5" height="14" rx="1" fill="#0f172a" />

            {/* Trailer label */}
            <text
              y={trailer.length * 0.55}
              textAnchor="middle"
              className="text-[9px] font-mono font-bold fill-amber-300 drop-shadow"
            >
              [TOW: {trailer.name.split(' ')[0]}]
            </text>
          </g>
        )}

        {/* Interactive Hardpoints (Rendered in screen space: x=cy-rotated, y=cx-rotated) */}
        {model.hardpoints.map((hp) => {
          const screenX = cx + hp.y * halfW;
          const screenY = (cy - (trailer ? 25 : 0)) - hp.x * halfL;

          const isSelected = hp.id === selectedHardpointId;
          const compId = config.equippedComponents[hp.id];
          const comp = compId ? COMPONENT_MAP.get(compId) : null;

          return (
            <g
              key={hp.id}
              transform={`translate(${screenX}, ${screenY})`}
              className="cursor-pointer group pointer-events-auto"
              onPointerDown={(e) => {
                // Prevent starting canvas pan when pressing on a component indicator
                e.stopPropagation();
                hardpointPressPosRef.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                const dx = Math.abs(e.clientX - hardpointPressPosRef.current.x);
                const dy = Math.abs(e.clientY - hardpointPressPosRef.current.y);
                if (dx < 8 && dy < 8) {
                  onSelectHardpoint(hp.id);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectHardpoint(hp.id);
              }}
            >
              {/* Invisible generous hit target (radius 24px) for reliable clicking */}
              <circle
                r="24"
                fill="transparent"
                className="cursor-pointer"
              />

              {/* Pulsing ring on selection */}
              {isSelected && (
                <circle
                  r="24"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  className="animate-ping opacity-75"
                />
              )}

              {/* Hardpoint background badge */}
              <circle
                r="18"
                fill={isSelected ? '#b45309' : comp ? '#27272a' : '#3f3f46'}
                stroke={isSelected ? '#fbbf24' : comp ? comp.color : '#71717a'}
                strokeWidth={isSelected ? 3 : 2}
                className="transition-all duration-200 group-hover:scale-115"
              />

              {/* Component color pip */}
              {comp && (
                <circle
                  r="5"
                  fill={comp.color}
                  className="opacity-90"
                />
              )}

              {/* Label text */}
              <text
                y="28"
                textAnchor="middle"
                className="text-[10px] font-sans font-medium fill-zinc-300 pointer-events-none drop-shadow"
              >
                {hp.name}
              </text>
            </g>
          );
        })}
        </g>
      </svg>

      {/* Selected Hardpoint bottom summary bar */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between bg-zinc-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-zinc-700/80">
        {selectedHardpointId ? (
          (() => {
            const hp = model.hardpoints.find(h => h.id === selectedHardpointId);
            const compId = hp ? config.equippedComponents[hp.id] : null;
            const comp = compId ? COMPONENT_MAP.get(compId) : null;
            return (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-amber-400">
                    {renderIcon(comp?.iconName)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                      <span>{hp?.name}</span>
                      <span className="text-[10px] text-amber-400 font-mono px-1.5 py-0.5 bg-amber-950/70 rounded border border-amber-800/40">
                        {hp ? getArcLabel(hp.allowedArc) : ''}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Mounted: <strong className="text-amber-400">{comp ? comp.name : 'Empty Slot'}</strong>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-amber-400 font-medium">
                  Select module below ↓
                </div>
              </div>
            );
          })()
        ) : (
          <div className="text-xs text-zinc-400 flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Drag canvas to pan • Scroll or buttons to zoom</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              Select slot to equip modules
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

function getHullSvgPath(
  modelId: string,
  length: number,
  width: number,
  bodyStyle?: string,
  domain?: 'land' | 'water' | 'air'
): string {
  const halfL = length * 0.5;
  const halfW = width * 0.5;

  // =========================================================================
  // 1. AIRCRAFT HULLS (Distinct shapes from small fighters to giant bombers)
  // =========================================================================
  if (domain === 'air' || modelId.startsWith('air')) {
    if (bodyStyle === 'chopper-apache' || bodyStyle === 'chopper') {
      // Apache attack helicopter: Tandem stepped fuselage, stub wings, narrow tail boom
      return `
        M ${halfL * 0.85},0
        L ${halfL * 0.65},${-halfW * 0.35}
        L ${halfL * 0.25},${-halfW * 0.45}
        L ${halfL * 0.15},${-halfW * 0.95}
        L ${-halfL * 0.05},${-halfW * 0.95}
        L ${-halfL * 0.1},${-halfW * 0.4}
        L ${-halfL * 0.75},${-halfW * 0.12}
        L ${-halfL * 0.92},${-halfW * 0.45}
        L ${-halfL},0
        L ${-halfL * 0.92},${halfW * 0.45}
        L ${-halfL * 0.75},${halfW * 0.12}
        L ${-halfL * 0.1},${halfW * 0.4}
        L ${-halfL * 0.05},${halfW * 0.95}
        L ${halfL * 0.15},${halfW * 0.95}
        L ${halfL * 0.25},${halfW * 0.45}
        L ${halfL * 0.65},${halfW * 0.35} Z
      `;
    }

    if (bodyStyle === 'fighter-raptor') {
      // F-22 Raptor: Diamond-clipped delta wings, sharp chines, twin tail stabs
      return `
        M ${halfL},0
        L ${halfL * 0.7},${-halfW * 0.22}
        L ${halfL * 0.18},${-halfW}
        L ${-halfL * 0.25},${-halfW}
        L ${-halfL * 0.5},${-halfW * 0.45}
        L ${-halfL * 0.88},${-halfW * 0.55}
        L ${-halfL * 0.98},${-halfW * 0.25}
        L ${-halfL * 0.82},0
        L ${-halfL * 0.98},${halfW * 0.25}
        L ${-halfL * 0.88},${halfW * 0.55}
        L ${-halfL * 0.5},${halfW * 0.45}
        L ${-halfL * 0.25},${halfW}
        L ${halfL * 0.18},${halfW}
        L ${halfL * 0.7},${halfW * 0.22} Z
      `;
    }

    if (bodyStyle === 'fighter-lightning') {
      // F-35 Lightning: Compact muscular cropped stealth fighter, single engine nozzle
      return `
        M ${halfL * 0.95},0
        L ${halfL * 0.65},${-halfW * 0.28}
        L ${halfL * 0.12},${-halfW * 0.95}
        L ${-halfL * 0.3},${-halfW * 0.95}
        L ${-halfL * 0.48},${-halfW * 0.4}
        L ${-halfL * 0.85},${-halfW * 0.5}
        L ${-halfL * 0.95},${-halfW * 0.18}
        L ${-halfL},0
        L ${-halfL * 0.95},${halfW * 0.18}
        L ${-halfL * 0.85},${halfW * 0.5}
        L ${-halfL * 0.48},${halfW * 0.4}
        L ${-halfL * 0.3},${halfW * 0.95}
        L ${halfL * 0.12},${halfW * 0.95}
        L ${halfL * 0.65},${halfW * 0.28} Z
      `;
    }

    if (bodyStyle === 'attacker-warthog') {
      // A-10 Warthog: Straight broad unswept wings, twin high rear turbofans, twin H-tail fins
      return `
        M ${halfL},0
        L ${halfL * 0.75},${-halfW * 0.22}
        L ${halfL * 0.2},${-halfW * 0.25}
        L ${halfL * 0.2},${-halfW}
        L ${-halfL * 0.15},${-halfW}
        L ${-halfL * 0.15},${-halfW * 0.3}
        L ${-halfL * 0.7},${-halfW * 0.3}
        L ${-halfL * 0.88},${-halfW * 0.6}
        L ${-halfL * 0.98},${-halfW * 0.6}
        L ${-halfL * 0.98},${-halfW * 0.15}
        L ${-halfL},0
        L ${-halfL * 0.98},${halfW * 0.15}
        L ${-halfL * 0.98},${halfW * 0.6}
        L ${-halfL * 0.88},${halfW * 0.6}
        L ${-halfL * 0.7},${halfW * 0.3}
        L ${-halfL * 0.15},${halfW * 0.3}
        L ${-halfL * 0.15},${halfW}
        L ${halfL * 0.2},${halfW}
        L ${halfL * 0.2},${halfW * 0.25}
        L ${halfL * 0.75},${halfW * 0.22} Z
      `;
    }

    if (bodyStyle === 'bomber-spirit') {
      // B-2 Spirit: Massive stealth flying wing with double-chevron sawtooth trailing edge
      return `
        M ${halfL},0
        L ${halfL * 0.2},${-halfW}
        L ${-halfL * 0.15},${-halfW}
        L ${-halfL * 0.05},${-halfW * 0.55}
        L ${-halfL * 0.45},${-halfW * 0.55}
        L ${-halfL * 0.35},${-halfW * 0.28}
        L ${-halfL * 0.85},0
        L ${-halfL * 0.35},${halfW * 0.28}
        L ${-halfL * 0.45},${halfW * 0.55}
        L ${-halfL * 0.05},${halfW * 0.55}
        L ${-halfL * 0.15},${halfW}
        L ${halfL * 0.2},${halfW} Z
      `;
    }

    if (bodyStyle === 'gunship-spectre') {
      // AC-130 Ghostrider: Giant high-wing transport airframe with sponsons and engine pods
      return `
        M ${halfL},0
        L ${halfL * 0.75},${-halfW * 0.25}
        L ${halfL * 0.18},${-halfW * 0.25}
        L ${halfL * 0.18},${-halfW}
        L ${-halfL * 0.12},${-halfW}
        L ${-halfL * 0.12},${-halfW * 0.3}
        L ${-halfL * 0.75},${-halfW * 0.22}
        L ${-halfL * 0.95},${-halfW * 0.45}
        L ${-halfL},0
        L ${-halfL * 0.95},${halfW * 0.45}
        L ${-halfL * 0.75},${halfW * 0.22}
        L ${-halfL * 0.12},${halfW * 0.3}
        L ${-halfL * 0.12},${halfW}
        L ${halfL * 0.18},${halfW}
        L ${halfL * 0.18},${halfW * 0.25}
        L ${halfL * 0.75},${halfW * 0.25} Z
      `;
    }

    if (bodyStyle === 'bomber-lancer') {
      // B-1B Lancer: Supersonic blended needle fuselage, variable-sweep wings, twin engine nacelles
      return `
        M ${halfL},0
        L ${halfL * 0.8},${-halfW * 0.15}
        L ${halfL * 0.45},${-halfW * 0.22}
        L ${halfL * 0.1},${-halfW}
        L ${-halfL * 0.25},${-halfW}
        L ${-halfL * 0.35},${-halfW * 0.3}
        L ${-halfL * 0.8},${-halfW * 0.35}
        L ${-halfL * 0.98},${-halfW * 0.18}
        L ${-halfL},0
        L ${-halfL * 0.98},${halfW * 0.18}
        L ${-halfL * 0.8},${halfW * 0.35}
        L ${-halfL * 0.35},${halfW * 0.3}
        L ${-halfL * 0.25},${halfW}
        L ${halfL * 0.1},${halfW}
        L ${halfL * 0.45},${halfW * 0.22}
        L ${halfL * 0.8},${halfW * 0.15} Z
      `;
    }

    if (bodyStyle === 'drone-reaper') {
      // MQ-9 Reaper: Bulbous satcom nose, high aspect ratio glider wings, inverted V-tail
      return `
        M ${halfL},0
        L ${halfL * 0.82},${-halfW * 0.16}
        L ${halfL * 0.12},${-halfW * 0.18}
        L ${halfL * 0.08},${-halfW}
        L ${-halfL * 0.06},${-halfW}
        L ${-halfL * 0.04},${-halfW * 0.18}
        L ${-halfL * 0.75},${-halfW * 0.12}
        L ${-halfL * 0.96},${-halfW * 0.35}
        L ${-halfL},0
        L ${-halfL * 0.96},${halfW * 0.35}
        L ${-halfL * 0.75},${halfW * 0.12}
        L ${-halfL * 0.04},${halfW * 0.18}
        L ${-halfL * 0.06},${halfW}
        L ${halfL * 0.08},${halfW}
        L ${halfL * 0.12},${halfW * 0.18}
        L ${halfL * 0.82},${halfW * 0.16} Z
      `;
    }

    // Default aircraft fallback
    return `
      M ${halfL},0
      L ${halfL * 0.6},${-halfW * 0.25}
      L ${halfL * 0.15},${-halfW}
      L ${-halfL * 0.3},${-halfW}
      L ${-halfL * 0.45},${-halfW * 0.3}
      L ${-halfL * 0.85},${-halfW * 0.45}
      L ${-halfL * 0.95},${-halfW * 0.15}
      L ${-halfL},0
      L ${-halfL * 0.95},${halfW * 0.15}
      L ${-halfL * 0.85},${halfW * 0.45}
      L ${-halfL * 0.45},${halfW * 0.3}
      L ${-halfL * 0.3},${halfW}
      L ${halfL * 0.15},${halfW}
      L ${halfL * 0.6},${halfW * 0.25} Z
    `;
  }

  // =========================================================================
  // 2. NAVAL WARSHIP HULLS (Distinct ships from patrol cutters to carriers)
  // =========================================================================
  if (domain === 'water' || modelId.startsWith('water')) {
    if (bodyStyle === 'cutter') {
      // Fast patrol boat: Razor wedge bow, sharp raked lines, narrow beam
      return `
        M ${halfL},0
        L ${halfL * 0.75},${-halfW * 0.55}
        L ${halfL * 0.2},${-halfW * 0.88}
        L ${-halfL * 0.85},${-halfW * 0.88}
        L ${-halfL * 0.96},${-halfW * 0.7}
        L ${-halfL * 0.96},${halfW * 0.7}
        L ${-halfL * 0.85},${halfW * 0.88}
        L ${halfL * 0.2},${halfW * 0.88}
        L ${halfL * 0.75},${halfW * 0.55} Z
      `;
    }

    if (bodyStyle === 'corvette') {
      // Visby stealth corvette: Angular faceted stealth hull with sloping tumblehome
      return `
        M ${halfL},0
        L ${halfL * 0.7},${-halfW * 0.7}
        L 0,${-halfW * 0.92}
        L ${-halfL * 0.8},${-halfW * 0.92}
        L ${-halfL * 0.96},${-halfW * 0.65}
        L ${-halfL * 0.96},${halfW * 0.65}
        L ${-halfL * 0.8},${halfW * 0.92}
        L 0,${halfW * 0.92}
        L ${halfL * 0.7},${halfW * 0.7} Z
      `;
    }

    if (bodyStyle === 'frigate') {
      // Multi-mission frigate: Flared bow, stepped superstructure deck, wide stern helipad
      return `
        M ${halfL},0
        C ${halfL * 0.8},${-halfW * 0.6} ${halfL * 0.4},${-halfW * 0.88} 0,${-halfW * 0.92}
        L ${-halfL * 0.85},${-halfW * 0.92}
        L ${-halfL * 0.98},${-halfW * 0.72}
        L ${-halfL * 0.98},${halfW * 0.72}
        L ${-halfL * 0.85},${halfW * 0.92}
        L 0,${halfW * 0.92}
        C ${halfL * 0.4},${halfW * 0.88} ${halfL * 0.8},${halfW * 0.6} ${halfL},0 Z
      `;
    }

    if (bodyStyle === 'destroyer') {
      // Arleigh Burke destroyer: Flared razor bow, beam flare at bridge, tapered aft deck
      return `
        M ${halfL},0
        L ${halfL * 0.78},${-halfW * 0.65}
        L ${halfL * 0.35},${-halfW * 0.95}
        L ${-halfL * 0.65},${-halfW * 0.95}
        L ${-halfL * 0.95},${-halfW * 0.72}
        L ${-halfL * 0.98},${-halfW * 0.5}
        L ${-halfL * 0.98},${halfW * 0.5}
        L ${-halfL * 0.95},${halfW * 0.72}
        L ${-halfL * 0.65},${halfW * 0.95}
        L ${halfL * 0.35},${halfW * 0.95}
        L ${halfL * 0.78},${halfW * 0.65} Z
      `;
    }

    if (bodyStyle === 'cruiser') {
      // Ticonderoga guided-missile cruiser: Long slender ocean-going cruiser hull
      return `
        M ${halfL},0
        L ${halfL * 0.82},${-halfW * 0.58}
        L ${halfL * 0.4},${-halfW * 0.88}
        L ${-halfL * 0.82},${-halfW * 0.88}
        L ${-halfL * 0.96},${-halfW * 0.65}
        L ${-halfL * 0.96},${halfW * 0.65}
        L ${-halfL * 0.82},${halfW * 0.88}
        L ${halfL * 0.4},${halfW * 0.88}
        L ${halfL * 0.82},${halfW * 0.58} Z
      `;
    }

    if (bodyStyle === 'battleship') {
      // Iowa dreadnought battleship: Colossal armored dreadnought hull, clipper bow, armored citadel
      return `
        M ${halfL},0
        L ${halfL * 0.85},${-halfW * 0.5}
        L ${halfL * 0.5},${-halfW * 0.85}
        L ${halfL * 0.2},${-halfW * 0.96}
        L ${-halfL * 0.65},${-halfW * 0.96}
        L ${-halfL * 0.88},${-halfW * 0.82}
        L ${-halfL * 0.98},${-halfW * 0.45}
        L ${-halfL * 0.98},${halfW * 0.45}
        L ${-halfL * 0.88},${halfW * 0.82}
        L ${-halfL * 0.65},${halfW * 0.96}
        L ${halfL * 0.2},${halfW * 0.96}
        L ${halfL * 0.5},${halfW * 0.85}
        L ${halfL * 0.85},${halfW * 0.5} Z
      `;
    }

    if (bodyStyle === 'carrier') {
      // Wasp amphibious carrier: Asymmetric massive flat-top flight deck with elevator notches
      return `
        M ${halfL * 0.98},${-halfW * 0.75}
        L ${halfL * 0.98},${halfW * 0.95}
        L ${-halfL * 0.15},${halfW * 0.95}
        L ${-halfL * 0.2},${halfW * 0.78}
        L ${-halfL * 0.5},${halfW * 0.78}
        L ${-halfL * 0.55},${halfW * 0.95}
        L ${-halfL * 0.98},${halfW * 0.95}
        L ${-halfL * 0.98},${-halfW * 0.75}
        L ${-halfL * 0.6},${-halfW * 0.75}
        L ${-halfL * 0.55},${-halfW * 0.95}
        L ${-halfL * 0.2},${-halfW * 0.95}
        L ${-halfL * 0.15},${-halfW * 0.75}
        L ${halfL * 0.65},${-halfW * 0.75}
        L ${halfL * 0.85},${-halfW * 0.4} Z
      `;
    }

    if (bodyStyle === 'submarine') {
      // Seawolf attack submarine: Hydrodynamic cylindrical teardrop hull, rounded sonar dome
      return `
        M ${halfL},0
        C ${halfL * 0.95},${-halfW * 0.55} ${halfL * 0.7},${-halfW * 0.85} ${halfL * 0.3},${-halfW * 0.85}
        L ${-halfL * 0.65},${-halfW * 0.85}
        C ${-halfL * 0.85},${-halfW * 0.85} ${-halfL * 0.95},${-halfW * 0.5} ${-halfL},0
        C ${-halfL * 0.95},${halfW * 0.5} ${-halfL * 0.85},${halfW * 0.85} ${-halfL * 0.65},${halfW * 0.85}
        L ${halfL * 0.3},${halfW * 0.85}
        C ${halfL * 0.7},${halfW * 0.85} ${halfL * 0.95},${halfW * 0.55} ${halfL},0 Z
      `;
    }

    // Default naval warship fallback
    return `
      M ${halfL},0
      C ${halfL * 0.7},${-halfW * 0.75} ${halfL * 0.3},${-halfW * 0.95} 0,${-halfW * 0.95}
      L ${-halfL * 0.75},${-halfW * 0.95}
      L ${-halfL * 0.95},${-halfW * 0.6}
      L ${-halfL * 0.95},${halfW * 0.6}
      L ${-halfL * 0.75},${halfW * 0.95}
      L 0,${halfW * 0.95}
      C ${halfL * 0.3},${halfW * 0.95} ${halfL * 0.7},${halfW * 0.75} ${halfL},0 Z
    `;
  }

  // =========================================================================
  // 3. GROUND VEHICLE HULLS (Tanks, APCs, Buggies, Trucks, MLRS, Howitzers)
  // =========================================================================
  if (bodyStyle === 'pickup') {
    return `
      M ${halfL},0
      L ${halfL * 0.95},${-halfW * 0.65}
      L ${halfL * 0.3},${-halfW * 0.72}
      L ${halfL * 0.25},${-halfW * 0.88}
      L ${-halfL * 0.88},${-halfW * 0.88}
      L ${-halfL * 0.95},${-halfW * 0.7}
      L ${-halfL * 0.95},${halfW * 0.7}
      L ${-halfL * 0.88},${halfW * 0.88}
      L ${halfL * 0.25},${halfW * 0.88}
      L ${halfL * 0.3},${halfW * 0.72}
      L ${halfL * 0.95},${halfW * 0.65} Z
    `;
  }

  if (bodyStyle === 'car') {
    return `
      M ${halfL},0
      C ${halfL * 0.9},${-halfW * 0.7} ${halfL * 0.5},${-halfW * 0.85} ${halfL * 0.2},${-halfW * 0.88}
      C ${-halfL * 0.2},${-halfW * 0.88} ${-halfL * 0.6},${-halfW * 0.82} ${-halfL * 0.9},${-halfW * 0.6}
      L ${-halfL * 0.95},0
      L ${-halfL * 0.9},${halfW * 0.6}
      C ${-halfL * 0.6},${halfW * 0.82} ${-halfL * 0.2},${halfW * 0.88} ${halfL * 0.2},${halfW * 0.88}
      C ${halfL * 0.5},${halfW * 0.85} ${halfL * 0.9},${halfW * 0.7} ${halfL},0 Z
    `;
  }

  if (bodyStyle === 'buggy') {
    return `
      M ${halfL},0
      L ${halfL * 0.85},${-halfW * 0.45}
      L ${halfL * 0.4},${-halfW * 0.65}
      L ${0},${-halfW * 0.75}
      L ${-halfL * 0.5},${-halfW * 0.8}
      L ${-halfL * 0.9},${-halfW * 0.55}
      L ${-halfL * 0.95},0
      L ${-halfL * 0.9},${halfW * 0.55}
      L ${-halfL * 0.5},${halfW * 0.8}
      L ${0},${halfW * 0.75}
      L ${halfL * 0.4},${halfW * 0.65}
      L ${halfL * 0.85},${halfW * 0.45} Z
    `;
  }

  if (bodyStyle === 'flatbed') {
    return `
      M ${halfL},${-halfW * 0.6}
      L ${halfL * 0.95},${-halfW * 0.9}
      L ${halfL * 0.35},${-halfW * 0.9}
      L ${halfL * 0.3},${-halfW * 0.78}
      L ${halfL * 0.15},${-halfW * 0.92}
      L ${-halfL * 0.95},${-halfW * 0.92}
      L ${-halfL * 0.95},${halfW * 0.92}
      L ${halfL * 0.15},${halfW * 0.92}
      L ${halfL * 0.3},${halfW * 0.78}
      L ${halfL * 0.35},${halfW * 0.9}
      L ${halfL * 0.95},${halfW * 0.9}
      L ${halfL},${halfW * 0.6} Z
    `;
  }

  if (bodyStyle === 'halftrack') {
    return `
      M ${halfL},0
      L ${halfL * 0.9},${-halfW * 0.55}
      L ${halfL * 0.35},${-halfW * 0.65}
      L ${halfL * 0.28},${-halfW * 0.85}
      L ${-halfL * 0.92},${-halfW * 0.85}
      L ${-halfL * 0.92},${halfW * 0.85}
      L ${halfL * 0.28},${halfW * 0.85}
      L ${halfL * 0.35},${halfW * 0.65}
      L ${halfL * 0.9},${halfW * 0.55} Z
    `;
  }

  if (bodyStyle === 'apc') {
    return `
      M ${halfL},0
      L ${halfL * 0.88},${-halfW * 0.8}
      L ${-halfL * 0.88},${-halfW * 0.8}
      L ${-halfL * 0.96},${-halfW * 0.6}
      L ${-halfL * 0.96},${halfW * 0.6}
      L ${-halfL * 0.88},${halfW * 0.8}
      L ${halfL * 0.88},${halfW * 0.8} Z
    `;
  }

  if (bodyStyle === 'mlrs') {
    return `
      M ${halfL},0
      L ${halfL * 0.85},${-halfW * 0.82}
      L ${halfL * 0.3},${-halfW * 0.82}
      L ${halfL * 0.22},${-halfW * 0.7}
      L ${-halfL * 0.05},${-halfW * 0.7}
      L ${-halfL * 0.12},${-halfW * 0.88}
      L ${-halfL * 0.92},${-halfW * 0.88}
      L ${-halfL * 0.92},${halfW * 0.88}
      L ${-halfL * 0.12},${halfW * 0.88}
      L ${-halfL * 0.05},${halfW * 0.7}
      L ${halfL * 0.22},${halfW * 0.7}
      L ${halfL * 0.3},${halfW * 0.82}
      L ${halfL * 0.85},${halfW * 0.82} Z
    `;
  }

  if (bodyStyle === 'sph') {
    return `
      M ${halfL},0
      L ${halfL * 0.8},${-halfW * 0.78}
      L ${-halfL * 0.2},${-halfW * 0.78}
      L ${-halfL * 0.25},${-halfW * 0.9}
      L ${-halfL * 0.95},${-halfW * 0.9}
      L ${-halfL * 0.95},${halfW * 0.9}
      L ${-halfL * 0.25},${halfW * 0.9}
      L ${-halfL * 0.2},${halfW * 0.78}
      L ${halfL * 0.8},${halfW * 0.78} Z
    `;
  }

  // Default / 'tank': Main Battle Tank / Heavy Tank faceted Chobham hull
  return `
    M ${halfL},0 
    L ${halfL * 0.78},${-halfW * 0.82} 
    L ${-halfL * 0.85},${-halfW * 0.82} 
    L ${-halfL * 0.92},${-halfW * 0.65} 
    L ${-halfL * 0.92},${halfW * 0.65} 
    L ${-halfL * 0.85},${halfW * 0.82} 
    L ${halfL * 0.78},${halfW * 0.82} Z
  `;
}
