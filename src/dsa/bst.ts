/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../types';

export class BSTNode {
  key: number; // student rollNo
  data: Student;
  left: BSTNode | null = null;
  right: BSTNode | null = null;

  constructor(key: number, data: Student) {
    this.key = key;
    this.data = data;
  }
}

export interface BSTSearchResult {
  found: boolean;
  student: Student | null;
  path: number[]; // sequence of roll numbers visited
  comparisons: number;
}

export class BinarySearchTree {
  root: BSTNode | null = null;
  private nodeCount = 0;

  constructor(students?: Student[]) {
    if (students) {
      students.forEach((s) => this.insert(s));
    }
  }

  insert(student: Student): { inserted: boolean; comparisons: number } {
    let comparisons = 0;
    const newNode = new BSTNode(student.rollNo, student);

    if (!this.root) {
      this.root = newNode;
      this.nodeCount++;
      return { inserted: true, comparisons: 1 };
    }

    let current: BSTNode = this.root;
    while (true) {
      comparisons++;
      if (student.rollNo === current.key) {
        // Update existing record
        current.data = student;
        return { inserted: false, comparisons };
      } else if (student.rollNo < current.key) {
        if (!current.left) {
          current.left = newNode;
          this.nodeCount++;
          return { inserted: true, comparisons };
        }
        current = current.left;
      } else {
        if (!current.right) {
          current.right = newNode;
          this.nodeCount++;
          return { inserted: true, comparisons };
        }
        current = current.right;
      }
    }
  }

  search(rollNo: number): BSTSearchResult {
    const path: number[] = [];
    let current = this.root;
    let comparisons = 0;

    while (current) {
      comparisons++;
      path.push(current.key);
      if (rollNo === current.key) {
        return { found: true, student: current.data, path, comparisons };
      } else if (rollNo < current.key) {
        current = current.left;
      } else {
        current = current.right;
      }
    }

    return { found: false, student: null, path, comparisons };
  }

  delete(rollNo: number): { deleted: boolean; steps: string[] } {
    const steps: string[] = [];
    let deleted = false;

    const deleteRec = (node: BSTNode | null, key: number): BSTNode | null => {
      if (!node) {
        steps.push(`Roll ${key} not found during BST search.`);
        return null;
      }

      if (key < node.key) {
        steps.push(`Roll ${key} < node ${node.key}: traversing left.`);
        node.left = deleteRec(node.left, key);
      } else if (key > node.key) {
        steps.push(`Roll ${key} > node ${node.key}: traversing right.`);
        node.right = deleteRec(node.right, key);
      } else {
        deleted = true;
        steps.push(`Found target node ${node.key}.`);

        // Case 1: Leaf node (no children)
        if (!node.left && !node.right) {
          steps.push(`Node ${node.key} is a leaf node; removing it.`);
          this.nodeCount--;
          return null;
        }

        // Case 2: One child
        if (!node.left) {
          const rightChild = node.right!;
          steps.push(`Node ${node.key} has only right child (${rightChild.key}); bypassing.`);
          this.nodeCount--;
          return rightChild;
        }
        if (!node.right) {
          const leftChild = node.left!;
          steps.push(`Node ${node.key} has only left child (${leftChild.key}); bypassing.`);
          this.nodeCount--;
          return leftChild;
        }

        // Case 3: Two children - find in-order successor (min node in right subtree)
        let successor: BSTNode = node.right!;
        while (successor.left) {
          successor = successor.left;
        }
        steps.push(`Node ${node.key} has 2 children. In-order successor is Roll ${successor.key}.`);
        node.key = successor.key;
        node.data = successor.data;
        node.right = deleteRec(node.right, successor.key);
      }
      return node;
    };

    this.root = deleteRec(this.root, rollNo);
    return { deleted, steps };
  }

  inOrderTraversal(): Student[] {
    const result: Student[] = [];
    const traverse = (node: BSTNode | null) => {
      if (!node) return;
      traverse(node.left);
      result.push(node.data);
      traverse(node.right);
    };
    traverse(this.root);
    return result;
  }

  preOrderTraversal(): number[] {
    const result: number[] = [];
    const traverse = (node: BSTNode | null) => {
      if (!node) return;
      result.push(node.key);
      traverse(node.left);
      traverse(node.right);
    };
    traverse(this.root);
    return result;
  }

  postOrderTraversal(): number[] {
    const result: number[] = [];
    const traverse = (node: BSTNode | null) => {
      if (!node) return;
      traverse(node.left);
      traverse(node.right);
      result.push(node.key);
    };
    traverse(this.root);
    return result;
  }

  getHeight(): number {
    const calcHeight = (node: BSTNode | null): number => {
      if (!node) return 0;
      return 1 + Math.max(calcHeight(node.left), calcHeight(node.right));
    };
    return calcHeight(this.root);
  }

  getSize(): number {
    return this.nodeCount;
  }
}
