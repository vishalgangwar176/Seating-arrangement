/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class TBTNode {
  key: number;
  data: string;
  left: TBTNode | null = null;
  right: TBTNode | null = null;
  isThreaded: boolean = false; // true if right points to in-order successor

  constructor(key: number, data: string) {
    this.key = key;
    this.data = data;
  }
}

export class ThreadedBinaryTree {
  root: TBTNode | null = null;

  insert(key: number, data: string): void {
    const newNode = new TBTNode(key, data);
    if (!this.root) {
      this.root = newNode;
      return;
    }

    let parent: TBTNode | null = null;
    let curr: TBTNode | null = this.root;

    while (curr) {
      if (key === curr.key) return; // Ignore duplicates
      parent = curr;
      if (key < curr.key) {
        if (curr.left) {
          curr = curr.left;
        } else {
          break;
        }
      } else {
        if (!curr.isThreaded && curr.right) {
          curr = curr.right;
        } else {
          break;
        }
      }
    }

    if (key < parent!.key) {
      newNode.left = null;
      newNode.right = parent; // thread to in-order successor
      newNode.isThreaded = true;
      parent!.left = newNode;
    } else {
      newNode.right = parent!.right; // inherit thread
      newNode.isThreaded = parent!.isThreaded;
      newNode.left = null;
      parent!.isThreaded = false;
      parent!.right = newNode;
    }
  }

  // O(1) auxiliary space traversal without recursion or explicit stack
  inorderTraversalWithTrace(): {
    order: { key: number; data: string; viaThread: boolean }[];
    explanation: string;
  } {
    const order: { key: number; data: string; viaThread: boolean }[] = [];
    if (!this.root) return { order, explanation: 'Tree is empty' };

    // Find leftmost node
    let curr: TBTNode | null = this.root;
    while (curr && curr.left) {
      curr = curr.left;
    }

    while (curr) {
      order.push({
        key: curr.key,
        data: curr.data,
        viaThread: curr.isThreaded,
      });

      if (curr.isThreaded) {
        // Follow thread directly to in-order successor! No stack popping needed.
        curr = curr.right;
      } else {
        // Go to leftmost node in right subtree
        curr = curr.right;
        while (curr && curr.left) {
          curr = curr.left;
        }
      }
    }

    return {
      order,
      explanation:
        'Threaded Binary Tree converts null right pointers into direct links (threads) to the in-order successor. This achieves O(1) auxiliary memory traversal without an execution call-stack or heap allocation.',
    };
  }
}
