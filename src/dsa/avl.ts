/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../types';

export type RotationType = 'LL' | 'RR' | 'LR' | 'RL';

export interface RotationEvent {
  type: RotationType;
  nodeKey: number;
  pivotKey: number;
  reason: string;
}

export class AVLNode {
  key: number;
  data: Student;
  height: number = 1;
  left: AVLNode | null = null;
  right: AVLNode | null = null;

  constructor(key: number, data: Student) {
    this.key = key;
    this.data = data;
  }

  getBalanceFactor(): number {
    const leftHeight = this.left ? this.left.height : 0;
    const rightHeight = this.right ? this.right.height : 0;
    return leftHeight - rightHeight;
  }
}

export class AVLTree {
  root: AVLNode | null = null;
  private nodeCount = 0;
  rotationHistory: RotationEvent[] = [];

  constructor(students?: Student[]) {
    if (students) {
      students.forEach((s) => this.insert(s));
    }
  }

  private getNodeHeight(node: AVLNode | null): number {
    return node ? node.height : 0;
  }

  private updateHeight(node: AVLNode): void {
    node.height = 1 + Math.max(this.getNodeHeight(node.left), this.getNodeHeight(node.right));
  }

  public getBalance(node: AVLNode | null): number {
    if (!node) return 0;
    return this.getNodeHeight(node.left) - this.getNodeHeight(node.right);
  }

  // Right rotation (LL case: insertion into left subtree of left child)
  private rotateRight(y: AVLNode): AVLNode {
    const x = y.left!;
    const T2 = x.right;

    // Perform rotation
    x.right = y;
    y.left = T2;

    // Update heights
    this.updateHeight(y);
    this.updateHeight(x);

    this.rotationHistory.push({
      type: 'LL',
      nodeKey: y.key,
      pivotKey: x.key,
      reason: `Right rotation around ${y.key}: Left child ${x.key} promoted (LL Imbalance, BF=${this.getBalance(y)})`,
    });

    return x;
  }

  // Left rotation (RR case: insertion into right subtree of right child)
  private rotateLeft(x: AVLNode): AVLNode {
    const y = x.right!;
    const T2 = y.left;

    // Perform rotation
    y.left = x;
    x.right = T2;

    // Update heights
    this.updateHeight(x);
    this.updateHeight(y);

    this.rotationHistory.push({
      type: 'RR',
      nodeKey: x.key,
      pivotKey: y.key,
      reason: `Left rotation around ${x.key}: Right child ${y.key} promoted (RR Imbalance, BF=${this.getBalance(x)})`,
    });

    return y;
  }

  // Left-Right rotation (LR case)
  private rotateLeftRight(node: AVLNode): AVLNode {
    this.rotationHistory.push({
      type: 'LR',
      nodeKey: node.key,
      pivotKey: node.left!.key,
      reason: `LR Imbalance at ${node.key}: 1st step Left Rotate on left child ${node.left!.key}, then Right Rotate on ${node.key}`,
    });
    node.left = this.rotateLeft(node.left!);
    return this.rotateRight(node);
  }

  // Right-Left rotation (RL case)
  private rotateRightLeft(node: AVLNode): AVLNode {
    this.rotationHistory.push({
      type: 'RL',
      nodeKey: node.key,
      pivotKey: node.right!.key,
      reason: `RL Imbalance at ${node.key}: 1st step Right Rotate on right child ${node.right!.key}, then Left Rotate on ${node.key}`,
    });
    node.right = this.rotateRight(node.right!);
    return this.rotateLeft(node);
  }

  insert(student: Student): { inserted: boolean; rotationsTriggered: number } {
    const prevRotCount = this.rotationHistory.length;
    let inserted = false;

    const insertRec = (node: AVLNode | null, key: number): AVLNode => {
      if (!node) {
        inserted = true;
        this.nodeCount++;
        return new AVLNode(key, student);
      }

      if (key < node.key) {
        node.left = insertRec(node.left, key);
      } else if (key > node.key) {
        node.right = insertRec(node.right, key);
      } else {
        // Duplicate key: update student data
        node.data = student;
        return node;
      }

      // Update height of ancestor node
      this.updateHeight(node);

      // Check balance factor
      const balance = this.getBalance(node);

      // 4 Balancing cases:
      // Case 1: Left Left (LL)
      if (balance > 1 && key < node.left!.key) {
        return this.rotateRight(node);
      }

      // Case 2: Right Right (RR)
      if (balance < -1 && key > node.right!.key) {
        return this.rotateLeft(node);
      }

      // Case 3: Left Right (LR)
      if (balance > 1 && key > node.left!.key) {
        return this.rotateLeftRight(node);
      }

      // Case 4: Right Left (RL)
      if (balance < -1 && key < node.right!.key) {
        return this.rotateRightLeft(node);
      }

      return node;
    };

    this.root = insertRec(this.root, student.rollNo);
    return {
      inserted,
      rotationsTriggered: this.rotationHistory.length - prevRotCount,
    };
  }

  search(rollNo: number): {
    found: boolean;
    student: Student | null;
    path: number[];
    comparisons: number;
  } {
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

  delete(rollNo: number): { deleted: boolean; rotationsTriggered: number } {
    const prevRotCount = this.rotationHistory.length;
    let deleted = false;

    const findMin = (node: AVLNode): AVLNode => {
      let current = node;
      while (current.left) current = current.left;
      return current;
    };

    const deleteRec = (node: AVLNode | null, key: number): AVLNode | null => {
      if (!node) return null;

      if (key < node.key) {
        node.left = deleteRec(node.left, key);
      } else if (key > node.key) {
        node.right = deleteRec(node.right, key);
      } else {
        deleted = true;
        this.nodeCount--;

        // Case 1 & 2: 0 or 1 child
        if (!node.left || !node.right) {
          const temp = node.left || node.right;
          if (!temp) {
            return null;
          } else {
            node = temp;
          }
        } else {
          // Case 3: 2 children - in-order successor
          const successor = findMin(node.right);
          node.key = successor.key;
          node.data = successor.data;
          node.right = deleteRec(node.right, successor.key);
        }
      }

      if (!node) return null;

      // Update height
      this.updateHeight(node);

      // Balance
      const balance = this.getBalance(node);

      // LL Case
      if (balance > 1 && this.getBalance(node.left) >= 0) {
        return this.rotateRight(node);
      }

      // LR Case
      if (balance > 1 && this.getBalance(node.left) < 0) {
        return this.rotateLeftRight(node);
      }

      // RR Case
      if (balance < -1 && this.getBalance(node.right) <= 0) {
        return this.rotateLeft(node);
      }

      // RL Case
      if (balance < -1 && this.getBalance(node.right) > 0) {
        return this.rotateRightLeft(node);
      }

      return node;
    };

    this.root = deleteRec(this.root, rollNo);
    return {
      deleted,
      rotationsTriggered: this.rotationHistory.length - prevRotCount,
    };
  }

  getHeight(): number {
    return this.getNodeHeight(this.root);
  }

  getSize(): number {
    return this.nodeCount;
  }

  inOrderTraversal(): Student[] {
    const result: Student[] = [];
    const traverse = (node: AVLNode | null) => {
      if (!node) return;
      traverse(node.left);
      result.push(node.data);
      traverse(node.right);
    };
    traverse(this.root);
    return result;
  }

  // Serialized representation for tree graph rendering
  serialize(): {
    key: number;
    balanceFactor: number;
    height: number;
    name: string;
    branch: string;
    left?: any;
    right?: any;
  } | null {
    const serializeNode = (node: AVLNode | null): any => {
      if (!node) return null;
      return {
        key: node.key,
        balanceFactor: this.getBalance(node),
        height: node.height,
        name: node.data.name,
        branch: node.data.branch,
        left: serializeNode(node.left),
        right: serializeNode(node.right),
      };
    };
    return serializeNode(this.root);
  }
}
