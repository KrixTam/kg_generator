
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphEdge } from '../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface ForceGraphProps {
  data: GraphData;
  width?: number;
  height?: number;
}

const COLORS = d3.scaleOrdinal(d3.schemeCategory10);

const ForceGraph: React.FC<ForceGraphProps> = ({ data, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleZoomIn = () => {
    if(!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call((d3.zoom().on("zoom", (event) => {
       const g = svg.select("g");
       g.attr("transform", event.transform);
    }) as any).scaleBy, 1.2);
  };

  const handleZoomOut = () => {
    if(!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call((d3.zoom().on("zoom", (event) => {
        const g = svg.select("g");
        g.attr("transform", event.transform);
     }) as any).scaleBy, 0.8);
  };
  
  const handleResetZoom = () => {
      if(!svgRef.current) return;
      const svg = d3.select(svgRef.current);
      const zoom = d3.zoom().on("zoom", (event) => {
         svg.select("g").attr("transform", event.transform);
      });
      svg.call(zoom as any).transition().call((zoom as any).transform, d3.zoomIdentity);
  }

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const { width, height } = dimensions;

    // IMPORTANT: Deep copy data to prevent mutation of props by D3
    // React Strict Mode calls effects twice, causing double mutation if we use props directly.
    const nodes = data.nodes.map(d => ({ ...d }));
    const edges = data.edges.map(d => ({ ...d }));

    // Zoom container
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Forces
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphEdge>(edges).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30));

    // Arrow marker
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25) // Offset arrow from node center
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    // Links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(edges)
      .enter().append("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    // Link Labels
    const linkLabel = g.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(edges)
      .enter().append("text")
      .text(d => d.relation)
      .attr("font-size", 10)
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .attr("dy", -5);

    // Nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node Circles
    node.append("circle")
      .attr("r", 15)
      .attr("fill", d => COLORS(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(d);
        event.stopPropagation();
      })
      .on("mouseover", function() {
          d3.select(this).transition().duration(200).attr("r", 20);
      })
      .on("mouseout", function() {
          d3.select(this).transition().duration(200).attr("r", 15);
      });

    // Node Labels
    node.append("text")
      .text(d => d.label)
      .attr("x", 18)
      .attr("y", 5)
      .attr("font-size", 12)
      .attr("fill", "currentColor")
      .attr("class", "text-slate-700 dark:text-slate-200 font-medium pointer-events-none")
      .style("text-shadow", "0 1px 0 #fff, 0 -1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff");

    // Simulation Tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      linkLabel
        .attr("x", d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr("y", d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    svg.on("click", () => setSelectedNode(null));

    return () => {
      simulation.stop();
    };
  }, [data, dimensions]);

  return (
    <div className="relative w-full h-full flex flex-col" ref={containerRef}>
      
      {selectedNode && (
        <div className="absolute top-4 left-4 w-64 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border-l-4 border-indigo-500 z-10 animate-in fade-in slide-in-from-left-4 duration-200">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{selectedNode.label}</h3>
          <span className="inline-block px-2 py-1 mt-2 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
            {selectedNode.type}
          </span>
          <div className="mt-4 text-xs text-slate-500">
             ID: {selectedNode.id}
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 graph-container shadow-inner">
        
        {/* Controls moved inside the graph container */}
        <div className="absolute bottom-4 right-4 flex gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg shadow-md z-10 border border-slate-200 dark:border-slate-700">
          <button onClick={handleZoomIn} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="Zoom In">
            <ZoomIn size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <button onClick={handleZoomOut} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="Zoom Out">
            <ZoomOut size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <button onClick={handleResetZoom} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="Fit to Screen">
              <Maximize size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <svg 
            ref={svgRef} 
            width={dimensions.width} 
            height={dimensions.height}
            className="w-full h-full block"
        />
      </div>
      
      {data.nodes.length > 0 && (
          <div className="text-xs text-slate-400 mt-2 flex justify-between px-2">
            <span>Nodes: {data.nodes.length}</span>
            <span>Edges: {data.edges.length}</span>
          </div>
      )}
    </div>
  );
};

export default ForceGraph;
