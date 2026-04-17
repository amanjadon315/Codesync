/**
 * Simplified Operational Transformation Engine
 *
 * Each operation (op) has the shape:
 *   { type: 'insert' | 'delete', position: number, text?: string, length?: number, version: number }
 *
 * The server holds a history of accepted ops per document (file).
 * When a client sends an op at version V, the server transforms it
 * against all ops that arrived since V before applying and broadcasting.
 */

class OTEngine {
  constructor() {
    // Map of fileId -> { content: string, version: number, history: Op[] }
    this.documents = new Map();
  }

  initDocument(fileId, content = '', version = 0) {
    if (!this.documents.has(fileId)) {
      this.documents.set(fileId, { content, version, history: [] });
    }
    return this.documents.get(fileId);
  }

  getDocument(fileId) {
    return this.documents.get(fileId);
  }

  /**
   * Apply an incoming op from a client.
   * Returns the transformed op that should be broadcast to other clients.
   */
  applyOp(fileId, incomingOp) {
    const doc = this.documents.get(fileId);
    if (!doc) return null;

    // Transform against all ops since client's version
    let op = { ...incomingOp };
    const concurrentOps = doc.history.slice(incomingOp.version);

    for (const histOp of concurrentOps) {
      op = this.transform(op, histOp);
    }

    // Apply to document content
    doc.content = this.applyToContent(doc.content, op);
    doc.version += 1;
    op.version = doc.version;
    doc.history.push(op);

    // Trim history to last 200 ops to prevent unbounded growth
    if (doc.history.length > 200) {
      doc.history = doc.history.slice(-200);
    }

    return op;
  }

  /**
   * Transform op1 against op2 (both were based on the same document state).
   * Returns op1 adjusted to apply after op2.
   */
  transform(op1, op2) {
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        return { ...op1, position: op1.position + op2.text.length };
      }
      return op1;
    }

    if (op1.type === 'insert' && op2.type === 'delete') {
      if (op2.position < op1.position) {
        return { ...op1, position: Math.max(op2.position, op1.position - op2.length) };
      }
      return op1;
    }

    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        return { ...op1, position: op1.position + op2.text.length };
      }
      return op1;
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      if (op2.position + op2.length <= op1.position) {
        return { ...op1, position: op1.position - op2.length };
      }
      if (op2.position >= op1.position + op1.length) {
        return op1;
      }
      // Overlapping deletes — shrink op1
      const start = Math.max(op1.position, op2.position);
      const end = Math.min(op1.position + op1.length, op2.position + op2.length);
      return { ...op1, length: op1.length - (end - start) };
    }

    return op1;
  }

  applyToContent(content, op) {
    if (op.type === 'insert') {
      const pos = Math.min(op.position, content.length);
      return content.slice(0, pos) + op.text + content.slice(pos);
    }
    if (op.type === 'delete') {
      const pos = Math.min(op.position, content.length);
      const len = Math.min(op.length, content.length - pos);
      return content.slice(0, pos) + content.slice(pos + len);
    }
    // 'full_replace' — client sends entire content (fallback for paste/format)
    if (op.type === 'full_replace') {
      return op.content;
    }
    return content;
  }

  removeDocument(fileId) {
    this.documents.delete(fileId);
  }
}

// Singleton per process
module.exports = new OTEngine();
