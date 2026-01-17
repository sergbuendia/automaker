#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки аутентификации Claude CLI и тестового вызова SDK
 *
 * Запуск:
 *   node test-claude-auth.js
 *
 * Или с установленными зависимостями:
 *   npm install @anthropic-ai/claude-agent-sdk
 *   node test-claude-auth.js
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Цвета для вывода
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Проверка наличия Claude CLI
async function checkClaudeCli() {
  logSection('1. Проверка установки Claude CLI');

  let cliPath = null;
  let version = null;

  try {
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';
    const result = execSync(`${whichCommand} claude`, { encoding: 'utf8', timeout: 2000 }).trim();
    cliPath = result.split('\n')[0];
    log(`✓ Claude CLI найден: ${cliPath}`, 'green');

    // Получаем версию
    try {
      version = execSync('claude --version', { encoding: 'utf8', timeout: 3000 }).trim();
      log(`✓ Версия: ${version}`, 'green');
    } catch {
      log('⚠ Не удалось получить версию', 'yellow');
    }
  } catch {
    log('✗ Claude CLI не найден в PATH', 'red');
    return { installed: false, path: null, version: null };
  }

  return { installed: true, path: cliPath, version };
}

// Проверка аутентификации через команду whoami
async function checkCliAuth(cliPath) {
  logSection('2. Проверка аутентификации CLI');

  if (!cliPath) {
    log('✗ Путь к CLI не найден', 'red');
    return { authenticated: false, user: null };
  }

  return new Promise((resolve) => {
    // На Windows используем shell: true или полный путь
    const isWindows = process.platform === 'win32';
    const command = isWindows ? cliPath : 'claude';
    const args = isWindows ? ['whoami'] : ['whoami'];

    const spawnOptions = {
      stdio: 'pipe',
      timeout: 5000,
    };

    // На Windows может потребоваться shell
    if (isWindows) {
      spawnOptions.shell = true;
    }

    const child = spawn(command, args, spawnOptions);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const output = (stdout + stderr).trim();
      const isLoggedIn =
        output.toLowerCase().includes('logged in') ||
        output.toLowerCase().includes('you are logged in');
      const isNotAuthenticated =
        output.toLowerCase().includes('not authenticated') ||
        output.toLowerCase().includes('not logged in');

      // Проверяем успешную аутентификацию
      if ((code === 0 || code === null) && isLoggedIn && !isNotAuthenticated) {
        log(`✓ CLI аутентифицирован`, 'green');
        // Извлекаем имя пользователя из вывода
        const userMatch =
          output.match(/logged in as\s+\*?([^*\n]+)/i) || output.match(/user[:\s]+([^\n]+)/i);
        const user = userMatch ? userMatch[1].trim() : output;
        log(`  Пользователь: ${user}`, 'blue');
        resolve({ authenticated: true, user });
      } else if (isNotAuthenticated) {
        log('✗ CLI не аутентифицирован', 'red');
        if (output) {
          log(`  Вывод: ${output}`, 'yellow');
        }
        resolve({ authenticated: false, user: null });
      } else {
        // Неопределенное состояние - проверяем вывод
        if (output && !isNotAuthenticated) {
          log(`✓ CLI аутентифицирован (по выводу)`, 'green');
          log(`  Вывод: ${output}`, 'blue');
          const userMatch = output.match(/logged in as\s+\*?([^*\n]+)/i);
          const user = userMatch ? userMatch[1].trim() : output;
          resolve({ authenticated: true, user });
        } else {
          log('✗ CLI не аутентифицирован', 'red');
          if (output) {
            log(`  Вывод: ${output}`, 'yellow');
          }
          log(`  Код выхода: ${code}`, 'yellow');
          resolve({ authenticated: false, user: null });
        }
      }
    });

    child.on('error', (error) => {
      log(`✗ Ошибка при проверке аутентификации: ${error.message}`, 'red');
      log(`  Попытка использовать альтернативный метод...`, 'yellow');

      // Пробуем через execSync как альтернативу
      try {
        const result = execSync(`"${cliPath}" whoami`, {
          encoding: 'utf8',
          timeout: 5000,
          shell: true,
        }).trim();
        const isLoggedIn = result.toLowerCase().includes('logged in');
        if (result && isLoggedIn && !result.includes('not authenticated')) {
          log(`✓ CLI аутентифицирован (через execSync)`, 'green');
          const userMatch = result.match(/logged in as\s+\*?([^*\n]+)/i);
          const user = userMatch ? userMatch[1].trim() : result;
          log(`  Пользователь: ${user}`, 'blue');
          resolve({ authenticated: true, user });
        } else {
          resolve({ authenticated: false, user: null });
        }
      } catch (e) {
        resolve({ authenticated: false, user: null });
      }
    });
  });
}

// Проверка файлов конфигурации CLI
function checkCliConfigFiles() {
  logSection('3. Проверка файлов конфигурации CLI');

  const homeDir = os.homedir();
  const configPaths = [
    // macOS/Linux
    path.join(homeDir, '.claude', 'credentials.json'),
    path.join(homeDir, '.config', 'claude', 'credentials.json'),
    path.join(homeDir, '.claude', 'settings.json'),
    path.join(homeDir, '.config', 'claude', 'settings.json'),
    // Windows
    path.join(homeDir, 'AppData', 'Local', 'claude', 'credentials.json'),
    path.join(homeDir, 'AppData', 'Roaming', 'claude', 'credentials.json'),
    path.join(homeDir, '.claude', 'credentials.json'),
    path.join(homeDir, '.claude', 'settings.json'),
    // Дополнительные пути для Windows
    path.join(process.env.APPDATA || '', 'claude', 'credentials.json'),
    path.join(process.env.LOCALAPPDATA || '', 'claude', 'credentials.json'),
  ];

  const found = [];
  const checkedPaths = new Set(); // Чтобы избежать дубликатов

  for (const configPath of configPaths) {
    try {
      const normalizedPath = path.normalize(configPath);
      if (checkedPaths.has(normalizedPath)) continue;
      checkedPaths.add(normalizedPath);

      if (fs.existsSync(configPath)) {
        const stats = fs.statSync(configPath);
        found.push({
          path: configPath,
          size: stats.size,
          modified: stats.mtime,
        });
        log(`✓ Найден: ${configPath}`, 'green');

        // Пытаемся прочитать и показать структуру (без секретов)
        try {
          const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          const keys = Object.keys(content);
          log(`  Ключи: ${keys.join(', ')}`, 'blue');

          // Проверяем наличие env переменных в settings.json
          if (content.env && typeof content.env === 'object') {
            log(`  ✓ Найдены переменные окружения в settings.json:`, 'green');
            Object.keys(content.env).forEach((key) => {
              const value = content.env[key];
              if (typeof value === 'string' && value.length > 10) {
                const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
                log(`    - ${key}: ${masked}`, 'blue');
              } else {
                log(`    - ${key}: ${value}`, 'blue');
              }
            });
          }

          // Проверяем наличие OAuth токенов
          if (content.claudeAiOauth?.accessToken) {
            log(`  ✓ OAuth токен найден`, 'green');
          }
          if (content.oauth_token || content.access_token) {
            log(`  ✓ Legacy OAuth токен найден`, 'green');
          }
          if (content.api_key) {
            log(`  ✓ API ключ найден`, 'green');
          }
        } catch (e) {
          log(`  ⚠ Не удалось прочитать JSON: ${e.message}`, 'yellow');
        }
      }
    } catch {
      // Игнорируем ошибки доступа
    }
  }

  // Дополнительно: проверяем всю директорию .claude на наличие других файлов
  const claudeDir = path.join(homeDir, '.claude');
  if (fs.existsSync(claudeDir)) {
    try {
      const files = fs.readdirSync(claudeDir);
      log(`\n  Файлы в ${claudeDir}:`, 'blue');
      files.forEach((file) => {
        const filePath = path.join(claudeDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            log(`    - ${file} (${stats.size} bytes)`, 'blue');
          }
        } catch {}
      });
    } catch (e) {
      // Игнорируем ошибки
    }
  }

  if (found.length === 0) {
    log('✗ Файлы конфигурации не найдены', 'yellow');
    log('\n💡 SDK ищет credentials.json в следующих местах:', 'blue');
    configPaths.slice(0, 4).forEach((p) => {
      log(`  - ${p}`, 'blue');
    });
  } else {
    // Проверяем, есть ли credentials.json (не только settings.json)
    const hasCredentials = found.some((f) => f.path.includes('credentials.json'));
    if (!hasCredentials) {
      log('\n⚠ Найден settings.json, но не найден credentials.json', 'yellow');
      log('  SDK может требовать credentials.json с OAuth токенами для работы', 'yellow');
      log(`  Ожидаемый путь: ${path.join(homeDir, '.claude', 'credentials.json')}`, 'blue');
      log('  💡 Попробуйте выполнить: claude login (может создать credentials.json)', 'blue');
    }
  }

  return found;
}

// Проверка переменных окружения
function checkEnvironmentVariables() {
  logSection('4. Проверка переменных окружения');

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  if (hasApiKey) {
    const key = process.env.ANTHROPIC_API_KEY;
    const masked = key.substring(0, 10) + '...' + key.substring(key.length - 4);
    log(`✓ ANTHROPIC_API_KEY установлен: ${masked}`, 'green');
    log(`  Приоритет: API ключ будет использован вместо CLI`, 'yellow');
    return { hasApiKey: true, method: 'api_key' };
  } else {
    log('✗ ANTHROPIC_API_KEY не установлен', 'yellow');
    log('  SDK будет использовать CLI аутентификацию (если доступна)', 'blue');
    return { hasApiKey: false, method: 'cli' };
  }
}

// Тестовый вызов SDK
async function testSdkCall(cliInfo = null) {
  logSection('5. Тестовый вызов Claude Agent SDK');

  // Проверяем, установлен ли SDK
  let sdk;
  try {
    sdk = require('@anthropic-ai/claude-agent-sdk');
    log('✓ SDK найден', 'green');
  } catch (error) {
    log('✗ SDK не установлен', 'red');
    log('\nДля установки выполните:', 'yellow');
    log('  npm install @anthropic-ai/claude-agent-sdk', 'blue');
    return { success: false, error: 'SDK not installed' };
  }

  const { query } = sdk;

  log('\nВыполняю тестовый запрос...', 'blue');
  log('Промпт: "Ответь одним словом: ok"', 'blue');

  try {
    const startTime = Date.now();

    // Создаем контроллер для отмены (если нужно)
    const abortController = new AbortController();

    // Строим окружение - передаем только необходимые переменные
    let pathEnv = process.env.PATH || '';

    // Если CLI найден, убеждаемся, что его директория в PATH
    if (cliInfo && cliInfo.path) {
      const cliDir = path.dirname(cliInfo.path);
      if (!pathEnv.includes(cliDir)) {
        pathEnv = `${cliDir}${path.delimiter}${pathEnv}`;
        log(`  Добавлен путь CLI в PATH: ${cliDir}`, 'blue');
      }
    }

    const env = {
      PATH: pathEnv,
      HOME: process.env.HOME || process.env.USERPROFILE,
      USER: process.env.USER || process.env.USERNAME,
      TERM: process.env.TERM || 'dumb',
      // Windows-специфичные переменные
      ...(process.platform === 'win32' && {
        APPDATA: process.env.APPDATA,
        LOCALAPPDATA: process.env.LOCALAPPDATA,
        USERPROFILE: process.env.USERPROFILE,
      }),
    };

    // Если ANTHROPIC_API_KEY установлен, используем его
    if (process.env.ANTHROPIC_API_KEY) {
      env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
      log('  Используется: API ключ из переменной окружения', 'yellow');
    } else {
      log('  Используется: CLI аутентификация', 'green');
      log('  (SDK может использовать CLI процесс напрямую или credentials.json)', 'blue');
      if (cliInfo && cliInfo.installed) {
        log(`  CLI путь: ${cliInfo.path}`, 'blue');
      }
    }

    // Читаем settings.json и добавляем переменные из env
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (settings.env && typeof settings.env === 'object') {
          log('  Найдены переменные из settings.json:', 'blue');
          Object.keys(settings.env).forEach((key) => {
            env[key] = settings.env[key];
            const value = settings.env[key];
            if (typeof value === 'string' && value.length > 10) {
              const masked = value.substring(0, 10) + '...' + value.substring(value.length - 4);
              log(`    - ${key}: ${masked} (добавлено в окружение)`, 'green');
            } else {
              log(`    - ${key}: ${value} (добавлено в окружение)`, 'green');
            }
          });
        }
      } catch (e) {
        log(`  ⚠ Не удалось прочитать settings.json: ${e.message}`, 'yellow');
      }
    }

    // Логируем окружение для отладки
    log('\n  Переменные окружения для SDK:', 'blue');
    log(`    PATH: ${env.PATH ? 'установлен' : 'не установлен'}`, 'blue');
    log(`    HOME/USERPROFILE: ${env.HOME || env.USERPROFILE || 'не установлен'}`, 'blue');

    // Показываем кастомные переменные, если они есть
    const customVars = Object.keys(env).filter(
      (k) =>
        ![
          'PATH',
          'HOME',
          'USERPROFILE',
          'USER',
          'USERNAME',
          'TERM',
          'APPDATA',
          'LOCALAPPDATA',
        ].includes(k) && k !== 'ANTHROPIC_API_KEY'
    );
    if (customVars.length > 0) {
      log(`    Кастомные переменные: ${customVars.join(', ')}`, 'blue');
    }

    // Проверяем, может ли SDK найти CLI в PATH
    if (cliInfo && cliInfo.path) {
      const cliInPath = env.PATH && env.PATH.includes(path.dirname(cliInfo.path));
      log(`    CLI в PATH: ${cliInPath ? 'да' : 'нет'}`, cliInPath ? 'green' : 'yellow');
      if (!cliInPath) {
        log(
          `    ⚠ CLI может быть не найден SDK, добавьте в PATH: ${path.dirname(cliInfo.path)}`,
          'yellow'
        );
      }
    }

    // Пробуем запустить CLI напрямую для проверки
    if (cliInfo && cliInfo.path && !process.env.ANTHROPIC_API_KEY) {
      log('\n  Проверка прямого запуска CLI...', 'blue');
      try {
        const testResult = execSync(`"${cliInfo.path}" --version`, {
          encoding: 'utf8',
          timeout: 3000,
          shell: true,
          env: env,
        }).trim();
        log(`  ✓ CLI работает в тестовом окружении: ${testResult}`, 'green');
      } catch (e) {
        log(`  ⚠ CLI не работает в тестовом окружении: ${e.message}`, 'yellow');
      }
    }

    log('\n  Вызываю SDK...', 'blue');
    const stream = query({
      prompt: 'Ответь одним словом: ok',
      options: {
        model: 'claude-sonnet-4-20250514',
        maxTurns: 1,
        allowedTools: [],
        abortController,
        env,
      },
    });

    let response = '';
    let messageCount = 0;
    let errorMessages = [];
    const allMessages = [];

    for await (const msg of stream) {
      messageCount++;
      allMessages.push(msg);

      // Собираем сообщения об ошибках
      if (msg.type === 'error' || msg.error) {
        errorMessages.push(msg.error || msg.message || JSON.stringify(msg));
      }

      if (msg.type === 'user' || msg.type === 'assistant') {
        if (msg.message?.content) {
          const content = Array.isArray(msg.message.content)
            ? msg.message.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
            : msg.message.content;
          response += content;
        }
      }
    }

    // Если были ошибки, но ответ получен
    if (errorMessages.length > 0 && !response) {
      throw new Error(`SDK ошибки: ${errorMessages.join('; ')}`);
    }

    const duration = Date.now() - startTime;

    log(`\n✓ Запрос выполнен успешно!`, 'green');
    log(`  Время выполнения: ${duration}ms`, 'blue');
    log(`  Получено сообщений: ${messageCount}`, 'blue');

    // Детальный вывод ответа
    log(`\n  📝 Ответ от SDK:`, 'cyan');
    log(`  ${'─'.repeat(50)}`, 'cyan');
    if (response.trim()) {
      log(`  ${response.trim()}`, 'green');
    } else {
      log(`  (пустой ответ)`, 'yellow');
    }
    log(`  ${'─'.repeat(50)}`, 'cyan');

    // Показываем типы всех сообщений для отладки
    const messageTypes = allMessages.map((m) => m.type || 'unknown').join(', ');
    log(`\n  Типы сообщений: ${messageTypes}`, 'blue');

    return { success: true, response: response.trim(), duration, allMessages };
  } catch (error) {
    log(`\n✗ Ошибка при вызове SDK:`, 'red');
    log(`  ${error.message}`, 'red');

    // Детальная диагностика
    if (error.stack) {
      log(`\n  Детали ошибки:`, 'yellow');
      const stackLines = error.stack.split('\n').slice(0, 3);
      stackLines.forEach((line) => log(`    ${line}`, 'yellow'));
    }

    if (
      error.message.includes('authentication') ||
      error.message.includes('401') ||
      error.message.includes('403') ||
      error.message.includes('exited with code')
    ) {
      log('\n💡 Возможные решения:', 'yellow');
      log('  1. Проверьте аутентификацию CLI:', 'blue');
      log('     - Запустите: claude whoami', 'blue');
      log('     - Если не работает, выполните: claude login', 'blue');
      log('  2. SDK запускает CLI процесс, но тот завершается с ошибкой', 'blue');
      log('     - Возможно, SDK не может найти CLI в PATH', 'blue');
      log('     - Или CLI требует credentials.json для работы через SDK', 'blue');
      log('  3. Попробуйте создать credentials.json:', 'blue');
      log('     - Запустите: claude login (если еще не сделали)', 'blue');
      log(
        `     - Или проверьте, создался ли файл: ${path.join(os.homedir(), '.claude', 'credentials.json')}`,
        'blue'
      );
      log('  4. Альтернатива - используйте API ключ:', 'blue');
      if (process.platform === 'win32') {
        log('     - PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."', 'blue');
      } else {
        log('     - Bash: export ANTHROPIC_API_KEY="sk-ant-..."', 'blue');
      }
    }

    return { success: false, error: error.message };
  }
}

// Главная функция
async function main() {
  log('\n🔍 Тестирование аутентификации Claude CLI и SDK\n', 'cyan');

  // 1. Проверка CLI
  const cliInfo = await checkClaudeCli();

  // 2. Проверка аутентификации
  let authInfo = { authenticated: false, user: null };
  if (cliInfo.installed) {
    authInfo = await checkCliAuth(cliInfo.path);
  } else {
    logSection('2. Проверка аутентификации CLI');
    log('⚠ Пропущено: CLI не установлен', 'yellow');
  }

  // 3. Проверка файлов конфигурации
  const configFiles = checkCliConfigFiles();

  // 4. Проверка переменных окружения
  const envInfo = checkEnvironmentVariables();

  // 5. Тестовый вызов SDK
  const sdkResult = await testSdkCall(cliInfo);

  // Итоговая сводка
  logSection('📊 Итоговая сводка');

  log(
    `Claude CLI: ${cliInfo.installed ? '✓ Установлен' : '✗ Не установлен'}`,
    cliInfo.installed ? 'green' : 'red'
  );
  if (cliInfo.version) {
    log(`  Версия: ${cliInfo.version}`, 'blue');
  }

  log(
    `Аутентификация CLI: ${authInfo.authenticated ? '✓ Да' : '✗ Нет'}`,
    authInfo.authenticated ? 'green' : 'red'
  );
  if (authInfo.user) {
    log(`  Пользователь: ${authInfo.user}`, 'blue');
  }

  log(
    `Файлы конфигурации: ${configFiles.length > 0 ? `✓ Найдено ${configFiles.length}` : '✗ Не найдено'}`,
    configFiles.length > 0 ? 'green' : 'yellow'
  );

  log(
    `ANTHROPIC_API_KEY: ${envInfo.hasApiKey ? '✓ Установлен' : '✗ Не установлен'}`,
    envInfo.hasApiKey ? 'green' : 'yellow'
  );
  log(`  Метод аутентификации: ${envInfo.method}`, 'blue');

  log(
    `Тестовый вызов SDK: ${sdkResult.success ? '✓ Успешно' : '✗ Ошибка'}`,
    sdkResult.success ? 'green' : 'red'
  );
  if (sdkResult.success) {
    log(`  Ответ: ${sdkResult.response}`, 'green');
    log(`  Время: ${sdkResult.duration}ms`, 'blue');
  } else if (sdkResult.error) {
    log(`  Ошибка: ${sdkResult.error}`, 'red');
  }

  console.log('\n');
}

// Запуск
main().catch((error) => {
  log(`\n✗ Критическая ошибка: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
