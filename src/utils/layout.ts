import dagre from 'dagre';
import type { Node, Edge } from '../types';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants';

/**
 * Automatically organizes nodes into a clean hierarchical tree structure using dagre
 */
export const organizeNodes = (nodes: Node[], edges: Edge[]): Node[] => {
  if (nodes.length === 0) return nodes;
  
  // Filter valid edges (both source and target must exist)
  const validEdges = edges.filter(edge => 
    nodes.find(n => n.id === edge.source) && nodes.find(n => n.id === edge.target)
  );

  if (validEdges.length === 0) {
    // If no edges, arrange nodes in a simple grid
    return arrangeNodesInGrid(nodes);
  }

  // Find connected components
  const connectedNodeIds = new Set<string>();
  validEdges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const connectedNodes = nodes.filter(n => connectedNodeIds.has(n.id));
  const isolatedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));

  // Create a new dagre graph for connected nodes
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ 
    rankdir: 'TB', // Top to Bottom
    nodesep: 60,   // Horizontal spacing between nodes
    ranksep: 100,  // Vertical spacing between ranks
    marginx: 50,
    marginy: 50
  });

  // Add connected nodes to the graph with their dimensions
  connectedNodes.forEach(node => {
    g.setNode(node.id, {
      width: node.width || DEFAULT_NODE_WIDTH,
      height: node.height || DEFAULT_NODE_HEIGHT
    });
  });

  // Add edges to the graph
  validEdges.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(g);

  // Extract the calculated positions for connected nodes
  const organizedConnectedNodes = connectedNodes.map(node => {
    const nodeWithPosition = g.node(node.id);
    if (nodeWithPosition) {
      return {
        ...node,
        // dagre returns center positions, convert to top-left
        x: nodeWithPosition.x - (node.width || DEFAULT_NODE_WIDTH) / 2,
        y: nodeWithPosition.y - (node.height || DEFAULT_NODE_HEIGHT) / 2
      };
    }
    return node;
  });

  // Arrange isolated nodes in a grid below the connected graph
  const connectedMaxY = organizedConnectedNodes.length > 0
    ? Math.max(...organizedConnectedNodes.map(n => n.y + (n.height || DEFAULT_NODE_HEIGHT)))
    : 0;
  
  const isolatedSpacing = 80;
  const isolatedStartY = connectedMaxY + 150; // Add some space between connected and isolated nodes
  
  const isolatedOrganized = isolatedNodes.map((node, index) => {
    const cols = Math.ceil(Math.sqrt(isolatedNodes.length));
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      ...node,
      x: col * ((node.width || DEFAULT_NODE_WIDTH) + isolatedSpacing),
      y: isolatedStartY + row * ((node.height || DEFAULT_NODE_HEIGHT) + isolatedSpacing)
    };
  });

  // Combine organized nodes
  return [...organizedConnectedNodes, ...isolatedOrganized];
};

/**
 * Arranges nodes in a grid when there are no edges
 */
const arrangeNodesInGrid = (nodes: Node[]): Node[] => {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const nodeWidth = DEFAULT_NODE_WIDTH;
  const nodeHeight = DEFAULT_NODE_HEIGHT;
  const spacing = 80;

  return nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      ...node,
      x: col * (nodeWidth + spacing),
      y: row * (nodeHeight + spacing)
    };
  });
};

/**
 * Organizes nodes and centers them in the viewport
 */
export const organizeNodesInViewport = (
  nodes: Node[], 
  edges: Edge[], 
  viewportX: number, 
  viewportY: number,
  canvasWidth: number,
  canvasHeight: number
): Node[] => {
  const organizedNodes = organizeNodes(nodes, edges);
  
  if (organizedNodes.length === 0) return organizedNodes;

  // Calculate bounding box of organized nodes
  const minX = Math.min(...organizedNodes.map(n => n.x));
  const maxX = Math.max(...organizedNodes.map(n => n.x + (n.width || DEFAULT_NODE_WIDTH)));
  const minY = Math.min(...organizedNodes.map(n => n.y));
  const maxY = Math.max(...organizedNodes.map(n => n.y + (n.height || DEFAULT_NODE_HEIGHT)));

  const graphWidth = maxX - minX;
  const graphHeight = maxY - minY;

  // Calculate center position in viewport (world coordinates)
  const viewportCenterX = -viewportX + canvasWidth / 2;
  const viewportCenterY = -viewportY + canvasHeight / 2;

  // Calculate offset to center the graph
  const offsetX = viewportCenterX - (minX + graphWidth / 2);
  const offsetY = viewportCenterY - (minY + graphHeight / 2);

  // Apply offset to all nodes
  return organizedNodes.map(node => ({
    ...node,
    x: node.x + offsetX,
    y: node.y + offsetY
  }));
};

