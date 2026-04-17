const { exec, execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const TIMEOUT_MS = 10000;

// ── Detect Java public class name from source ─────────────────────────────────
function detectJavaClassName(code) {
  // Match: public class ClassName  OR  class ClassName (fallback)
  const publicMatch = code.match(/public\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  if (publicMatch) return publicMatch[1];
  const classMatch = code.match(/\bclass\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  if (classMatch) return classMatch[1];
  return 'Main'; // default fallback
}

// ── Language configs ──────────────────────────────────────────────────────────
const LANGUAGE_CONFIG = {
  javascript: {
    fileName: 'main.js',
    dockerImage: 'node:18-alpine',
    dockerCmd: (file) => `node /code/${path.basename(file)}`,
    nativeCmd: (file) => ({ bin: 'node', args: [file] }),
  },
  typescript: {
    fileName: 'main.ts',
    dockerImage: 'node:18-alpine',
    dockerCmd: (file) => `npx -y ts-node /code/${path.basename(file)}`,
    nativeCmd: (file) => ({ bin: 'npx', args: ['-y', 'ts-node', file] }),
  },
  python: {
    fileName: 'main.py',
    dockerImage: 'python:3.11-alpine',
    dockerCmd: (file) => `python3 /code/${path.basename(file)}`,
    nativeCmd: (file) => {
      const bin = process.platform === 'win32' ? 'python' : 'python3';
      return { bin, args: [file] };
    },
  },
  cpp: {
    fileName: 'main.cpp',
    dockerImage: 'gcc:12',
    dockerCmd: (file) => `g++ -o /tmp/out /code/${path.basename(file)} && /tmp/out`,
    nativeCmd: (file, tmpDir) => ({
      bin: null,
      compile: { bin: 'g++', args: ['-o', path.join(tmpDir, 'out'), file] },
      run: { bin: path.join(tmpDir, 'out'), args: [] },
    }),
  },
  java: {
    // fileName is dynamic — set at runtime based on detected class name
    fileName: 'Main.java',
    dockerImage: 'openjdk:17-alpine',
    dockerCmd: (file, className) =>
      `javac /code/${path.basename(file)} -d /tmp && java -cp /tmp ${className}`,
    nativeCmd: (file, tmpDir, className) => ({
      bin: null,
      compile: { bin: 'javac', args: ['-d', tmpDir, file] },
      run: { bin: 'java', args: ['-cp', tmpDir, className] },
    }),
  },
};

// ── Docker availability (cached after first check) ────────────────────────────
let dockerAvailable = null;

async function checkDocker() {
  if (dockerAvailable !== null) return dockerAvailable;
  return new Promise((resolve) => {
    exec('docker info', { timeout: 3000 }, (err) => {
      dockerAvailable = !err;
      resolve(dockerAvailable);
    });
  });
}

// ── Main entry point ──────────────────────────────────────────────────────────
async function runCode(language, code) {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { output: `Language "${language}" is not supported.`, error: true };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codesync-'));

  // Java: detect class name from code → file MUST match class name
  let javaClassName = 'Main';
  let fileName = config.fileName;
  if (language === 'java') {
    javaClassName = detectJavaClassName(code);
    fileName = `${javaClassName}.java`;
  }

  const srcFile = path.join(tmpDir, fileName);
  await fs.writeFile(srcFile, code, 'utf8');

  try {
    const useDocker = await checkDocker();
    if (useDocker) {
      return await runInDocker(config, srcFile, tmpDir, javaClassName);
    } else {
      return await runNative(config, srcFile, tmpDir, language, javaClassName);
    }
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Docker execution ──────────────────────────────────────────────────────────
async function runInDocker(config, srcFile, tmpDir, javaClassName = 'Main') {
  const mountDir = tmpDir.replace(/\\/g, '/'); // Windows path fix
  const innerCmd = config.dockerCmd(srcFile, javaClassName);

  const cmd = [
    'docker run --rm',
    '--memory=128m',
    '--cpus=0.5',
    '--network=none',
    `--volume "${mountDir}:/code:ro"`,
    '--workdir /code',
    config.dockerImage,
    'sh', '-c', `"${innerCmd.replace(/"/g, '\\"')}"`,
  ].join(' ');

  try {
    const output = await execWithTimeout(cmd, TIMEOUT_MS);
    return { output: output || '(no output)', error: false };
  } catch (err) {
    return { output: err.message, error: true };
  }
}

// ── Native (no-Docker) execution ──────────────────────────────────────────────
async function runNative(config, srcFile, tmpDir, language, javaClassName = 'Main') {
  const native = config.nativeCmd(srcFile, tmpDir, javaClassName);

  try {
    // Compiled languages need a compile step first
    if (native.compile) {
      await execFilePromise(native.compile.bin, native.compile.args);
      const output = await execFilePromise(native.run.bin, native.run.args);
      return { output: output || '(no output)', error: false };
    }

    // Interpreted languages run directly
    const output = await execFilePromise(native.bin, native.args);
    return { output: output || '(no output)', error: false };

  } catch (err) {
    // Friendly messages for common missing runtimes
    const msg = err.message || '';
    if (isNotFound(msg)) {
      return {
        output: getRuntimeInstallHint(language),
        error: true,
      };
    }
    if (msg.includes('ETIMEDOUT') || err.timedOut) {
      return { output: 'Execution timed out (10s limit)', error: true };
    }
    return { output: msg, error: true };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function execWithTimeout(cmd, timeout) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout }, (err, stdout, stderr) => {
      if (err) {
        if (err.killed) return reject(new Error('Execution timed out (10s limit)'));
        return reject(new Error(stderr?.trim() || err.message));
      }
      resolve((stdout + (stderr ? `\nstderr:\n${stderr}` : '')).trim());
    });
  });
}

function execFilePromise(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) {
        if (err.killed) {
          err.timedOut = true;
          return reject(err);
        }
        // Attach stderr to message so callers see compiler errors etc.
        err.message = stderr?.trim() || err.message;
        return reject(err);
      }
      resolve((stdout + (stderr ? `\nstderr:\n${stderr}` : '')).trim());
    });
  });
}

function isNotFound(msg) {
  return (
    msg.includes('not found') ||
    msg.includes('not recognized') ||
    msg.includes('No such file') ||
    msg.includes('ENOENT') ||
    msg.includes('cannot find')
  );
}

function getRuntimeInstallHint(language) {
  const hints = {
    python:
      "Python is not installed or not in PATH.\n\nInstall it from https://python.org and make sure to check\n'Add Python to PATH' during installation.",
    javascript:
      "Node.js is not installed or not in PATH.\n\nInstall it from https://nodejs.org",
    typescript:
      "Node.js / npx is not installed or not in PATH.\n\nInstall Node.js from https://nodejs.org",
    cpp:
      "g++ (GCC) is not installed or not in PATH.\n\nWindows: install via https://winlibs.com or use WSL.\nLinux/Mac: sudo apt install g++ / brew install gcc",
    java:
      "Java (javac/java) is not installed or not in PATH.\n\nInstall JDK 17+ from https://adoptium.net",
  };
  return (
    hints[language] ||
    `Runtime for "${language}" not found. Please install it and ensure it is in your system PATH.`
  );
}

module.exports = { runCode };
