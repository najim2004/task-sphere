interface Node {
  id: string;
}

type Edge = [string, string]; // [from, to]

export function topologicalSort(nodes: Node[], edges: Edge[]): string[] {
  const sorted: string[] = [];
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }

  for (const [from, to] of edges) {
    adjList.get(from)?.push(to);
    inDegree.set(to, (inDegree.get(to) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    for (const neighbor of adjList.get(nodeId) || []) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== nodes.length) {
    // This indicates a cycle
    throw new Error('Cycle detected in dependencies');
  }

  return sorted;
}
