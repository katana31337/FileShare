const { DefaultReporter } = require('@jest/reporters');

class RussianReporter extends DefaultReporter {
  constructor(globalConfig, options) {
    super(globalConfig, options);
    this.testSuites = new Map();
  }

  // Цвета для терминала
  colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m',
  };

  onTestResult(test, testResult, aggregatedResults) {
    super.onTestResult(test, testResult, aggregatedResults);
    
    // Группируем результаты по тестовым наборам
    const testPath = testResult.testFilePath;
    const suiteName = this.getShortName(testPath);
    
    this.testSuites.set(testPath, {
      name: suiteName,
      results: testResult.testResults,
      status: testResult.status,
      duration: testResult.perfStats.end - testResult.perfStats.start,
    });
  }

  getShortName(fullPath) {
    // Извлекаем короткое имя из полного пути
    const parts = fullPath.split('/');
    const testFile = parts[parts.length - 1];
    const dir = parts[parts.length - 3] || parts[parts.length - 2];
    return `${dir}/${testFile}`;
  }

  onRunComplete(contexts, results) {
    super.onRunComplete(contexts, results);

    const allTests = [];
    this.testSuites.forEach((suite) => {
      suite.results.forEach(test => {
        allTests.push({
          ...test,
          suiteName: suite.name,
        });
      });
    });

    const passed = allTests.filter(t => t.status === 'passed');
    const failed = allTests.filter(t => t.status === 'failed');
    const skipped = allTests.filter(t => t.status === 'skipped' || t.status === 'pending');

    console.log('\n');
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}`);
    console.log(`${this.colors.cyan}${this.colors.bright}  📊 ИТОГИ ТЕСТИРОВАНИЯ BACKEND${this.colors.reset}`);
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}\n`);

    // Пройденные тесты
    if (passed.length > 0) {
      console.log(`${this.colors.green}${this.colors.bright}✅ ПРОЙДЕННЫЕ ТЕСТЫ (${passed.length}):${this.colors.reset}`);
      console.log(`${this.colors.green}${'─'.repeat(70)}${this.colors.reset}\n`);
      
      // Группируем по тестовым наборам
      const grouped = this.groupBySuite(passed);
      grouped.forEach((tests, suiteName) => {
        console.log(`${this.colors.green}${this.colors.bright}  📁 ${suiteName}${this.colors.reset}`);
        tests.forEach((test, index) => {
          const status = this.getStatusIcon(test.status);
          const duration = test.duration ? ` (${test.duration}ms)` : '';
          console.log(`${this.colors.green}    ${status} ${test.fullName}${this.colors.reset}${this.colors.gray}${duration}${this.colors.reset}`);
        });
        console.log('');
      });
    }

    // Проваленные тесты
    if (failed.length > 0) {
      console.log(`${this.colors.red}${this.colors.bright}❌ ПРОВАЛЕННЫЕ ТЕСТЫ (${failed.length}):${this.colors.reset}`);
      console.log(`${this.colors.red}${'─'.repeat(70)}${this.colors.reset}\n`);
      
      const grouped = this.groupBySuite(failed);
      grouped.forEach((tests, suiteName) => {
        console.log(`${this.colors.red}${this.colors.bright}  📁 ${suiteName}${this.colors.reset}`);
        tests.forEach((test, index) => {
          const status = this.getStatusIcon(test.status);
          const duration = test.duration ? ` (${test.duration}ms)` : '';
          console.log(`${this.colors.red}    ${status} ${test.fullName}${this.colors.reset}${this.colors.gray}${duration}${this.colors.reset}`);
          
          if (test.failureMessages && test.failureMessages.length > 0) {
            console.log(`${this.colors.red}       Ошибка:${this.colors.reset}`);
            test.failureMessages.forEach(msg => {
              const lines = msg.split('\n').slice(0, 5);
              lines.forEach(line => {
                console.log(`${this.colors.red}         ${line}${this.colors.reset}`);
              });
            });
          }
          console.log('');
        });
      });
    }

    // Пропущенные тесты
    if (skipped.length > 0) {
      console.log(`${this.colors.yellow}${this.colors.bright}⏭️  ПРОПУЩЕННЫЕ ТЕСТЫ (${skipped.length}):${this.colors.reset}`);
      console.log(`${this.colors.yellow}${'─'.repeat(70)}${this.colors.reset}\n`);
      
      const grouped = this.groupBySuite(skipped);
      grouped.forEach((tests, suiteName) => {
        console.log(`${this.colors.yellow}${this.colors.bright}  📁 ${suiteName}${this.colors.reset}`);
        tests.forEach((test, index) => {
          const status = this.getStatusIcon(test.status);
          console.log(`${this.colors.yellow}    ${status} ${test.fullName}${this.colors.reset}`);
        });
        console.log('');
      });
    }

    // Статистика
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}`);
    console.log(`${this.colors.bright}📈 СТАТИСТИКА:${this.colors.reset}`);
    console.log(`${this.colors.cyan}${'─'.repeat(70)}${this.colors.reset}\n`);
    
    console.log(`  ${this.colors.green}✓ Пройдено:${this.colors.reset}      ${this.colors.green}${this.colors.bright}${passed.length}${this.colors.reset}`);
    
    if (failed.length > 0) {
      console.log(`  ${this.colors.red}✗ Провалено:${this.colors.reset}     ${this.colors.red}${this.colors.bright}${failed.length}${this.colors.reset}`);
    } else {
      console.log(`  ${this.colors.gray}✗ Провалено:${this.colors.reset}     ${this.colors.gray}0${this.colors.reset}`);
    }
    
    if (skipped.length > 0) {
      console.log(`  ${this.colors.yellow}⏭  Пропущено:${this.colors.reset}     ${this.colors.yellow}${this.colors.bright}${skipped.length}${this.colors.reset}`);
    }
    
    console.log(`  ${this.colors.bright}Σ Всего:${this.colors.reset}         ${this.colors.bright}${allTests.length}${this.colors.reset}`);
    console.log('');

    const totalTime = results.testResults.reduce((sum, test) => sum + test.perfStats.end - test.perfStats.start, 0);
    console.log(`  ${this.colors.cyan}⏱  Время выполнения:${this.colors.reset} ${this.colors.cyan}${this.colors.bright}${(totalTime / 1000).toFixed(2)}s${this.colors.reset}`);
    console.log('');

    // Финальное сообщение
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}`);
    
    if (failed.length === 0) {
      console.log(`\n  ${this.colors.green}${this.colors.bright}🎉 ВСЕ ТЕСТЫ BACKEND УСПЕШНО ПРОЙДЕНЫ! 🎉${this.colors.reset}\n`);
    } else {
      console.log(`\n  ${this.colors.red}${this.colors.bright}⚠️  ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ BACKEND - ПРОВЕРЬТЕ ВЫШЕ${this.colors.reset}\n`);
    }
    
    console.log(`${this.colors.cyan}${'═'.repeat(70)}${this.colors.reset}\n`);

    // Очищаем результаты для следующего запуска
    this.testSuites.clear();
  }

  groupBySuite(tests) {
    const grouped = new Map();
    tests.forEach(test => {
      const suiteName = test.suiteName;
      if (!grouped.has(suiteName)) {
        grouped.set(suiteName, []);
      }
      grouped.get(suiteName).push(test);
    });
    return grouped;
  }

  getStatusIcon(status) {
    switch (status) {
      case 'passed':
        return `${this.colors.green}✓${this.colors.reset}`;
      case 'failed':
        return `${this.colors.red}✗${this.colors.reset}`;
      case 'skipped':
      case 'pending':
        return `${this.colors.yellow}⏭${this.colors.reset}`;
      default:
        return '?';
    }
  }
}

module.exports = RussianReporter;
