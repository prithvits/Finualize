"use client";

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface SankeyNode {
  name: string;
  [key: string]: any;
}

interface SankeyLink {
  source: string | SankeyNode;
  target: string | SankeyNode;
  value: number;
  [key: string]: any;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyDiagramProps {
  data: SankeyData;
  width?: number;
  height?: number;
}

export default function SankeyDiagram({ 
  data, 
  width = 800, 
  height = 600 
}: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
      return;
    }

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Map node names to indices for d3-sankey
    const nodeNameToIndex: Record<string, number> = {};
    data.nodes.forEach((node, i) => {
      nodeNameToIndex[node.name] = i;
    });

    // Convert links to use indices
    const sankeyLinks = data.links.map(link => ({
      ...link,
      source: nodeNameToIndex[typeof link.source === 'string' ? link.source : link.source.name],
      target: nodeNameToIndex[typeof link.target === 'string' ? link.target : link.target.name],
    }));

    // Create the Sankey generator
    const sankeyGenerator = sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [chartWidth - 1, chartHeight - 5]]);

    // Process the data
    const { nodes, links } = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: sankeyLinks
    } as any);

    // Create color map for specific nodes
    const nodeColors: Record<string, string> = {
      'Revenue': '#22c55e', // green-500
      'COGs': '#ef4444', // red-500
      'Operating Expenses': '#f59e42', // orange-400
      'Net Profit': '#3b82f6', // blue-500
    };

    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Add links
    svg.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (d: any) => nodeColors[d.target.name] || '#888')
      .attr("stroke-width", (d: any) => Math.max(1, d.width))
      .attr("fill", "none")
      .attr("opacity", 0.5)
      .on("mouseover", function(event, d: any) {
        d3.select(this).attr("opacity", 0.8);
      })
      .on("mouseout", function(event, d: any) {
        d3.select(this).attr("opacity", 0.5);
      });

    // Add nodes
    const node = svg.append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("fill", (d: any) => nodeColors[d.name] || '#888')
      .attr("stroke", "#000")
      .on("mouseover", function(event, d: any) {
        d3.select(this).attr("stroke-width", 2);
      })
      .on("mouseout", function(event, d: any) {
        d3.select(this).attr("stroke-width", 1);
      });

    // Add node labels with values
    svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", (d: any) => d.x0 < chartWidth / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", (d: any) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: any) => d.x0 < chartWidth / 2 ? "start" : "end")
      .text((d: any) => `${d.name}: $${d.value}`)
      .style("font-size", "12px")
      .style("font-weight", "500");

    // Remove value labels on links
    // svg.append("g")
    //   .selectAll("text")
    //   .data(links)
    //   .join("text")
    //   .attr("x", (d: any) => (d.source.x1 + d.target.x0) / 2)
    //   .attr("y", (d: any) => (d.source.y1 + d.target.y0) / 2)
    //   .attr("dy", "0.35em")
    //   .attr("text-anchor", "middle")
    //   .text((d: any) => d.value.toFixed(1))
    //   .style("font-size", "10px")
    //   .style("fill", "#666")
    //   .style("pointer-events", "none");

  }, [data, width, height]);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for Sankey diagram</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded-lg bg-white"
      />
    </div>
  );
} 